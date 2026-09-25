"use server";

/**
 * IMPORTACAO DE PRECOS a partir do arquivo de produtos da balanca
 * (formato em `src/lib/arquivoBalanca.ts`).
 *
 * Para cada produto do arquivo, com preco maior que zero:
 *  1. Prato com o MESMO PLU -> o `precoVenda` do prato vira o do arquivo.
 *  2. Senao, prato ainda sem PLU/codigo de barras com o MESMO NOME (e nome
 *     que nao se repete no arquivo) -> o prato ganha o PLU e o preco.
 *     Nome duvidoso nunca e adivinhado: cobraria o preco errado no caixa.
 *  3. Senao (produto que so existe no caixa) -> o preco vai direto para
 *     `produto:{plu}` no Redis do PDV (`atualizarPrecosDiretoNoPdv`).
 *
 * Preco 0,00 no arquivo e ignorado (a balanca usa isso para item
 * desativado) -- nunca zera o preco de nada.
 *
 * Sempre chamada duas vezes pela tela: primeiro com `aplicar = false`
 * (pre-visualizacao, nada e gravado), depois com `aplicar = true`.
 */

import { gravarPratos, listarCategorias, listarPratos } from "@/lib/banco";
import { lerArquivoBalanca } from "@/lib/arquivoBalanca";
import { normalizarTexto } from "@/lib/formatar";
import {
  atualizarPrecosDiretoNoPdv,
  sincronizarComPdv,
  type MudancaDiretaPdv,
  type PrecoDiretoPdv,
} from "@/lib/pdv";
import { exigirLogin, revalidarTudo } from "@/lib/servico";
import { CATEGORIAS_SUGERIDAS, type Prato } from "@/lib/types";

/** Um arquivo da balanca tem poucos KB; isto so barra colagem errada. */
const TAMANHO_MAXIMO = 500_000;

export interface MudancaPrato {
  plu: number;
  nome: string;
  precoAntes: number;
  precoDepois: number;
  /** O prato nao tinha PLU e foi casado pelo nome agora. */
  vinculadoAgora: boolean;
}

export interface RelatorioImportacao {
  ok: boolean;
  mensagem: string;
  aplicado: boolean;
  lidos: number;
  pratos: MudancaPrato[];
  pratosIguais: number;
  pdv: MudancaDiretaPdv[];
  pdvIguais: number;
  /** Redis nao configurado: a parte do caixa nao foi feita. */
  pdvPulou: boolean;
  semPreco: { plu: number; nome: string }[];
  plusRepetidos: number[];
  avisos: string[];
}

/** Mesma normalizacao de /api/vincular-pdv: sem acento, maiusculo, sem o
 * digito de departamento que a balanca cola no nome ("6COXINHA"). */
function chaveNome(nome: string): string {
  return normalizarTexto(nome).toUpperCase().replace(/^\d+/, "").replace(/\s+/g, " ").trim();
}

function categoriaSugerida(nome: string): string {
  const texto = normalizarTexto(nome).toUpperCase();
  return CATEGORIAS_SUGERIDAS.find((c) => c.palavras.test(texto))?.nome ?? "Outros";
}

function relatorioVazio(mensagem: string): RelatorioImportacao {
  return {
    ok: false,
    mensagem,
    aplicado: false,
    lidos: 0,
    pratos: [],
    pratosIguais: 0,
    pdv: [],
    pdvIguais: 0,
    pdvPulou: false,
    semPreco: [],
    plusRepetidos: [],
    avisos: [],
  };
}

