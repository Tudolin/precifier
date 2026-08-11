/**
 * Telas de "carregando" (esqueleto cinza piscando).
 * Aparecem enquanto os dados vêm do banco, para o dono não ficar olhando
 * para uma tela em branco achando que travou.
 */

export function EsqueletoTabela({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="esqueleto mb-6 h-7 w-64" />
      <div className="space-y-4">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="esqueleto h-6 flex-1" />
            <div className="esqueleto h-6 w-24" />
            <div className="esqueleto h-6 w-24" />
            <div className="esqueleto h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoCabecalho() {
  return (
    <div className="space-y-3">
      <div className="esqueleto h-10 w-80" />
      <div className="esqueleto h-6 w-full max-w-xl" />
    </div>
  );
}

export function EsqueletoCards({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="esqueleto h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="esqueleto h-4 w-32" />
              <div className="esqueleto h-8 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
