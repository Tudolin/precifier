import Link from "next/link";

import { botaoPrimario } from "@/lib/estilos";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg text-center">
        <p className="text-6xl">🍝</p>
        <h1 className="mt-4 text-3xl font-extrabold text-slate-900">Página não encontrada</h1>
        <p className="mt-3 text-lg text-slate-600">
          Essa tela não existe. Clique no botão abaixo para voltar ao começo.
        </p>
        <Link href="/" className={`${botaoPrimario} mt-6`}>
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
