"use client";

import { useMemo, useState } from "react";

import { normalizarTexto } from "./formatar";

/**
 * Junta BUSCA + PAGINACAO numa coisa so.
 *
 * Usado nas tres listas do sistema (dashboard, pratos e insumos) para que
 * as tres se comportem exatamente igual: mesma caixa de busca, mesmos
 * botoes de pagina, mesma mensagem quando nao encontra nada.
 */
export function usarListaPaginada<T>(
  itens: T[],
  /** Devolve o texto de um item que a busca deve olhar (normalmente o nome). */
  textoDoItem: (item: T) => string,
  porPagina = 20
) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const alvo = normalizarTexto(busca);
    if (!alvo) return itens;
    // Cada palavra digitada precisa aparecer: "lasanha frango" acha
    // "LASANHA DE FRANGO" mesmo com palavras no meio.
    const palavras = alvo.split(/\s+/).filter(Boolean);
    return itens.filter((item) => {
      const texto = normalizarTexto(textoDoItem(item));
      return palavras.every((palavra) => texto.includes(palavra));
    });
  }, [itens, busca, textoDoItem]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  // Se a lista encolheu (por causa da busca) e a pagina atual ficou
  // "no vazio", mostramos a ultima pagina que existe.
  const paginaAtual = Math.min(pagina, totalPaginas);

  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = filtrados.slice(inicio, inicio + porPagina);

  /** Trocar a busca sempre volta para a primeira pagina. */
  function definirBusca(valor: string) {
    setBusca(valor);
    setPagina(1);
  }

  return {
    busca,
    definirBusca,
    visiveis,
    /** Quantos itens sobraram depois da busca. */
    totalFiltrado: filtrados.length,
    /** Quantos itens existem no total, sem busca. */
    total: itens.length,
    paginaAtual,
    totalPaginas,
    irPara: setPagina,
    /** Numero do primeiro e do ultimo item mostrados (para o texto "1 a 20 de 147"). */
    primeiro: filtrados.length === 0 ? 0 : inicio + 1,
    ultimo: Math.min(inicio + porPagina, filtrados.length),
    buscando: busca.trim().length > 0,
  };
}
