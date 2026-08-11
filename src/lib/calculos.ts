/**
 * ---------------------------------------------------------------------
 * CORACAO DO SISTEMA: toda a matematica de custo, margem e preco.
 * ---------------------------------------------------------------------
 * Estas funcoes sao PURAS (nao acessam banco nem rede) de proposito:
 * assim o mesmo calculo roda no servidor (ao salvar) e no navegador
 * (para mostrar o resultado em tempo real enquanto o dono digita).
 * Qualquer mudanca de regra de negocio deve ser feita AQUI, num lugar so.
 */

import type { Configuracoes, IngredienteReceita, Insumo, Prato, Unidade } from "./types";

/** Arredonda sempre para CIMA, com 2 casas decimais (dinheiro nao pode faltar). */
export function arredondarParaCima(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.ceil(valor * 100) / 100;
}

/** Arredonda normalmente, com 2 casas decimais. */
export function arredondar(valor: number, casas = 2): number {
  if (!Number.isFinite(valor)) return 0;
  const fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}

/**
 * Custo de UM ingrediente dentro da receita.
 *
 *   custo = (quantidade usada x preco por unidade) / (rendimento / 100)
 *
 * O rendimento encarece o ingrediente: se voce compra 1 kg de trigo por
 * R$ 5,00 mas so aproveita 900 g (rendimento 90%), cada quilo realmente
 * util custa R$ 5,00 / 0,90 = R$ 5,56.
 */
export function custoDoIngrediente(
  quantidade: number,
  precoUnitario: number,
  rendimento: number
): number {
  const qtd = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
  const preco = Number.isFinite(precoUnitario) && precoUnitario > 0 ? precoUnitario : 0;
  // Rendimento invalido (0 ou negativo) e tratado como 100% para nunca dividir por zero.
  const rend = Number.isFinite(rendimento) && rendimento > 0 ? rendimento : 100;
  return (qtd * preco) / (rend / 100);
}

/**
 * Custo total dos insumos de um prato: soma o custo de cada linha da receita.
 * Ingredientes cujo insumo foi excluido simplesmente valem R$ 0,00.
 */
export function custoDeInsumosDoPrato(
  ingredientes: IngredienteReceita[],
  insumos: Insumo[]
): number {
  const porId = new Map(insumos.map((i) => [i.id, i]));
  const total = ingredientes.reduce((soma, item) => {
    const insumo = porId.get(item.insumoId);
    if (!insumo) return soma;
    return soma + custoDoIngrediente(item.quantidade, insumo.preco, insumo.rendimento);
  }, 0);
  return arredondar(total);
}

/**
 * Custo da folha de pagamento no mes.
 *
 *   (soma dos salarios) x (1 + encargos / 100)
 *
 * Os encargos (FGTS, INSS, ferias, 13o...) sao um percentual em cima do
 * salario bruto: uma pessoa que ganha R$ 2.000,00 com 40% de encargos
 * custa R$ 2.800,00 por mes para o negocio.
 */
export function custoDaFolha(config: Configuracoes): number {
  const equipe = Array.isArray(config.funcionarios) ? config.funcionarios : [];
  const salarios = equipe.reduce((soma, pessoa) => {
    const salario = Number.isFinite(pessoa?.salario) && pessoa.salario > 0 ? pessoa.salario : 0;
    return soma + salario;
  }, 0);

  // Encargos negativos nao fazem sentido; sao tratados como 0.
  const encargos =
    Number.isFinite(config.encargosPercentual) && config.encargosPercentual > 0
      ? config.encargosPercentual
      : 0;

  return arredondar(salarios * (1 + encargos / 100));
}

/**
 * Quanto por cento do preco de venda vai embora so para pagar as contas
 * fixas da casa.
 *
 *   (gas + aluguel + luz + outros + folha) / faturamento do mes x 100
 *
 * Exemplo: R$ 12.000,00 de contas com R$ 40.000,00 de faturamento = 30%.
 * Ou seja, de cada R$ 100,00 vendidos, R$ 30,00 ja estao comprometidos.
 *
 * Usamos percentual do faturamento (e nao "custo por prato") porque numa
 * casa de massas quase tudo e vendido por quilo — contar pratos nao
 * funciona, mas o total faturado no mes o PDV informa.
 *
 * Sem faturamento informado devolvemos 0, para nunca dividir por zero.
 */
