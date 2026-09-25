/**
 * Ponte com o PDV (repositorio `cadasmassas_pdv`).
 *
 * POR QUE ISTO EXISTE
 * ====================
 * O PDV le produtos do MESMO Redis (quando configurado com as mesmas
 * credenciais do precifier), mas em chaves diferentes das que este sistema
 * usa: `produto:{plu}` / `produto_ean:{codigo}` / `catalogo:versao` /
 * `catalogo:snapshot` -- o formato que `pdv/catalogo.py` sabe ler (ver o
 * README do PDV, secao 4, e `scripts/publicar_catalogo.py` la).
 *
 * Antes, a UNICA forma de o PDV ficar com preco novo era rodar aquele
 * script manualmente lendo o pdv_database.db da balanca -- o precifier nao
 * participava disso, e por isso mudar um preco aqui nunca chegava no caixa.
 *
 * Este arquivo fecha essa lacuna: sempre que um prato com `plu` ou
 * `codigoBarras` preenchido e salvo, o preco vai direto para essas mesmas
 * chaves. O bridge do pdv_database.db continua existindo -- ele so deixa de
 * ser a UNICA fonte, e o precifier passa a valer tambem.
 *
 * DOIS PUBLICADORES NO MESMO CATALOGO -- CUIDADO AO MEXER AQUI:
 * `scripts/publicar_catalogo.py` (Python, le pdv_database.db) continua
 * publicando os produtos que NENHUM prato daqui ainda referencia. Esta
 * funcao NUNCA PODE tratar `produto:*`/`produto_ean:*`/`catalogo:snapshot`
 * como propriedade exclusiva dela -- uma versao anterior fazia isso
 * (sobrescrevia o snapshot inteiro so com os pratos daqui, e apagava toda
 * chave que nao estivesse na lista atual) e isso APAGOU o catalogo inteiro
 * publicado pelo script Python na primeira vez que rodou com poucos pratos
 * vinculados. A regra agora e: mesclar com o que ja esta no Redis, e so
 * apagar/sobrescrever entradas que O PROPRIO precifier publicou antes (
 * rastreado em `precifier:pdv_publicados`) -- nunca uma entrada de origem
 * desconhecida.
 *
 * MELHOR ESFORCO, DE PROPOSITO: o cadastro no precifier ja foi gravado antes
 * de chegar aqui. Se o Redis estiver fora do ar, ou sem credenciais (modo
 * local de desenvolvimento), essa funcao so devolve um aviso -- nunca desfaz
 * nem impede o que o dono estava tentando salvar.
 */

import { credenciaisBanco } from "./banco";
import type { Categoria, Prato } from "./types";

const PREFIXO_PRODUTO = "produto:";
const PREFIXO_PRODUTO_EAN = "produto_ean:";
const CHAVE_SNAPSHOT = "catalogo:snapshot";
const CHAVE_VERSAO = "catalogo:versao";
/** O que O PROPRIO precifier publicou da ultima vez -- nunca o catalogo inteiro. */
const CHAVE_PUBLICADOS = "precifier:pdv_publicados";

/** Documento gravado em `produto:{plu}` / `produto_ean:{codigo}`.
 *
 * Usa `precoVenda` (o mesmo nome de campo do `Prato`) em vez de renomear
 * para `preco_kg`/`preco_fixo`: `pdv/catalogo.py` ja aceita os dois nomes
 * de proposito, exatamente para o dia em que o precifier virasse a fonte
 * direta -- ver `_montar_produto_peso`/`_montar_produto_unidade` la.
 */
interface DocumentoProduto {
  nome: string;
  precoVenda: number;
  categoria: string;
  ativo: boolean;
}

interface Publicados {
  plus: number[];
  eans: string[];
}

/** Formato flexivel: aceita tanto o que o precifier grava (precoVenda)
 * quanto o que publicar_catalogo.py grava (preco_kg/preco_fixo), sem
 * precisar entender tudo -- so precisamos preservar o que ja esta la. */
type DocumentoBruto = Record<string, unknown>;

export interface ItemIgnorado {
  nome: string;
  motivo: string;
}

export interface ResultadoSincronizacaoPdv {
  /** O Redis do PDV nao esta configurado (modo local): nada foi tentado. */
  pulou: boolean;
  publicados: number;
  ignorados: ItemIgnorado[];
  /** Preenchido so quando a publicacao falhou de verdade (rede, etc). */
  erro?: string;
}

