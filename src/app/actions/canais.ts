"use server";

/**
 * Acoes dos CANAIS DE VENDA (balcao, iFood, 99Food...).
 * Cada canal tem a sua comissao, e o preco recomendado muda conforme ela.
 */

import { gravarCanais, listarCanais } from "@/lib/banco";
import { novoId } from "@/lib/formatar";
import { exigirLogin, revalidarTudo } from "@/lib/servico";
import { CANAIS_SUGERIDOS, type CanalVenda, type Resultado } from "@/lib/types";

export interface DadosCanal {
  id?: string;
  nome: string;
  taxaPercentual: number;
  taxaFixa: number;
}

export async function salvarCanal(dados: DadosCanal): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  if (!dados.nome || dados.nome.trim().length < 2) {
    return { ok: false, mensagem: "Opa! Escreva o nome do canal (ex: iFood)." };
  }
  if (
    !Number.isFinite(dados.taxaPercentual) ||
    dados.taxaPercentual < 0 ||
    dados.taxaPercentual > 95
  ) {
    return { ok: false, mensagem: "Opa! A taxa precisa ficar entre 0% e 95%." };
  }
  if (!Number.isFinite(dados.taxaFixa) || dados.taxaFixa < 0) {
    return { ok: false, mensagem: "Opa! A taxa fixa não pode ser negativa." };
  }

  const canais = await listarCanais();
  const registro: CanalVenda = {
    id: dados.id || novoId(),
    nome: dados.nome.trim(),
    taxaPercentual: dados.taxaPercentual,
    taxaFixa: dados.taxaFixa,
    atualizadoEm: new Date().toISOString(),
  };

  const nomeRepetido = canais.some(
    (c) => c.id !== registro.id && c.nome.trim().toLowerCase() === registro.nome.toLowerCase()
  );
  if (nomeRepetido) {
    return { ok: false, mensagem: `Você já tem um canal chamado "${registro.nome}".` };
  }

  const existe = canais.some((c) => c.id === registro.id);
  await gravarCanais(
    existe ? canais.map((c) => (c.id === registro.id ? registro : c)) : [...canais, registro]
  );
  await revalidarTudo();

  return {
    ok: true,
    mensagem: existe ? `"${registro.nome}" foi atualizado!` : `"${registro.nome}" foi cadastrado!`,
  };
}

export async function excluirCanal(id: string): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const canais = await listarCanais();
  const alvo = canais.find((c) => c.id === id);
  if (!alvo) return { ok: false, mensagem: "Esse canal não foi encontrado." };

  await gravarCanais(canais.filter((c) => c.id !== id));
  await revalidarTudo();

  return { ok: true, mensagem: `"${alvo.nome}" foi excluído.` };
}

/**
 * Cadastra de uma vez os canais mais comuns, para o dono nao precisar
 * digitar tudo do zero. Nao mexe nos que ja existem.
 */
export async function usarCanaisSugeridos(): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const canais = await listarCanais();
  const existentes = new Set(canais.map((c) => c.nome.trim().toLowerCase()));

  const novos = CANAIS_SUGERIDOS.filter((s) => !existentes.has(s.nome.toLowerCase())).map((s) => ({
    id: novoId(),
    nome: s.nome,
    taxaPercentual: s.taxaPercentual,
    taxaFixa: s.taxaFixa,
    atualizadoEm: new Date().toISOString(),
  }));

  if (novos.length === 0) {
    return { ok: false, mensagem: "Esses canais já estão todos cadastrados." };
  }

  await gravarCanais([...canais, ...novos]);
  await revalidarTudo();

  return {
    ok: true,
    mensagem: `${novos.length} ${novos.length === 1 ? "canal foi cadastrado" : "canais foram cadastrados"}! Confira as taxas e ajuste se precisar.`,
  };
}
