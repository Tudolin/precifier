"use server";

/**
 * Acoes de gravacao dos INSUMOS (materias-primas).
 * Toda alteracao de preco ou rendimento dispara o recalculo de todos
 * os pratos que usam aquele insumo.
 */

import { gravarInsumos, listarInsumos, gravarPratos, listarPratos } from "@/lib/banco";
import { novoId } from "@/lib/formatar";
import { exigirLogin, recalcularTodosOsPratos, revalidarTudo } from "@/lib/servico";
import type { Insumo, Resultado, Unidade } from "@/lib/types";
import { UNIDADES } from "@/lib/types";

export interface DadosInsumo {
  id?: string;
  nome: string;
  unidade: string;
  preco: number;
  rendimento: number;
}

/** Validacao com mensagens que qualquer pessoa entende. */
function validar(dados: DadosInsumo): string | null {
  if (!dados.nome || dados.nome.trim().length < 2) {
    return "Opa! Escreva o nome do insumo (pelo menos 2 letras).";
  }
  if (!UNIDADES.some((u) => u.valor === dados.unidade)) {
    return "Opa! Escolha a unidade de medida (kg, g, L, mL ou un).";
  }
  if (!Number.isFinite(dados.preco) || dados.preco <= 0) {
    return "Opa! O preço precisa ser um número maior que zero.";
  }
  if (!Number.isFinite(dados.rendimento) || dados.rendimento <= 0 || dados.rendimento > 100) {
    return "Opa! O rendimento precisa ser um número entre 1 e 100.";
  }
  return null;
}

export async function salvarInsumo(dados: DadosInsumo): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const erro = validar(dados);
  if (erro) return { ok: false, mensagem: erro };

  const insumos = await listarInsumos();
  const agora = new Date().toISOString();

  const registro: Insumo = {
    id: dados.id || novoId(),
    nome: dados.nome.trim(),
    unidade: dados.unidade as Unidade,
    preco: dados.preco,
    rendimento: dados.rendimento,
    atualizadoEm: agora,
  };

  // Nao deixa cadastrar dois insumos com o mesmo nome (confunde na hora da receita)
  const nomeRepetido = insumos.some(
    (i) => i.id !== registro.id && i.nome.trim().toLowerCase() === registro.nome.toLowerCase()
  );
  if (nomeRepetido) {
    return { ok: false, mensagem: `Você já tem um insumo chamado "${registro.nome}".` };
  }

  const existe = insumos.some((i) => i.id === registro.id);
  const novaLista = existe
    ? insumos.map((i) => (i.id === registro.id ? registro : i))
    : [...insumos, registro];

  await gravarInsumos(novaLista);

  // Preco ou rendimento podem ter mudado -> todos os pratos precisam ser refeitos
  await recalcularTodosOsPratos();
  await revalidarTudo();

  return {
    ok: true,
    mensagem: existe
      ? `"${registro.nome}" foi atualizado e os custos dos pratos foram refeitos.`
      : `"${registro.nome}" foi cadastrado!`,
  };
}

export async function excluirInsumo(id: string): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const insumos = await listarInsumos();
  const alvo = insumos.find((i) => i.id === id);
  if (!alvo) return { ok: false, mensagem: "Esse insumo não foi encontrado." };

  await gravarInsumos(insumos.filter((i) => i.id !== id));

  // Tira o insumo excluido de todas as receitas para nao deixar "fantasmas"
  const pratos = await listarPratos();
  const limpos = pratos.map((prato) => ({
    ...prato,
    ingredientes: prato.ingredientes.filter((ing) => ing.insumoId !== id),
  }));
  await gravarPratos(limpos);

  await recalcularTodosOsPratos();
  await revalidarTudo();

  return { ok: true, mensagem: `"${alvo.nome}" foi excluído.` };
}
