"use client";

import { AlertTriangle } from "lucide-react";

import { botaoPrimario, cartao } from "@/lib/estilos";

/** Tela amigável de erro — sem termos técnicos. */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${cartao} mx-auto max-w-2xl text-center`}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">Algo não carregou direito</h1>
      <p className="mx-auto mt-3 max-w-lg text-lg text-slate-600">
        Não se preocupe: nada foi perdido. Clique no botão abaixo para tentar de novo. Se continuar
        assim, avise quem instalou o sistema.
      </p>
      <button type="button" className={`${botaoPrimario} mt-6`} onClick={reset}>
        Tentar de novo
      </button>
    </div>
  );
}
