import { CORES_CATEGORIA, type Categoria } from "@/lib/types";

/** Etiqueta colorida com o nome da categoria. */
export default function SeloCategoria({ categoria }: { categoria?: Categoria }) {
  if (!categoria) {
    return (
      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
        sem categoria
      </span>
    );
  }

  const cor = CORES_CATEGORIA[categoria.cor] ?? CORES_CATEGORIA.cinza;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cor.fundo} ${cor.texto}`}
    >
      {categoria.nome}
    </span>
  );
}
