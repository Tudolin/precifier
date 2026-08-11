import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * Link discreto que leva direto para a explicação certa dentro da Ajuda.
 * Ex.: <LinkAjuda secao="margem">Entenda o que é margem de lucro</LinkAjuda>
 */
export default function LinkAjuda({
  secao,
  children,
}: {
  secao: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/ajuda#${secao}`}
      className="inline-flex items-center gap-2 text-base font-semibold text-massa-700 underline underline-offset-2 transition hover:text-massa-800"
    >
      <BookOpen size={18} />
      {children}
    </Link>
  );
}
