"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

/**
 * Balãozinho de ajuda ao lado dos campos.
 * Abre ao passar o mouse E ao focar pelo teclado (acessibilidade).
 */
export default function Dica({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Ajuda"
        title={texto}
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={() => setAberto(false)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onClick={() => setAberto((v) => !v)}
        className="ml-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-massa-600 transition hover:bg-massa-50 focus:outline-none focus:ring-2 focus:ring-massa-300"
      >
        <HelpCircle size={18} />
      </button>

      {aberto && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-normal leading-snug text-white shadow-xl"
        >
          {texto}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}
