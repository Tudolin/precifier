"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

/** Botão "Sair", sempre visível no canto superior direito. */
export default function BotaoSair() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30"
    >
      <LogOut size={20} />
      Sair
    </button>
  );
}
