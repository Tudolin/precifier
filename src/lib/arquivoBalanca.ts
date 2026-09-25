/**
 * Leitura do arquivo de produtos exportado pela balanca (ex.: "Produtos.txt").
 *
 * Formato (colunas separadas por espacos, sempre o mesmo):
 *
 *        1 0CANELONE CARNE          72,90    4D
 *       72 6COXINHA PQ.              1,10    3M
 *   └PLU┘ └┘└──── nome ────┘        └preco┘  └validade┘
 *          departamento (0 = massas/pratos, 6 = salgados...)
 *
 * O codigo do comeco da linha e o PLU da balanca -- o mesmo numero que vai
 * em `Prato.plu` e na chave `produto:{plu}` do PDV.
 *
 * A balanca as vezes quebra um registro em duas linhas (ex.: "134 0" numa
 * linha e "FRICASSE DE FRANGO    65,90    4D" na seguinte). Por isso o texto
 * e lido como um todo, e nao linha a linha: o nome pode atravessar a quebra.
 *
 * Sem "use server" e sem dependencias de servidor: roda igual no navegador
 * (pre-visualizacao) e na Server Action (gravacao).
 */

export interface LinhaBalanca {
  plu: number;
  departamento: string;
  /** Nome como veio da balanca, sem o digito do departamento. */
  nome: string;
  preco: number;
  validade: string;
}

export interface LeituraBalanca {
  itens: LinhaBalanca[];
  /** PLUs que apareceram mais de uma vez: vale a ULTIMA ocorrencia. */
  plusRepetidos: number[];
}

// PLU, espaco, 1 digito de departamento, nome (pode continuar na linha de
// baixo UMA vez, desde que ela nao comece com outro PLU -- assim uma linha
// estragada nunca engole o registro seguinte),
// preco no padrao brasileiro ("72,90" / "1.130,00"), validade ("4D", "3M").
const REGISTRO =
  /(?:^|\n)[ \t]*(\d{1,4})[ \t]+(\d)([^\n]*?(?:\n(?![ \t]*\d{1,4}[ \t]+\d)[^\n]*?)?)[ \t]+(\d{1,3}(?:\.\d{3})*,\d{2})[ \t]+(\d+[A-Za-z])[ \t]*(?=\r?\n|$)/g;

export function lerArquivoBalanca(texto: string): LeituraBalanca {
  const porPlu = new Map<number, LinhaBalanca>();
  const repetidos = new Set<number>();

  // \x1a = Ctrl-Z, o "fim de arquivo" do DOS que a balanca grava no final.
  const limpo = texto.replace(/\x1a/g, "").replace(/\r\n?/g, "\n");
  for (const m of Array.from(limpo.matchAll(REGISTRO))) {
    const plu = Number(m[1]);
    const nome = m[3].replace(/\s+/g, " ").trim();
    if (!nome) continue;

    if (porPlu.has(plu)) repetidos.add(plu);
    porPlu.set(plu, {
      plu,
      departamento: m[2],
      nome,
      preco: Number(m[4].replace(/\./g, "").replace(",", ".")),
      validade: m[5].toUpperCase(),
    });
  }

  return {
    itens: Array.from(porPlu.values()).sort((a, b) => a.plu - b.plu),
    plusRepetidos: Array.from(repetidos).sort((a, b) => a - b),
  };
}
