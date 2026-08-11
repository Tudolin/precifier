"use server";

/**
 * Acoes das CATEGORIAS (massas, congelados, salgados, bebidas...).
 * Servem para agrupar os produtos e enxergar o cardapio por partes.
 */

import { gravarCategorias, gravarPratos, listarCategorias, listarPratos } from "@/lib/banco";
import { normalizarTexto, novoId } from "@/lib/formatar";
import { exigirLogin, revalidarTudo } from "@/lib/servico";
import { CATEGORIAS_SUGERIDAS, CORES_CATEGORIA, type Categoria, type Resultado } from "@/lib/types";

export interface DadosCategoria {
  id?: string;
  nome: string;
  cor: string;
}

export async function salvarCategoria(dados: DadosCategoria): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  if (!dados.nome || dados.nome.trim().length < 2) {
    return { ok: false, mensagem: "Opa! Escreva o nome da categoria (ex: Massas)." };
  }
  if (!CORES_CATEGORIA[dados.cor]) {
    return { ok: false, mensagem: "Opa! Escolha uma cor para a categoria." };
  }

  const categorias = await listarCategorias();
  const registro: Categoria = {
    id: dados.id || novoId(),
    nome: dados.nome.trim(),
    cor: dados.cor,
  };

  const repetida = categorias.some(
    (c) => c.id !== registro.id && normalizarTexto(c.nome) === normalizarTexto(registro.nome)
  );
  if (repetida) {
    return { ok: false, mensagem: `Você já tem uma categoria chamada "${registro.nome}".` };
  }

  const existe = categorias.some((c) => c.id === registro.id);
  await gravarCategorias(
    existe ? categorias.map((c) => (c.id === registro.id ? registro : c)) : [...categorias, registro]
  );
  await revalidarTudo();

  return {
    ok: true,
    mensagem: existe ? `"${registro.nome}" foi atualizada!` : `"${registro.nome}" foi criada!`,
  };
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const categorias = await listarCategorias();
  const alvo = categorias.find((c) => c.id === id);
  if (!alvo) return { ok: false, mensagem: "Essa categoria não foi encontrada." };

  await gravarCategorias(categorias.filter((c) => c.id !== id));

  // Os produtos NAO sao excluidos: apenas ficam sem categoria.
  const pratos = await listarPratos();
  const soltos = pratos.filter((p) => p.categoriaId === id).length;
  if (soltos > 0) {
    await gravarPratos(
      pratos.map((p) => (p.categoriaId === id ? { ...p, categoriaId: undefined } : p))
    );
  }

  await revalidarTudo();
  return {
    ok: true,
    mensagem:
      soltos > 0
        ? `"${alvo.nome}" foi excluída. ${soltos} ${soltos === 1 ? "produto ficou" : "produtos ficaram"} sem categoria.`
        : `"${alvo.nome}" foi excluída.`,
  };
}

/** Muda a categoria de um produto (usado direto na lista). */
export async function definirCategoriaDoPrato(
  pratoId: string,
  categoriaId: string
): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const pratos = await listarPratos();
  const alvo = pratos.find((p) => p.id === pratoId);
  if (!alvo) return { ok: false, mensagem: "Esse produto não foi encontrado." };

  await gravarPratos(
    pratos.map((p) => (p.id === pratoId ? { ...p, categoriaId: categoriaId || undefined } : p))
  );
  await revalidarTudo();

  return { ok: true, mensagem: `Categoria de "${alvo.nome}" atualizada!` };
}

/**
 * CLASSIFICACAO AUTOMATICA.
 *
 * Cria as categorias que ainda nao existem e distribui os produtos entre
 * elas olhando o nome. A primeira regra que casar vence — por isso
 * "Congelados" vem antes de "Massas": LASANHA CONG. e congelado.
 *
 * Por seguranca, so mexe em produto que ainda NAO tem categoria: o que o
 * dono organizou na mao nunca e sobrescrito.
 */
export async function classificarAutomaticamente(): Promise<Resultado> {
  if (!(await exigirLogin())) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre novamente, por favor." };
  }

  const [categorias, pratos] = await Promise.all([listarCategorias(), listarPratos()]);

  if (pratos.length === 0) {
    return { ok: false, mensagem: "Você ainda não tem produtos para organizar." };
  }

  // 1) Garante que as categorias sugeridas existam (sem duplicar)
  const porNome = new Map(categorias.map((c) => [normalizarTexto(c.nome), c]));
  const novas: Categoria[] = [];

  for (const sugerida of CATEGORIAS_SUGERIDAS) {
    const chave = normalizarTexto(sugerida.nome);
    if (porNome.has(chave)) continue;
    const criada: Categoria = { id: novoId(), nome: sugerida.nome, cor: sugerida.cor };
    porNome.set(chave, criada);
    novas.push(criada);
  }

  if (novas.length > 0) await gravarCategorias([...categorias, ...novas]);

  // 2) Distribui os produtos que ainda estão sem categoria
  let classificados = 0;
  const atualizados = pratos.map((prato) => {
    if (prato.categoriaId) return prato; // já organizado pelo dono: não mexemos

    const nome = prato.nome.toUpperCase();
    const regra = CATEGORIAS_SUGERIDAS.find((c) => c.palavras.test(nome));
    if (!regra) return prato;

    const categoria = porNome.get(normalizarTexto(regra.nome));
    if (!categoria) return prato;

    classificados++;
    return { ...prato, categoriaId: categoria.id };
  });

  await gravarPratos(atualizados);
  await revalidarTudo();

  if (classificados === 0) {
    return { ok: false, mensagem: "Todos os seus produtos já estão organizados em categorias." };
  }

  return {
    ok: true,
    mensagem: `${classificados} ${classificados === 1 ? "produto foi organizado" : "produtos foram organizados"} em ${novas.length > 0 ? `${novas.length} novas categorias` : "categorias"}! Confira e ajuste o que quiser.`,
  };
}
