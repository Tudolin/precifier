"use server";

/**
 * Acao de gravacao dos CUSTOS DA CASA (custos fixos + metas).
 * Mudar qualquer valor aqui muda o custo operacional de TODOS os pratos,
 * por isso revalidamos o site inteiro depois de salvar.
 */

import { gravarConfiguracoes } from "@/lib/banco";
import { exigirLogin, recalcularTodosOsPratos, revalidarTudo } from "@/lib/servico";
import type { Configuracoes, Resultado } from "@/lib/types";

export async function salvarConfiguracoes(dados: Configuracoes): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  // Só os campos que são valores em reais (os demais têm regras próprias)
  const camposEmReais = ["gas", "aluguel", "luz", "outros"] as const;
  for (const campo of camposEmReais) {
    const valor = dados[campo];
    if (!Number.isFinite(valor) || valor < 0) {
      return { ok: false, mensagem: "Opa! Os valores em reais não podem ser negativos." };
    }
  }

  if (!Number.isFinite(dados.faturamentoMensal) || dados.faturamentoMensal < 0) {
    return { ok: false, mensagem: "Opa! O faturamento do mês não pode ser negativo." };
  }
  if (
    !Number.isFinite(dados.margemDesejada) ||
    dados.margemDesejada < 0 ||
    dados.margemDesejada > 99
  ) {
    return { ok: false, mensagem: "Opa! A margem desejada precisa ficar entre 0% e 99%." };
  }

  // --- Equipe ---
  const equipe = Array.isArray(dados.funcionarios) ? dados.funcionarios : [];

  if (equipe.some((pessoa) => !pessoa.nome || pessoa.nome.trim().length < 2)) {
    return { ok: false, mensagem: "Opa! Escreva o nome de cada pessoa da equipe." };
  }
  if (equipe.some((pessoa) => !Number.isFinite(pessoa.salario) || pessoa.salario < 0)) {
    return { ok: false, mensagem: "Opa! O salário precisa ser um número positivo." };
  }
  if (
    !Number.isFinite(dados.encargosPercentual) ||
    dados.encargosPercentual < 0 ||
    dados.encargosPercentual > 200
  ) {
    return { ok: false, mensagem: "Opa! Os encargos precisam ficar entre 0% e 200%." };
  }

  const config: Configuracoes = {
    gas: dados.gas,
    aluguel: dados.aluguel,
    luz: dados.luz,
    outros: dados.outros,
    funcionarios: equipe.map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.nome.trim(),
      salario: pessoa.salario,
    })),
    encargosPercentual: dados.encargosPercentual,
    faturamentoMensal: dados.faturamentoMensal,
    margemDesejada: dados.margemDesejada,
  };

  await gravarConfiguracoes(config);

  // Por seguranca, refazemos tambem o custo de insumos de cada prato.
  await recalcularTodosOsPratos();
  await revalidarTudo();

  return { ok: true, mensagem: "Tudo salvo! Os cálculos foram refeitos." };
}
