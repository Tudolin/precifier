import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";

interface Passo {
  titulo: string;
  descricao: string;
  pronto: boolean;
  href: string;
  acao: string;
}

interface Props {
  passos: Passo[];
}

/**
 * Lista de primeiros passos.
 * Só aparece enquanto faltar alguma informação importante — quando estiver
 * tudo preenchido, some da tela para não virar poluição.
 */
export default function PrimeirosPassos({ passos }: Props) {
  const pendentes = passos.filter((p) => !p.pronto);
  if (pendentes.length === 0) return null;

  const prontos = passos.length - pendentes.length;

  return (
    <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold text-sky-900">Por onde começar</h2>
        <span className="text-base font-semibold text-sky-800">
          {prontos} de {passos.length} prontos
        </span>
      </div>
      <p className="mb-3 text-base text-sky-900">
        Complete estes passos para os números ficarem certos. Pode fazer com calma, um de cada vez.
      </p>
      <p className="mb-5">
        <Link
          href="/ajuda#passo-a-passo"
          className="inline-flex items-center gap-2 text-base font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-900"
        >
          <BookOpen size={18} />
          Ver o guia explicando cada passo
        </Link>
      </p>

      <ol className="space-y-3">
        {passos.map((passo, indice) => (
          <li
            key={passo.titulo}
            className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-4 ${
              passo.pronto ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-white"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                passo.pronto ? "bg-emerald-600 text-white" : "bg-sky-600 text-white"
              }`}
            >
              {passo.pronto ? <Check size={20} /> : indice + 1}
            </span>

            <div className="min-w-[14rem] flex-1">
              <p
                className={`text-lg font-bold ${
                  passo.pronto ? "text-emerald-900" : "text-slate-900"
                }`}
              >
                {passo.titulo}
              </p>
              <p className="text-base text-slate-600">{passo.descricao}</p>
            </div>

            {!passo.pronto && (
              <Link
                href={passo.href}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-base font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                {passo.acao}
                <ArrowRight size={18} />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
