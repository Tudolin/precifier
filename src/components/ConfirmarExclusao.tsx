"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";

import { botaoPerigo, botaoSecundario } from "@/lib/estilos";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  processando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Janela de confirmação usada antes de excluir qualquer coisa. */
export default function ConfirmarExclusao({
  aberto,
  titulo,
  descricao,
  processando = false,
  aoConfirmar,
  aoCancelar,
}: Props) {
  // Fecha com a tecla ESC
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !processando) aoCancelar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, processando, aoCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{titulo}</h2>
            <p className="mt-2 text-lg leading-snug text-slate-600">{descricao}</p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={botaoSecundario} onClick={aoCancelar} disabled={processando}>
            Não, voltar
          </button>
          <button type="button" className={botaoPerigo} onClick={aoConfirmar} disabled={processando}>
            {processando ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Excluindo...
              </>
            ) : (
              "Sim, excluir"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
