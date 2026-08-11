"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  paginaAtual: number;
  totalPaginas: number;
  aoTrocar: (pagina: number) => void;
}

/**
 * Botões de página. Mostra no máximo 5 números por vez, sempre com
 * "Anterior" e "Próxima" bem grandes e escritos por extenso.
 */
export default function Paginacao({ paginaAtual, totalPaginas, aoTrocar }: Props) {
  if (totalPaginas <= 1) return null;

  // Janela de no máximo 5 números centrada na página atual
  const inicio = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
  const fim = Math.min(totalPaginas, inicio + 4);
  const numeros: number[] = [];
  for (let n = inicio; n <= fim; n++) numeros.push(n);

  const botao =
    "inline-flex h-12 min-w-[3rem] items-center justify-center gap-1 rounded-xl border-2 px-4 text-lg font-semibold transition focus:outline-none focus:ring-4 focus:ring-massa-200 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Navegação entre páginas"
      className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4"
    >
      <button
        type="button"
        className={`${botao} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
        onClick={() => aoTrocar(paginaAtual - 1)}
        disabled={paginaAtual <= 1}
      >
        <ChevronLeft size={20} />
        Anterior
      </button>

      {inicio > 1 && <span className="px-1 text-lg text-slate-400">...</span>}

      {numeros.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => aoTrocar(n)}
          aria-current={n === paginaAtual ? "page" : undefined}
          className={`${botao} ${
            n === paginaAtual
              ? "border-massa-600 bg-massa-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {n}
        </button>
      ))}

      {fim < totalPaginas && <span className="px-1 text-lg text-slate-400">...</span>}

      <button
        type="button"
        className={`${botao} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
        onClick={() => aoTrocar(paginaAtual + 1)}
        disabled={paginaAtual >= totalPaginas}
      >
        Próxima
        <ChevronRight size={20} />
      </button>
    </nav>
  );
}
