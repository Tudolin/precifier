import { NextResponse } from "next/server";

import { gravarPratos, listarCategorias, listarPratos } from "@/lib/banco";
import { normalizarTexto } from "@/lib/formatar";
import { sincronizarComPdv } from "@/lib/pdv";
import { exigirLogin } from "@/lib/servico";

// JSON estatico: o Next empacota junto no build, entao funciona igual na
// Vercel (sem depender de ler arquivo do disco em runtime, que la e
// somente leitura e pode nem existir fora do bundle).
import produtosPdv from "../../../../scripts/produtos-export.json";

export const dynamic = "force-dynamic";

/**
 * ---------------------------------------------------------------------
 * VINCULA PRATOS AO PDV (PLU / codigo de barras) -- uso pontual
 * ---------------------------------------------------------------------
 * Casa cada Prato que AINDA NAO tem `plu`/`codigoBarras` com o produto de
 * MESMO NOME em `scripts/produtos-export.json` (export do pdv_database.db,
 * a mesma balanca/catalogo que o PDV usa) e preenche o campo que faltar.
 *
 * NUNCA sobrescreve um prato que ja tem plu/codigoBarras (respeita o que o
 * dono preencheu a mao) e NUNCA adivinha quando o nome nao bate direitinho
 * (depois de normalizado) -- errar aqui cobraria o preco errado no caixa,
 * entao a correspondencia duvidosa fica de fora e aparece no relatorio
 * para decisao manual.
 *
 * Uso (peça login antes, é a mesma sessão do painel):
 *   GET /api/vincular-pdv?simular=1   -> so mostra o que seria feito
 *   GET /api/vincular-pdv             -> aplica de verdade
 */

interface ProdutoExportado {
  nome: string;
  preco: number;
  codigo_barras: string;
}

interface ProdutoPdvNormalizado {
  nomeOriginal: string;
  preco: number;
  plu?: number;
  codigoBarras?: string;
}

/** Mesma regra do PDV (`e_codigo_de_balanca` em pdv/importador.py): 7
 * dígitos começando em "2" é PLU da balança; qualquer outro código é EAN
 * de prateleira. */
function ehCodigoDeBalanca(codigo: string): boolean {
  return /^2\d{6}$/.test(codigo);
}

/** Normaliza para comparar nomes com segurança: sem acento, maiúsculo, sem
 * o prefixo numérico que a balança usa em salgados ("6COXINHA" -> "COXINHA"),
 * espaços colapsados. */
function normalizarNomeProduto(nome: string): string {
  return normalizarTexto(nome)
    .toUpperCase()
    .replace(/^\d+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function montarCatalogoPdv(): Map<string, ProdutoPdvNormalizado> {
  const porNome = new Map<string, ProdutoPdvNormalizado>();

  for (const item of produtosPdv as ProdutoExportado[]) {
    const codigo = String(item.codigo_barras || "").trim();
    const nomeOriginal = String(item.nome || "").trim();
    const preco = Number(item.preco) || 0;

    // Mesmos filtros de pdv/importador.py::ler_sqlite_balanca: etiqueta
    // generica e produto sem preco nao sao produto de verdade.
    if (!codigo || !nomeOriginal || codigo === "2000000" || preco <= 0) continue;

    const chave = normalizarNomeProduto(nomeOriginal);
    const existente = porNome.get(chave);
    // Nome repetido no PDV (mesma logica de scripts/importar-pdv.mjs e de
    // publicar_catalogo.py): fica o de maior preco.
    if (existente && existente.preco >= preco) continue;

    porNome.set(chave, {
      nomeOriginal,
      preco,
      plu: ehCodigoDeBalanca(codigo) ? Number(codigo.slice(1, 5)) : undefined,
      codigoBarras: ehCodigoDeBalanca(codigo) ? undefined : codigo,
    });
  }

  return porNome;
}

export async function GET(request: Request) {
  if (!(await exigirLogin())) {
    return NextResponse.json({ erro: "Entre no sistema primeiro." }, { status: 401 });
  }

  const simular = new URL(request.url).searchParams.get("simular") !== null;

  const catalogoPdv = montarCatalogoPdv();
  const [pratos, categorias] = await Promise.all([listarPratos(), listarCategorias()]);

  const vinculados: { prato: string; produtoPdv: string; tipo: string; valor: string | number }[] =
    [];
  const jaTinhamVinculo: string[] = [];
  const semCorrespondencia: string[] = [];

  const novaLista = pratos.map((prato) => {
    if (prato.plu !== undefined || prato.codigoBarras) {
      jaTinhamVinculo.push(prato.nome);
      return prato;
    }

    const alvo = catalogoPdv.get(normalizarNomeProduto(prato.nome));
    if (!alvo) {
      semCorrespondencia.push(prato.nome);
      return prato;
    }

    vinculados.push({
      prato: prato.nome,
      produtoPdv: alvo.nomeOriginal,
      tipo: alvo.plu !== undefined ? "plu" : "codigoBarras",
      valor: alvo.plu ?? (alvo.codigoBarras as string),
    });

    return { ...prato, plu: alvo.plu, codigoBarras: alvo.codigoBarras };
  });

  const nomesDosPratos = new Set(Array.from(pratos, (p) => normalizarNomeProduto(p.nome)));
  const produtosDoPdvSemPratoCorrespondente = Array.from(catalogoPdv.values())
    .filter((p) => !nomesDosPratos.has(normalizarNomeProduto(p.nomeOriginal)))
    .map((p) => p.nomeOriginal)
    .sort();

  if (!simular && vinculados.length > 0) {
    await gravarPratos(novaLista);
    await sincronizarComPdv(novaLista, categorias);
  }

  return NextResponse.json(
    {
      modo: simular ? "SIMULACAO — nada foi gravado" : "APLICADO",
      pratosVinculadosAgora: vinculados.length,
      detalheDosVinculados: vinculados,
      pratosQueJaTinhamPluOuCodigo: jaTinhamVinculo.length,
      pratosSemProdutoCorrespondenteNoPdv: semCorrespondencia,
      produtosDoPdvSemPratoCorrespondente,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
