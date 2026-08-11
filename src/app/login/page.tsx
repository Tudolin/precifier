import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import FormularioLogin from "@/components/FormularioLogin";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PaginaLogin() {
  // Quem ja esta logado nao precisa ver a tela de login de novo
  const sessao = await getServerSession(authOptions);
  if (sessao?.user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-massa-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-massa-600 text-4xl shadow-lg">
            🍝
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Meu Preço Certo</h1>
          <p className="mt-2 text-lg text-slate-600">
            Entre para ver os custos e o lucro dos seus pratos.
          </p>
        </div>

        <FormularioLogin />

        <p className="mt-6 text-center text-sm text-slate-500">
          Sistema de uso exclusivo do dono da casa de massas.
        </p>
      </div>
    </main>
  );
}