export function percentualCustoFixo(config: Configuracoes): number {
  const fixos = somaCustosFixos(config);
  if (!config.faturamentoMensal || config.faturamentoMensal <= 0) return 0;
  // Limitado a 95%: acima disso nenhum preco fecharia a conta.
  return Math.min(arredondar((fixos / config.faturamentoMensal) * 100, 2), 95);
}

/**
 * Quanto de custo fixo cabe a UMA unidade vendida, dado o preco dela.
 * Como o rateio e percentual, quanto mais caro o item, mais ele paga
 * das contas da casa — que e exatamente como funciona na pratica.
 */
export function custoFixoDaUnidade(precoVenda: number, percentualFixo: number): number {
  if (!precoVenda || precoVenda <= 0) return 0;
  return arredondar((precoVenda * (percentualFixo || 0)) / 100);
}

/**
 * Soma de todos os custos fixos do mes, INCLUINDO a folha de pagamento
 * (salarios + encargos). E este total que e dividido pelos pratos vendidos.
 */
export function somaCustosFixos(config: Configuracoes): number {
  return arredondar(
    (config.gas || 0) +
      (config.aluguel || 0) +
      (config.luz || 0) +
      (config.outros || 0) +
      custoDaFolha(config)
  );
}

/**
 * Custo dos insumos de UMA unidade vendida.
 *
 *   custo da receita inteira / quanto a receita rende
 *
 * Exemplos:
 *   - Receita de coxinha: R$ 30,00 de insumos, rende 10 un -> R$ 3,00 por coxinha.
 *   - Receita de macarrao: R$ 30,00 de insumos, rende 1 kg -> R$ 30,00 por kg.
 *
 * Rendimento zerado ou invalido vira 1 (a receita rende "uma" coisa),
 * para nunca dividir por zero.
 */
export function custoPorUnidadeVendida(custoDaReceita: number, rendimento: number): number {
  const rende = Number.isFinite(rendimento) && rendimento > 0 ? rendimento : 1;
  return arredondar((custoDaReceita || 0) / rende);
}

/**
 * Custo total de UMA unidade vendida = insumos dessa unidade + fatia dos
 * custos fixos. Os dois lados falam da mesma coisa: uma unidade vendida.
 */
export function custoTotalDoPrato(custoInsumos: number, custoOperacional: number): number {
  return arredondar((custoInsumos || 0) + (custoOperacional || 0));
}

/**
 * Margem de lucro real, em %.
 *
 *   ((preco de venda - custo total) / preco de venda) x 100
 *
 * Se o preco de venda for 0 (ainda nao informado), a margem e 0 —
 * evita divisao por zero e evita mostrar "-Infinity" na tela.
 */
export function margemReal(precoVenda: number, custoTotal: number): number {
  if (!precoVenda || precoVenda <= 0) return 0;
  return arredondar(((precoVenda - custoTotal) / precoVenda) * 100, 1);
}

/** Lucro em reais por prato vendido. */
export function lucroReal(precoVenda: number, custoTotal: number): number {
  return arredondar((precoVenda || 0) - (custoTotal || 0));
}

/**
 * ---------------------------------------------------------------------
 * PRECO QUE FECHA A CONTA
 * ---------------------------------------------------------------------
 * Custo fixo, margem e taxa de aplicativo sao todos PERCENTUAIS sobre o
 * preco de venda — e um preco nao pode ser calculado somando percentuais
 * a um custo, porque cada percentual incide sobre o proprio preco final.
 *
 * A conta certa e dividir:
 *
 *   preco = (custo dos ingredientes + taxa fixa do app)
 *           -------------------------------------------
 *           1 - (%custo fixo + %margem + %taxa do app) / 100
 *
 * Exemplo: ingredientes R$ 10,00, custo fixo 30%, margem 20%, iFood 27%.
 *   preco = 10 / (1 - 0,77) = R$ 43,48
 * Conferindo: 43,48 - 30% (13,04) - 27% (11,74) - 10,00 = R$ 8,70 de
 * lucro, que e 20% de 43,48. Fecha.
 *
 * Se a soma dos percentuais chegar a 100%, nenhum preco fecha a conta:
 * devolvemos 0 e a tela avisa o dono em vez de mostrar um numero absurdo.
 */
