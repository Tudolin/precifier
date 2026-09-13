/**
 * Tipos de dados do sistema.
 * Tudo em portugues para facilitar a manutencao futura.
 */

export type Unidade = "kg" | "g" | "L" | "mL" | "un";

export const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: "kg", rotulo: "kg (quilo)" },
  { valor: "g", rotulo: "g (grama)" },
  { valor: "L", rotulo: "L (litro)" },
  { valor: "mL", rotulo: "mL (mililitro)" },
  { valor: "un", rotulo: "un (unidade)" },
];

/** Materia-prima usada na cozinha (farinha, ovo, molho...) */
export interface Insumo {
  id: string;
  nome: string;
  unidade: Unidade;
  /** Preco pago por 1 unidade. Ex.: R$ 5,00 por 1 kg de farinha. */
  preco: number;
  /** Percentual realmente aproveitado. 100 = aproveita tudo. */
  rendimento: number;
  atualizadoEm: string;
}

/** Uma linha da ficha tecnica: qual insumo e quanto se usa dele. */
export interface IngredienteReceita {
  insumoId: string;
  /** Quantidade usada, na mesma unidade do insumo. */
  quantidade: number;
}

/**
 * Unidades em que uma receita pode render.
 * "un" cobre coxinhas, porções, marmitas — qualquer coisa contada na mão.
 */
export const UNIDADES_RENDIMENTO: { valor: Unidade; rotulo: string }[] = [
  { valor: "un", rotulo: "porções / unidades" },
  { valor: "kg", rotulo: "kg (quilos)" },
  { valor: "g", rotulo: "g (gramas)" },
  { valor: "L", rotulo: "L (litros)" },
  { valor: "mL", rotulo: "mL (mililitros)" },
];

/** Grupo de produtos: massas, congelados, salgados, bebidas... */
export interface Categoria {
  id: string;
  nome: string;
  /** Cor do selo na tela (uma das chaves de CORES_CATEGORIA). */
  cor: string;
}

/** Cores possiveis para o selo da categoria. */
export const CORES_CATEGORIA: Record<string, { fundo: string; texto: string; ponto: string }> = {
  laranja: { fundo: "bg-orange-100", texto: "text-orange-800", ponto: "bg-orange-500" },
  azul: { fundo: "bg-sky-100", texto: "text-sky-800", ponto: "bg-sky-500" },
  verde: { fundo: "bg-emerald-100", texto: "text-emerald-800", ponto: "bg-emerald-500" },
  vermelho: { fundo: "bg-red-100", texto: "text-red-800", ponto: "bg-red-500" },
  roxo: { fundo: "bg-violet-100", texto: "text-violet-800", ponto: "bg-violet-500" },
  amarelo: { fundo: "bg-amber-100", texto: "text-amber-800", ponto: "bg-amber-500" },
  rosa: { fundo: "bg-pink-100", texto: "text-pink-800", ponto: "bg-pink-500" },
  cinza: { fundo: "bg-slate-100", texto: "text-slate-700", ponto: "bg-slate-400" },
};

/**
 * Categorias sugeridas, na ordem em que aparecem.
 * "palavras" e usado pela classificacao automatica: a PRIMEIRA categoria
 * cuja expressao casar com o nome do produto vence, entao a ordem importa
 * (congelados vem antes de massas de proposito).
 */
export const CATEGORIAS_SUGERIDAS: { nome: string; cor: string; palavras: RegExp }[] = [
  { nome: "Congelados", cor: "azul", palavras: /\bCONG\b|CONG\.|CONGELAD/ },
  {
    nome: "Bebidas",
    cor: "roxo",
    palavras: /COCA|FANTA|GUARANA|AGUA|CERVEJA|SUCO|LIMONADA|MIX-CASTANHAS/,
  },
  {
    nome: "Salgados",
    cor: "amarelo",
    palavras: /^6|COXINHA|KIBE|ESFIHA|RISOLES|PASTEL|CROQUETE|BOLINHA|DOGUINHO/,
  },
  { nome: "Lasanhas", cor: "vermelho", palavras: /LASANHA/ },
  { nome: "Molhos", cor: "rosa", palavras: /^MOLHO/ },
  {
    nome: "Carnes",
    cor: "vermelho",
    palavras:
      /COSTELA|ALCATRA|PERNIL|^LOMBO|PICANHA|^POSTA|BIFE A ROLE|CHESTER|FRANGO ASSADO|COXA DESOS/,
  },
  {
    nome: "Doces",
    cor: "rosa",
    palavras: /PUDIM|TORTA DE|NEGA MALUCA|CUQUE|FORMIGUEIRO|BANOFE|MORANGOFE|FAROFA DOCE|SALPICAO DOCE/,
  },
  {
    nome: "Massas recheadas",
    cor: "laranja",
    palavras: /CAPELET|RAVIOLI|CANELONE|RONDELI|ROND\.|CONCHA|CONCHILIONE|^CONC |TORTEI|PIEROG|CALZO|NHOQUE RECHEADO/,
  },
  {
    nome: "Massas",
    cor: "laranja",
    palavras: /MACARRAO|MACARRÃO|ESPAGUETE|FETUTINE|TALHARIM|^MASSA|NHOQUE|SOPA CAPELETI/,
  },
  {
    nome: "Rotisseria",
    cor: "verde",
    palavras: /EMPADAO|PANQUECA|SALPICAO|FRICASSE|RISOTO|ARROZ|MAIONESE|FAROFA|STROGONOFF|ATUM/,
  },
  { nome: "Outros", cor: "cinza", palavras: /.*/ },
];

