import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import BotaoSair from "@/components/BotaoSair";
import Navegacao from "@/components/Navegacao";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  // Segunda camada de proteção (a primeira é o middleware)
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-massa-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🍝
            </span>
            <div>
              <p className="text-xl font-extrabold leading-tight">Meu Preço Certo</p>
              <p className="text-sm text-massa-100">{sessao.user.email}</p>
            </div>
          </div>
          <BotaoSair />
        </div>
      </header>

      <Navegacao />

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-center text-sm text-slate-400">
        Qualquer dúvida, é só chamar quem instalou o sistema.
      </footer>
    </div>
  );
}
