"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  /** "media" para formulários curtos, "grande" para a ficha técnica. */
  largura?: "media" | "grande";
  /** Enquanto true, o modal não fecha (evita fechar no meio de um salvamento). */
  travado?: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}

/**
 * Janela de edição (popup).
 *
 * Decisões pensadas para quem tem pouca familiaridade com tecnologia:
 *  - clicar FORA não fecha. Um clique errado no meio de uma ficha técnica
 *    longa apagaria tudo o que a pessoa digitou;
 *  - fecha com o X, com o botão Cancelar do formulário ou com a tecla Esc;
 *  - o cabeçalho fica fixo no topo, então o X continua à vista mesmo
 *    quando o formulário é grande e precisa rolar.
 */
export default function Modal({
  aberto,
  titulo,
  descricao,
  largura = "media",
  travado = false,
  aoFechar,
  children,
}: Props) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  // Fecha com Esc
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !travado) aoFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, travado, aoFechar]);

  // Trava a rolagem da página atrás e devolve o foco ao fechar
  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Leva o foco para dentro da janela (primeiro campo, se houver)
    const primeiro = caixaRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea, button"
    );
    primeiro?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      focoAnterior.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        ref={caixaRef}
        className={`mx-auto my-4 w-full rounded-2xl bg-white shadow-2xl ${
          largura === "grande" ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{titulo}</h2>
            {descricao && <p className="mt-1 text-base text-slate-600">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={travado}
            aria-label="Fechar"
            title="Fechar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </header>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
