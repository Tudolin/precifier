/**
 * Funcoes internas de servidor usadas pelas Server Actions.
 *
 * ATENCAO: este arquivo NAO leva "use server" de proposito. Em arquivos
 * "use server" toda funcao exportada vira um endpoint HTTP publico —
 * e estas funcoes sao de uso interno, nunca devem ser chamadas de fora.
 */

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "./auth";
import { gravarPratos, listarInsumos, listarPratos } from "./banco";
import { custoDeInsumosDoPrato } from "./calculos";

/** Bloqueia qualquer gravacao vinda de alguem que nao esteja logado. */
export async function exigirLogin(): Promise<boolean> {
  const sessao = await getServerSession(authOptions);
  return Boolean(sessao?.user);
}

/**
 * RECALCULO GLOBAL.
 * Chamado sempre que um insumo muda de preco/rendimento (ou e excluido):
 * percorre todos os pratos e regrava o custo de insumos de cada um.
 * Sem isso, o dashboard mostraria custos velhos.
 */
export async function recalcularTodosOsPratos(): Promise<void> {
  const [insumos, pratos] = await Promise.all([listarInsumos(), listarPratos()]);

  const atualizados = pratos.map((prato) => ({
    ...prato,
    custoInsumos: custoDeInsumosDoPrato(prato.ingredientes, insumos),
  }));

  await gravarPratos(atualizados);
}

/** Invalida o cache de todas as telas para os numeros aparecerem na hora. */
export function revalidarTudo(): void {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/insumos");
  revalidatePath("/pratos");
  revalidatePath("/configuracoes");
}
