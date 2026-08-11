"use client";

import { Search, X } from "lucide-react";

interface Props {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
  /** Texto do tipo "Mostrando 1 a 20 de 147". */
  resumo?: string;
}

/** Caixa de busca grande, com lupa e botão para limpar. */
export default function CampoBusca({ valor, aoMudar, placeholder, resumo }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <Search
          size={22}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={placeholder ?? "Digite para procurar..."}
          aria-label="Procurar na lista"
          className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-12 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-massa-500 focus:ring-4 focus:ring-massa-100"
        />
        {valor && (
          <button
            type="button"
            onClick={() => aoMudar("")}
            aria-label="Limpar a busca"
            title="Limpar"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {resumo && <p className="text-base text-slate-500">{resumo}</p>}
    </div>
  );
}