/**
 * Publica no Redis do PDV todo prato com `plu` OU `codigoBarras`, SEM
 * mexer no que outra fonte (o script Python) publicou la.
 */
export async function sincronizarComPdv(
  pratos: Prato[],
  categorias: Categoria[]
): Promise<ResultadoSincronizacaoPdv> {
  const credenciais = credenciaisBanco();
  if (!credenciais) {
    // Desenvolvimento local sem Redis: nao ha PDV para sincronizar com nada.
    return { pulou: true, publicados: 0, ignorados: [] };
  }

  const nomeDaCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const ignorados: ItemIgnorado[] = [];
  const plusVistos = new Set<number>();
  const codigosVistos = new Set<string>();
  const porPeso = new Map<number, DocumentoProduto>();
  const porUnidade = new Map<string, DocumentoProduto>();

  for (const prato of pratos) {
    const temPlu = prato.plu !== undefined && prato.plu !== null;
    const temCodigo = Boolean(prato.codigoBarras && prato.codigoBarras.trim());
    if (!temPlu && !temCodigo) continue; // so calculo de custo interno, sem produto no caixa

    if (temPlu && temCodigo) {
      ignorados.push({
        nome: prato.nome,
        motivo: "tem PLU e código de barras ao mesmo tempo; escolha só um",
      });
      continue;
    }

    const doc: DocumentoProduto = {
      nome: prato.nome,
      precoVenda: prato.precoVenda,
      categoria: prato.categoriaId ? nomeDaCategoria.get(prato.categoriaId) || "" : "",
      ativo: prato.precoVenda > 0,
    };

    if (temPlu) {
      const plu = prato.plu as number;
      if (!Number.isInteger(plu) || plu < 0 || plu > 9999) {
        ignorados.push({ nome: prato.nome, motivo: `PLU ${plu} fora do intervalo 0-9999` });
        continue;
      }
      if (plusVistos.has(plu)) {
        ignorados.push({ nome: prato.nome, motivo: `PLU ${plu} repetido em outro prato` });
        continue;
      }
      plusVistos.add(plu);
      porPeso.set(plu, doc);
    } else {
      const codigo = (prato.codigoBarras as string).trim();
      if (codigosVistos.has(codigo)) {
        ignorados.push({
          nome: prato.nome,
          motivo: `código de barras ${codigo} repetido em outro prato`,
        });
        continue;
      }
      codigosVistos.add(codigo);
      porUnidade.set(codigo, doc);
    }
  }

  try {
    const { createClient } = await import("@vercel/kv");
    // "no-store" pela mesma razao de banco.ts: sem isso, o Next guardaria a
    // leitura em cache e a proxima publicacao poderia agir sobre dado velho.
    const kv = createClient({ ...credenciais, cache: "no-store" });

    // 1) O que o PROPRIO precifier publicou da ultima vez -- e SO isso que
    // esta funcao tem autoridade para apagar ou substituir por completo.
    const publicadosAntes = (await kv.get<Publicados>(CHAVE_PUBLICADOS)) || {
      plus: [],
      eans: [],
    };

    // Nada vinculado agora e nada vinculado antes: nao ha o que gravar nem
    // limpar. Sai sem tocar em catalogo:versao -- sem isso, salvar um prato
    // que nunca teve plu/codigo faria o PDV inteiro redownloadar o catalogo
    // a toa a cada gravacao.
    if (
      porPeso.size === 0 &&
      porUnidade.size === 0 &&
      publicadosAntes.plus.length === 0 &&
      publicadosAntes.eans.length === 0
    ) {
      return { pulou: false, publicados: 0, ignorados };
    }

    // 2) Grava (upsert) cada produto atual na sua propria chave. Isso NUNCA
    // apaga nada -- so cria/atualiza as chaves dos pratos vinculados agora.
    const escrita = kv.pipeline();
    porPeso.forEach((doc, plu) => escrita.set(`${PREFIXO_PRODUTO}${plu}`, doc));
    porUnidade.forEach((doc, codigo) => escrita.set(`${PREFIXO_PRODUTO_EAN}${codigo}`, doc));
    if (porPeso.size + porUnidade.size > 0) await escrita.exec();

    // 3) SO remove uma chave individual se: (a) o precifier a publicou da
    // ultima vez, E (b) ela nao esta mais na lista atual -- ou seja, o
    // prato correspondente perdeu o plu/codigo ou foi excluido. Uma chave
    // que o precifier nunca publicou (origem: script Python) jamais e
    // tocada aqui, mesmo que nao apareca na lista atual.
    const plusQueSaíram = publicadosAntes.plus.filter((plu) => !porPeso.has(plu));
    const eansQueSaíram = publicadosAntes.eans.filter((codigo) => !porUnidade.has(codigo));
    if (plusQueSaíram.length + eansQueSaíram.length > 0) {
      const limpeza = kv.pipeline();
      for (const plu of plusQueSaíram) limpeza.del(`${PREFIXO_PRODUTO}${plu}`);
      for (const codigo of eansQueSaíram) limpeza.del(`${PREFIXO_PRODUTO_EAN}${codigo}`);
      await limpeza.exec();
    }

    // 4) Snapshot de chave unica: MESCLA com o que ja estava la (produtos
    // publicados pelo script Python, ou por uma sincronizacao anterior
    // deste mesmo precifier) -- nunca sobrescreve com so o subconjunto
    // atual. Comeca do snapshot existente, tira o que saiu (passo 3) e
    // aplica por cima o que o precifier publica agora.
    const snapshotAtual = await kv.get<{
      produtos?: DocumentoBruto[];
      eans?: DocumentoBruto[];
    }>(CHAVE_SNAPSHOT);

    const produtosMesclados = new Map<number, DocumentoBruto>();
    for (const item of snapshotAtual?.produtos ?? []) {
      const plu = Number(item.plu);
      if (Number.isFinite(plu) && !plusQueSaíram.includes(plu)) produtosMesclados.set(plu, item);
    }
    porPeso.forEach((doc, plu) => produtosMesclados.set(plu, { plu, ...doc }));

    const eansMesclados = new Map<string, DocumentoBruto>();
    for (const item of snapshotAtual?.eans ?? []) {
      const codigo = String(item.codigo ?? "");
      if (codigo && !eansQueSaíram.includes(codigo)) eansMesclados.set(codigo, item);
    }
    porUnidade.forEach((doc, codigo) => eansMesclados.set(codigo, { codigo, ...doc }));

    const novaVersao = ((await kv.get<number>(CHAVE_VERSAO)) || 0) + 1;
    await kv.set(CHAVE_SNAPSHOT, {
      versao: String(novaVersao),
      produtos: Array.from(produtosMesclados.values()),
      eans: Array.from(eansMesclados.values()),
    });
    await kv.set(CHAVE_PUBLICADOS, {
      plus: Array.from(porPeso.keys()),
      eans: Array.from(porUnidade.keys()),
    } satisfies Publicados);
    // A versao vai por ULTIMO de proposito (mesma logica do
    // publicar_catalogo.py): se algo falhar no meio, o PDV nunca ve uma
    // versao nova com catalogo pela metade.
    await kv.set(CHAVE_VERSAO, novaVersao);

    return { pulou: false, publicados: porPeso.size + porUnidade.size, ignorados };
  } catch (erro) {
    return {
      pulou: false,
      publicados: 0,
      ignorados,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

// ---------------------------------------------------------------------
// Precos vindos do arquivo da balanca, para PLUs que NENHUM prato usa
// ---------------------------------------------------------------------

export interface PrecoDiretoPdv {
  plu: number;
  nome: string;
  preco: number;
  /** Usada so quando o produto ainda nao existe no catalogo do caixa. */
  categoria: string;
}

export interface MudancaDiretaPdv {
  plu: number;
  nome: string;
  /** Preco que estava no catalogo do caixa; undefined = produto novo la. */
  precoAntes?: number;
  precoDepois: number;
}

export interface ResultadoPrecosDiretosPdv {
  /** Redis nao configurado (modo local): nada foi lido nem gravado. */
  pulou: boolean;
  mudancas: MudancaDiretaPdv[];
  iguais: number;
  erro?: string;
}

/** Campos de preco que ja podem existir no documento: o do precifier
 * (`precoVenda`) e os do publicar_catalogo.py (`preco_kg`/`preco_fixo`). */
const CAMPOS_PRECO = ["precoVenda", "preco_kg", "preco_fixo"] as const;

function precoDoDocumento(doc: DocumentoBruto | null | undefined): number | undefined {
  if (!doc) return undefined;
  for (const campo of CAMPOS_PRECO) {
    const valor = Number(doc[campo]);
    if (doc[campo] !== undefined && Number.isFinite(valor)) return valor;
  }
  return undefined;
}

/** Troca so o preco (em todo campo de preco que o documento ja tiver),
 * preservando o resto -- o documento pode ter sido gravado pelo script
 * Python, com campos que o precifier nao conhece. */
function comPrecoNovo(doc: DocumentoBruto | null | undefined, item: PrecoDiretoPdv): DocumentoBruto {
  if (!doc) {
    return { nome: item.nome, precoVenda: item.preco, categoria: item.categoria, ativo: true };
  }
  const novo: DocumentoBruto = { ...doc };
  let achouCampo = false;
  for (const campo of CAMPOS_PRECO) {
    if (novo[campo] !== undefined) {
      novo[campo] = item.preco;
      achouCampo = true;
    }
  }
  if (!achouCampo) novo.precoVenda = item.preco;
  if ("ativo" in novo) novo.ativo = true;
  return novo;
}

/**
 * Grava o preco direto em `produto:{plu}` (+ snapshot + versao) para
 * produtos da balanca que nao tem prato no precifier.
 *
 * Diferente de `sincronizarComPdv`, aqui a fonte e o arquivo oficial da
 * balanca que o dono escolheu importar, entao atualizar o preco de uma
 * entrada publicada pelo script Python e exatamente o pedido. Mesmo assim:
 *  - so o PRECO muda; nome/categoria/outros campos existentes ficam;
 *  - nada e apagado;
 *  - nada entra em `precifier:pdv_publicados` -- essas chaves continuam
 *    "de origem externa" e `sincronizarComPdv` nunca vai remove-las.
 *
 * Com `aplicar = false` so le o catalogo e devolve o que mudaria.
 */
export async function atualizarPrecosDiretoNoPdv(
  itens: PrecoDiretoPdv[],
  aplicar: boolean
): Promise<ResultadoPrecosDiretosPdv> {
  const credenciais = credenciaisBanco();
  if (!credenciais) return { pulou: true, mudancas: [], iguais: 0 };
  if (itens.length === 0) return { pulou: false, mudancas: [], iguais: 0 };

  try {
    const { createClient } = await import("@vercel/kv");
    const kv = createClient({ ...credenciais, cache: "no-store" });

    const atuais = await kv.mget<(DocumentoBruto | null)[]>(
      ...itens.map((item) => `${PREFIXO_PRODUTO}${item.plu}`)
    );

    const mudancas: MudancaDiretaPdv[] = [];
    const novosDocs = new Map<number, DocumentoBruto>();
    itens.forEach((item, i) => {
      const precoAntes = precoDoDocumento(atuais[i]);
      if (precoAntes !== undefined && Math.abs(precoAntes - item.preco) < 0.005) return;
      mudancas.push({ plu: item.plu, nome: item.nome, precoAntes, precoDepois: item.preco });
      novosDocs.set(item.plu, comPrecoNovo(atuais[i], item));
    });

    const iguais = itens.length - mudancas.length;
    if (!aplicar || mudancas.length === 0) return { pulou: false, mudancas, iguais };

    const escrita = kv.pipeline();
    novosDocs.forEach((doc, plu) => escrita.set(`${PREFIXO_PRODUTO}${plu}`, doc));
    await escrita.exec();

    // Snapshot: mesma regra de sincronizarComPdv -- mescla, nunca substitui.
    const snapshotAtual = await kv.get<{
      produtos?: DocumentoBruto[];
      eans?: DocumentoBruto[];
    }>(CHAVE_SNAPSHOT);
    const produtos = new Map<number, DocumentoBruto>();
    for (const item of snapshotAtual?.produtos ?? []) {
      const plu = Number(item.plu);
      if (Number.isFinite(plu)) produtos.set(plu, item);
    }
    const itemPorPlu = new Map(itens.map((item) => [item.plu, item]));
    novosDocs.forEach((doc, plu) => {
      const noSnapshot = produtos.get(plu);
      produtos.set(
        plu,
        noSnapshot ? comPrecoNovo(noSnapshot, itemPorPlu.get(plu) as PrecoDiretoPdv) : { plu, ...doc }
      );
    });

    const novaVersao = ((await kv.get<number>(CHAVE_VERSAO)) || 0) + 1;
    await kv.set(CHAVE_SNAPSHOT, {
      versao: String(novaVersao),
      produtos: Array.from(produtos.values()),
      eans: snapshotAtual?.eans ?? [],
    });
    // Versao por ultimo: o PDV nunca ve versao nova com catalogo pela metade.
    await kv.set(CHAVE_VERSAO, novaVersao);

    return { pulou: false, mudancas, iguais };
  } catch (erro) {
    return {
      pulou: false,
      mudancas: [],
      iguais: 0,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}
