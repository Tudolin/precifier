"use client";

import { BarChart3, Bike, ChefHat, CircleHelp, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Início", Icone: Home },
  { href: "/insumos", rotulo: "Meus Insumos", Icone: BarChart3 },
  { href: "/pratos", rotulo: "Meus Pratos", Icone: ChefHat },
  { href: "/delivery", rotulo: "Delivery e Apps", Icone: Bike },
  { href: "/configuracoes", rotulo: "Custos da Casa", Icone: Settings },
  { href: "/ajuda", rotulo: "Ajuda e Dicas", Icone: CircleHelp },
];

/** Menu principal — botões grandes, com ícone e nome escritos por extenso. */
export default function Navegacao() {
  const caminho = usePathname();

  return (
    <nav aria-label="Menu principal" className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-lg font-semibold transition ${
                ativo
                  ? "bg-massa-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icone size={22} />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
