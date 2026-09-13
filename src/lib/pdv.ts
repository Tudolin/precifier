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
 * Publica no Redis do PDV todo prato com `plu` OU `codigoBarras`.
 *
 * Sempre publica a lista INTEIRA (nao so o item que acabou de mudar): o
 * catalogo do PDV e pequeno (a casa das massas tem ~150 produtos), entao
 * republicar tudo a cada gravacao e simples e correto -- inclusive porque
 * assim um PLU removido de um prato (ou o prato inteiro excluido) some do
 * catalogo do caixa tambem, sem precisar de um passo de limpeza separado.
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
  const porPeso: { plu: number; doc: DocumentoProduto }[] = [];
  const porUnidade: { codigo: string; doc: DocumentoProduto }[] = [];

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
      porPeso.push({ plu, doc });
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
      porUnidade.push({ codigo, doc });
    }
  }

  try {
    const { createClient } = await import("@vercel/kv");
    // "no-store" pela mesma razao de banco.ts: sem isso, o Next guardaria a
    // leitura de CHAVE_VERSAO em cache e a proxima publicacao poderia achar
    // uma versao velha e recomecar a numeracao do lugar errado.
    const kv = createClient({ ...credenciais, cache: "no-store" });

    // 1) Cada produto na sua propria chave (formato "chave a chave" do PDV).
    const escrita = kv.pipeline();
    for (const item of porPeso) escrita.set(`${PREFIXO_PRODUTO}${item.plu}`, item.doc);
    for (const item of porUnidade) escrita.set(`${PREFIXO_PRODUTO_EAN}${item.codigo}`, item.doc);
    if (porPeso.length + porUnidade.length > 0) await escrita.exec();

    // 2) Limpa chaves de produtos que nao existem mais (excluidos, ou que
    // perderam o PLU/codigo desde a ultima publicacao). Lista pequena (uma
    // casa de massas tem dezenas/poucas centenas de produtos): um `keys()`
    // aqui e simples e rapido, sem precisar do cursor de SCAN que o script
    // Python usa para um Redis de producao generico.
    const [chavesPeso, chavesEan] = await Promise.all([
      kv.keys(`${PREFIXO_PRODUTO}*`),
      kv.keys(`${PREFIXO_PRODUTO_EAN}*`),
    ]);
    const atuais = new Set([
      ...Array.from(plusVistos, (plu) => `${PREFIXO_PRODUTO}${plu}`),
      ...Array.from(codigosVistos, (codigo) => `${PREFIXO_PRODUTO_EAN}${codigo}`),
    ]);
    const sobrando = [...chavesPeso, ...chavesEan].filter((chave) => !atuais.has(chave));
    if (sobrando.length > 0) {
      const limpeza = kv.pipeline();
      for (const chave of sobrando) limpeza.del(chave);
      await limpeza.exec();
    }

    // 3) Snapshot de chave unica: e o formato que o PDV prefere (1
    // requisicao para sincronizar em vez de 1 SCAN + N GETs).
    const novaVersao = ((await kv.get<number>(CHAVE_VERSAO)) || 0) + 1;
    await kv.set(CHAVE_SNAPSHOT, {
      versao: String(novaVersao),
      produtos: porPeso.map((item) => ({ plu: item.plu, ...item.doc })),
      eans: porUnidade.map((item) => ({ codigo: item.codigo, ...item.doc })),
    });
    // A versao vai por ULTIMO de proposito (mesma logica do
    // publicar_catalogo.py): se algo falhar no meio, o PDV nunca ve uma
    // versao nova com catalogo pela metade.
    await kv.set(CHAVE_VERSAO, novaVersao);

    return { pulou: false, publicados: porPeso.length + porUnidade.length, ignorados };
  } catch (erro) {
    return {
      pulou: false,
      publicados: 0,
      ignorados,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}