export async function importarPrecosBalanca(
  texto: string,
  aplicar: boolean
): Promise<RelatorioImportacao> {
  if (!(await exigirLogin())) {
    return relatorioVazio("Sua sessão expirou. Entre novamente, por favor.");
  }
  if (typeof texto !== "string" || !texto.trim()) {
    return relatorioVazio("Escolha o arquivo de produtos da balança.");
  }
  if (texto.length > TAMANHO_MAXIMO) {
    return relatorioVazio("Esse arquivo é grande demais para ser a lista de produtos da balança.");
  }

  const { itens, plusRepetidos } = lerArquivoBalanca(texto);
  if (itens.length === 0) {
    return relatorioVazio(
      "Não reconheci nenhum produto nesse arquivo. Confira se é a lista exportada da balança " +
        '(linhas como "1 0CANELONE CARNE   72,90   4D").'
    );
  }

  const [pratos, categorias] = await Promise.all([listarPratos(), listarCategorias()]);

  const pratoPorPlu = new Map<number, Prato>();
  for (const prato of pratos) {
    if (prato.plu !== undefined && prato.plu !== null) pratoPorPlu.set(prato.plu, prato);
  }

  // Candidatos a vinculo por nome: so pratos sem PLU e sem codigo de barras.
  const semVinculoPorNome = new Map<string, Prato[]>();
  for (const prato of pratos) {
    if ((prato.plu !== undefined && prato.plu !== null) || prato.codigoBarras) continue;
    const chave = chaveNome(prato.nome);
    semVinculoPorNome.set(chave, [...(semVinculoPorNome.get(chave) ?? []), prato]);
  }
  const vezesNoArquivo = new Map<string, number>();
  for (const item of itens) {
    const chave = chaveNome(item.nome);
    vezesNoArquivo.set(chave, (vezesNoArquivo.get(chave) ?? 0) + 1);
  }

  const mudancasPratos: MudancaPrato[] = [];
  const novosDadosPorId = new Map<string, { precoVenda: number; plu: number }>();
  const paraPdv: PrecoDiretoPdv[] = [];
  const semPreco: { plu: number; nome: string }[] = [];
  const avisos: string[] = [];
  const nomesAvisados = new Set<string>();
  let pratosIguais = 0;

  for (const item of itens) {
    if (!(item.preco > 0)) {
      semPreco.push({ plu: item.plu, nome: item.nome });
      continue;
    }

    let prato = pratoPorPlu.get(item.plu);
    let vinculadoAgora = false;

    if (!prato) {
      const chave = chaveNome(item.nome);
      const candidatos = semVinculoPorNome.get(chave) ?? [];
      if (candidatos.length === 1 && vezesNoArquivo.get(chave) === 1) {
        prato = candidatos[0];
        vinculadoAgora = true;
        semVinculoPorNome.delete(chave);
      } else if (candidatos.length > 0 && !nomesAvisados.has(chave)) {
        nomesAvisados.add(chave);
        const plus = itens.filter((i) => chaveNome(i.nome) === chave).map((i) => i.plu);
        avisos.push(
          `"${item.nome}" aparece mais de uma vez no arquivo (PLU ${plus.join(" e ")}), então o ` +
            "prato não foi vinculado sozinho — edite o prato e preencha o PLU certo."
        );
      }
    }

    if (!prato) {
      paraPdv.push({
        plu: item.plu,
        nome: item.nome,
        preco: item.preco,
        categoria: categoriaSugerida(item.nome),
      });
      continue;
    }

    if (!vinculadoAgora && Math.abs(prato.precoVenda - item.preco) < 0.005) {
      pratosIguais++;
      continue;
    }

    mudancasPratos.push({
      plu: item.plu,
      nome: prato.nome,
      precoAntes: prato.precoVenda,
      precoDepois: item.preco,
      vinculadoAgora,
    });
    novosDadosPorId.set(prato.id, { precoVenda: item.preco, plu: item.plu });
  }

  let houveGravacao = false;
  if (aplicar && novosDadosPorId.size > 0) {
    const agora = new Date().toISOString();
    const novaLista = pratos.map((p) => {
      const novo = novosDadosPorId.get(p.id);
      return novo ? { ...p, ...novo, atualizadoEm: agora } : p;
    });
    await gravarPratos(novaLista);
    houveGravacao = true;

    const sincronizacao = await sincronizarComPdv(novaLista, categorias);
    if (sincronizacao.erro) {
      avisos.push(`Os pratos foram salvos, mas não deu para avisar o caixa: ${sincronizacao.erro}`);
    }
    for (const ignorado of sincronizacao.ignorados) {
      avisos.push(`"${ignorado.nome}" não foi para o caixa: ${ignorado.motivo}.`);
    }
  }

  const direto = await atualizarPrecosDiretoNoPdv(paraPdv, aplicar);
  if (direto.erro) {
    avisos.push(`Não deu para atualizar o catálogo do caixa: ${direto.erro}`);
  }
  if (aplicar && direto.mudancas.length > 0 && !direto.erro) houveGravacao = true;

  if (houveGravacao) revalidarTudo();

  const total = mudancasPratos.length + direto.mudancas.length;
  let mensagem: string;
  if (!aplicar) {
    mensagem =
      total === 0
        ? "Todos os preços do arquivo já estão iguais aos do sistema."
        : `${total} ${total === 1 ? "preço vai mudar" : "preços vão mudar"}. Confira e confirme.`;
  } else {
    mensagem =
      total === 0
        ? "Nada para atualizar: os preços já estavam iguais."
        : `${total} ${total === 1 ? "preço atualizado" : "preços atualizados"}!`;
  }

  return {
    // Falha parcial (ex.: Redis do caixa fora do ar) vai em `avisos`: o que
    // deu certo ja foi gravado e a tela precisa mostrar isso, nao um erro.
    ok: true,
    mensagem,
    aplicado: aplicar,
    lidos: itens.length,
    pratos: mudancasPratos,
    pratosIguais,
    pdv: direto.mudancas,
    pdvIguais: direto.iguais,
    pdvPulou: direto.pulou,
    semPreco,
    plusRepetidos,
    avisos,
  };
}
