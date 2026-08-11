"use server";

/**
 * Acoes de gravacao dos PRATOS (fichas tecnicas).
 */

import { gravarPratos, listarInsumos, listarPratos } from "@/lib/banco";
import { custoDeInsumosDoPrato } from "@/lib/calculos";
import { novoId } from "@/lib/formatar";
import { exigirLogin, revalidarTudo } from "@/lib/servico";
import type { IngredienteReceita, Prato, Resultado, Unidade } from "@/lib/types";
import { UNIDADES_RENDIMENTO } from "@/lib/types";

export interface DadosPrato {
  id?: string;
  nome: string;
  categoriaId?: string;
  precoVenda: number;
  rendimento: number;
  unidadeRendimento: string;
  ingredientes: IngredienteReceita[];
}

export async function salvarPrato(dados: DadosPrato): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  if (!dados.nome || dados.nome.trim().length < 2) {
    return { ok: false, mensagem: "Opa! Escreva o nome do prato (pelo menos 2 letras)." };
  }
  if (!Number.isFinite(dados.precoVenda) || dados.precoVenda < 0) {
    return { ok: false, mensagem: "Opa! O preço de venda precisa ser um número positivo." };
  }
  if (!Number.isFinite(dados.rendimento) || dados.rendimento <= 0) {
    return {
      ok: false,
      mensagem: "Opa! Diga quanto esta receita rende (precisa ser maior que zero).",
    };
  }
  if (!UNIDADES_RENDIMENTO.some((u) => u.valor === dados.unidadeRendimento)) {
    return { ok: false, mensagem: "Opa! Escolha em que a receita rende (porções, kg, L...)." };
  }
  if (!Array.isArray(dados.ingredientes) || dados.ingredientes.length === 0) {
    return { ok: false, mensagem: "Adicione pelo menos um ingrediente na receita." };
  }
  if (dados.ingredientes.some((i) => !i.insumoId)) {
    return { ok: false, mensagem: "Escolha o insumo em todas as linhas da receita." };
  }
  if (dados.ingredientes.some((i) => !Number.isFinite(i.quantidade) || i.quantidade <= 0)) {
    return { ok: false, mensagem: "Opa! A quantidade precisa ser um número positivo." };
  }

  const [insumos, pratos] = await Promise.all([listarInsumos(), listarPratos()]);

  const nome = dados.nome.trim();
  const id = dados.id || novoId();

  const nomeRepetido = pratos.some(
    (p) => p.id !== id && p.nome.trim().toLowerCase() === nome.toLowerCase()
  );
  if (nomeRepetido) {
    return { ok: false, mensagem: `Você já tem um prato chamado "${nome}".` };
  }

  // O custo dos insumos e sempre calculado NO SERVIDOR, nunca vem do navegador.
  // Este valor e o da RECEITA INTEIRA; a divisao pelo rendimento acontece
  // na hora de mostrar, em calcularLinha().
  const custoInsumos = custoDeInsumosDoPrato(dados.ingredientes, insumos);

  const registro: Prato = {
    id,
    nome,
    // Vazio vira undefined: o produto fica "sem categoria"
    categoriaId: dados.categoriaId || undefined,
    precoVenda: dados.precoVenda,
    ingredientes: dados.ingredientes,
    rendimento: dados.rendimento,
    unidadeRendimento: dados.unidadeRendimento as Unidade,
    custoInsumos,
    atualizadoEm: new Date().toISOString(),
  };

  const existe = pratos.some((p) => p.id === id);
  const novaLista = existe
    ? pratos.map((p) => (p.id === id ? registro : p))
    : [...pratos, registro];

  await gravarPratos(novaLista);
  await revalidarTudo();

  return {
    ok: true,
    mensagem: existe ? `"${nome}" foi atualizado!` : `"${nome}" foi cadastrado!`,
  };
}

export async function excluirPrato(id: string): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const pratos = await listarPratos();
  const alvo = pratos.find((p) => p.id === id);
  if (!alvo) return { ok: false, mensagem: "Esse prato não foi encontrado." };

  await gravarPratos(pratos.filter((p) => p.id !== id));
  await revalidarTudo();

  return { ok: true, mensagem: `"${alvo.nome}" foi excluído.` };
}

/**
 * Usada pela edicao rapida do preco direto na tabela do dashboard.
 * Salva so o preco e devolve os numeros ja recalculados.
 */
export async function atualizarPrecoVenda(id: string, precoVenda: number): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  if (!Number.isFinite(precoVenda) || precoVenda < 0) {
    return { ok: false, mensagem: "Opa! O preço precisa ser um número positivo." };
  }

  const pratos = await listarPratos();
  const alvo = pratos.find((p) => p.id === id);
  if (!alvo) return { ok: false, mensagem: "Esse prato não foi encontrado." };

  const novaLista = pratos.map((p) =>
    p.id === id ? { ...p, precoVenda, atualizadoEm: new Date().toISOString() } : p
  );

  await gravarPratos(novaLista);
  await revalidarTudo();

  return { ok: true, mensagem: `Preço de "${alvo.nome}" salvo!` };
}