/** Prato do cardapio, com a receita e o preco praticado. */
export interface Prato {
  id: string;
  nome: string;
  /** Grupo a que pertence. Vazio = "Sem categoria". */
  categoriaId?: string;
  /** Preco cobrado por UMA unidade vendida (uma coxinha, um quilo...). */
  precoVenda: number;
  /**
   * PLU da balanca (0-9999), SE este prato for vendido por peso no PDV.
   * Preenchido = o preco daqui e publicado em `produto:{plu}` no Redis do
   * PDV a cada gravacao (ver `src/lib/pdv.ts`). Mutuamente exclusivo com
   * `codigoBarras`: um prato ou e pesado na balanca, ou tem etiqueta de
   * codigo de barras -- nunca os dois.
   */
  plu?: number;
  /**
   * Codigo de barras (EAN), SE este prato for vendido por unidade no PDV
   * (ex.: uma bebida de prateleira). Preenchido = publicado em
   * `produto_ean:{codigo}`. Ver `plu` acima.
   */
  codigoBarras?: string;
  ingredientes: IngredienteReceita[];
  /**
   * Quanto a receita inteira rende. Ex.: 10 (coxinhas) ou 1 (kg de macarrao).
   * O custo de UMA unidade vendida = custo da receita / rendimento.
   */
  rendimento: number;
  /** Em que unidade a receita rende: "un" (porcoes), "kg", "L"... */
  unidadeRendimento: Unidade;
  /**
   * Custo dos insumos da RECEITA INTEIRA, calculado no servidor e guardado
   * aqui. Serve para o dashboard carregar rapido; e sempre recalculado
   * quando um insumo ou a receita muda.
   * Atencao: este valor NAO e por unidade vendida — divida pelo rendimento.
   */
  custoInsumos: number;
  atualizadoEm: string;
}

/** Uma pessoa da equipe e quanto ela custa por mes. */
export interface Funcionario {
  id: string;
  nome: string;
  /** Salario mensal bruto, sem os encargos. */
  salario: number;
}

/** Custos fixos do mes e metas do negocio. */
export interface Configuracoes {
  gas: number;
  aluguel: number;
  luz: number;
  outros: number;
  /** Equipe: cada pessoa com o seu salario mensal. */
  funcionarios: Funcionario[];
  /**
   * Percentual somado aos salarios para cobrir FGTS, INSS, ferias, 13o etc.
   * Ex.: 40 significa que cada R$ 1.000,00 de salario custa R$ 1.400,00.
   */
  encargosPercentual: number;
  /**
   * Quanto a casa fatura por mes, em media (soma de tudo o que entra).
   *
   * Usamos o faturamento — e nao a contagem de pratos — porque numa casa
   * de massas quase tudo e vendido por quilo: contar "pratos" nao faz
   * sentido, mas o total vendido no mes qualquer PDV informa.
   */
  faturamentoMensal: number;
  /** Margem de lucro desejada, em %. */
  margemDesejada: number;
}

export const CONFIG_PADRAO: Configuracoes = {
  gas: 0,
  aluguel: 0,
  luz: 0,
  outros: 0,
  funcionarios: [],
  encargosPercentual: 0,
  faturamentoMensal: 0,
  margemDesejada: 30,
};

/**
 * Onde o produto e vendido: balcao, iFood, 99Food, WhatsApp...
 * Cada canal cobra a sua comissao, e o preco precisa cobri-la.
 */
export interface CanalVenda {
  id: string;
  nome: string;
  /** Comissao do aplicativo, em % sobre o preco de venda. */
  taxaPercentual: number;
  /** Valor fixo cobrado por pedido, em R$ (alguns apps cobram). */
  taxaFixa: number;
  atualizadoEm: string;
}

/** Sugestoes prontas, para o dono nao precisar comecar do zero. */
export const CANAIS_SUGERIDOS: { nome: string; taxaPercentual: number; taxaFixa: number }[] = [
  { nome: "Balcão / retirada", taxaPercentual: 0, taxaFixa: 0 },
  { nome: "iFood (entrega do app)", taxaPercentual: 27, taxaFixa: 0 },
  { nome: "iFood (entrega própria)", taxaPercentual: 12, taxaFixa: 0 },
  { nome: "99Food", taxaPercentual: 20, taxaFixa: 0 },
  { nome: "WhatsApp / telefone", taxaPercentual: 0, taxaFixa: 0 },
];

/** Usuario unico do sistema (o dono). */
export interface Usuario {
  email: string;
  senhaHash: string;
  criadoEm: string;
}

/** Resposta padrao das Server Actions, sempre com mensagem amigavel. */
export interface Resultado {
  ok: boolean;
  mensagem: string;
}
