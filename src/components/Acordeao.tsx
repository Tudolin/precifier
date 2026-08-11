"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  id: string;
  titulo: string;
  resumo?: string;
  /** Emoji que aparece do lado do título. */
  icone?: string;
  children: React.ReactNode;
}

/**
 * Bloco de ajuda que abre e fecha.
 * Se a pessoa chegar por um link com âncora (ex.: /ajuda#margem), o bloco
 * correspondente já abre sozinho e a tela rola até ele.
 */
export default function Acordeao({ id, titulo, resumo, icone, children }: Props) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    function conferirEndereco() {
      if (window.location.hash === `#${id}`) {
        setAberto(true);
        // Espera o bloco abrir antes de rolar até ele
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    }
    conferirEndereco();
    window.addEventListener("hashchange", conferirEndereco);
    return () => window.removeEventListener("hashchange", conferirEndereco);
  }, [id]);

  return (
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
        >
          {icone && (
            <span className="text-3xl" aria-hidden>
              {icone}
            </span>
          )}
          <span className="flex-1">
            <span className="block text-xl font-bold text-slate-900">{titulo}</span>
            {resumo && <span className="text-base text-slate-600">{resumo}</span>}
          </span>
          <ChevronDown
            size={26}
            className={`shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      {aberto && (
        <div className="border-t border-slate-200 px-6 py-6 text-lg leading-relaxed text-slate-700">
          {children}
        </div>
      )}
    </section>
  );
}