export function precoQueFechaAConta(
  custoIngredientes: number,
  percentuais: {
    custoFixo?: number;
    margem?: number;
    taxaCanal?: number;
  },
  taxaFixaCanal = 0
): number {
  const soma =
    (percentuais.custoFixo || 0) + (percentuais.margem || 0) + (percentuais.taxaCanal || 0);

  const divisor = 1 - soma / 100;
  if (divisor <= 0) return 0; // impossivel: os percentuais consomem o preco inteiro

  return arredondarParaCima(((custoIngredientes || 0) + (taxaFixaCanal || 0)) / divisor);
}

/**
 * Preco sugerido para a venda direta (sem aplicativo).
 * Mantido como atalho do calculo acima, que e o unico lugar com a formula.
 */
export function precoSugerido(
  custoIngredientes: number,
  margemDesejada: number,
  percentualFixo = 0
): number {
  return precoQueFechaAConta(custoIngredientes, {
    custoFixo: percentualFixo,
    margem: Math.min(Math.max(margemDesejada || 0, 0), 99),
  });
}

/** Situacao da margem, usada para escolher a cor na tela. */
export type SituacaoMargem = "boa" | "atencao" | "prejuizo";

export function situacaoDaMargem(margem: number, margemDesejada: number): SituacaoMargem {
  if (margem < 0) return "prejuizo";
  if (margem >= margemDesejada) return "boa";
  return "atencao";
}

/**
 * Linha pronta do dashboard: todos os numeros de um prato ja calculados.
 * TUDO aqui, menos "custoReceita", e por UMA unidade vendida.
 */
export interface LinhaCalculada {
  id: string;
  nome: string;
  /** Categoria a que o produto pertence (para filtrar e agrupar). */
  categoriaId?: string;
  /** Custo dos insumos da receita inteira (ex.: as 10 coxinhas juntas). */
  custoReceita: number;
  /** Quanto a receita rende e em que unidade. */
  rendimento: number;
  unidadeRendimento: Unidade;
  /** Daqui para baixo, tudo por UMA unidade vendida. */
  custoInsumos: number;
  custoOperacional: number;
  custoTotal: number;
  precoVenda: number;
  margem: number;
  lucro: number;
  precoSugerido: number;
  precisaAjuste: boolean;
  situacao: SituacaoMargem;
}

/**
 * Monta a linha completa de um prato (usada no dashboard e na tela de pratos).
 * Recebe o custo de insumos da RECEITA INTEIRA e divide pelo rendimento,
 * para poder ser reaproveitada tanto no servidor quanto no formulario
 * em tempo real.
 */
export function calcularLinha(
  prato: Pick<
    Prato,
    "id" | "nome" | "precoVenda" | "rendimento" | "unidadeRendimento" | "categoriaId"
  >,
  custoDaReceita: number,
  percentualFixo: number,
  margemDesejada: number
): LinhaCalculada {
  const rendimento =
    Number.isFinite(prato.rendimento) && prato.rendimento > 0 ? prato.rendimento : 1;

  // 1) Custo dos ingredientes de UMA unidade vendida
  const custoInsumos = custoPorUnidadeVendida(custoDaReceita, rendimento);

  // 2) Fatia das contas da casa que este preco carrega (percentual do preco)
  const custoOperacional = custoFixoDaUnidade(prato.precoVenda, percentualFixo);

  // 3) Custo total desta unidade e o que sobra dela
  const custoTotal = custoTotalDoPrato(custoInsumos, custoOperacional);
  const margem = margemReal(prato.precoVenda, custoTotal);

  // 4) Preco que fecharia a conta (custo fixo + margem desejada)
  const sugerido = precoSugerido(custoInsumos, margemDesejada, percentualFixo);

  return {
    id: prato.id,
    nome: prato.nome,
    categoriaId: prato.categoriaId,
    custoReceita: arredondar(custoDaReceita),
    rendimento,
    unidadeRendimento: prato.unidadeRendimento ?? "un",
    custoInsumos: arredondar(custoInsumos),
    custoOperacional: arredondar(custoOperacional),
    custoTotal,
    precoVenda: arredondar(prato.precoVenda),
    margem,
    lucro: lucroReal(prato.precoVenda, custoTotal),
    precoSugerido: sugerido,
    // So sugerimos um novo preco quando a margem real esta abaixo da meta
    // E o preco sugerido e realmente maior que o praticado hoje.
    precisaAjuste:
      sugerido > 0 && margem < margemDesejada && sugerido > arredondar(prato.precoVenda),
    situacao: situacaoDaMargem(margem, margemDesejada),
  };
}
