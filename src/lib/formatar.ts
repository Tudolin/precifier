/**
 * Funcoes de formatacao e leitura de numeros no padrao brasileiro.
 * O dono digita "1.234,56" ou "1234.56" — os dois devem funcionar.
 */

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Ex.: 1234.5 -> "R$ 1.234,50" */
export function formatarMoeda(valor: number): string {
  if (!Number.isFinite(valor)) return moeda.format(0);
  return moeda.format(valor);
}

/** Ex.: 1234.5 -> "1.234,50" (sem o "R$", para usar dentro de inputs) */
export function formatarNumero(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(valor);
}

/** Ex.: 32.5 -> "32,5%" */
export function formatarPorcentagem(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return "0%";
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(valor)}%`;
}

/**
 * Converte o que o usuario digitou em numero.
 * Aceita "12,50", "12.50", "R$ 1.234,56", "2.000", " 8 " e devolve 0 para lixo.
 */
export function paraNumero(entrada: string | number | null | undefined): number {
  if (typeof entrada === "number") return Number.isFinite(entrada) ? entrada : 0;
  if (!entrada) return 0;

  let texto = String(entrada)
    .trim()
    .replace(/[R$\s ]/g, "");
  if (!texto) return 0;

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  if (temVirgula && temPonto) {
    // "1.234,56" -> ponto e separador de milhar, virgula e decimal
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // "12,50" -> virgula e decimal
    texto = texto.replace(",", ".");
  } else if (temPonto) {
    /**
     * So tem ponto: e ambiguo. "2.000" para um brasileiro e DOIS MIL,
     * mas "2.5" e dois e meio.
     * Regra: tratamos como separador de milhar apenas quando todos os
     * grupos depois do primeiro ponto tem exatamente 3 digitos —
     * "2.000" e "1.234.567" viram milhar; "2.5" e "12.50" seguem decimais.
     * Sem isso, um aluguel de R$ 2.000,00 voltaria do banco como R$ 2,00.
     */
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
      texto = texto.replace(/\./g, "");
    }
  }

  const numero = parseFloat(texto);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Prepara um numero para aparecer DENTRO de um campo de digitacao.
 *
 * Diferente do formatarNumero, NAO usa separador de milhar: devolve
 * "2000" e nao "2.000". Assim o valor que o dono ve no campo e exatamente
 * o que sera gravado, sem nenhuma chance de confusao entre ponto de
 * milhar e ponto decimal. Zero vira campo vazio (fica o placeholder).
 */
export function paraCampo(valor: number | null | undefined, casas = 2): string {
  if (!Number.isFinite(valor as number) || !valor) return "";
  const fator = Math.pow(10, casas);
  const arredondado = Math.round((valor as number) * fator) / fator;
  return String(arredondado).replace(".", ",");
}

/**
 * Deixa o texto "sem enfeite" para comparar na busca: tudo minusculo e
 * sem acento. Assim "MACARRAO" encontra "Macarrão" e vice-versa.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Gera um id simples e unico o suficiente para este uso. */
export function novoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
