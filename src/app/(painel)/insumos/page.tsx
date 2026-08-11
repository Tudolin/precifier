import InsumosClient from "@/components/InsumosClient";
import LinkAjuda from "@/components/LinkAjuda";
import { listarInsumos } from "@/lib/banco";

export const dynamic = "force-dynamic";
// Nunca reaproveitar leitura de banco guardada em cache: os números
// precisam refletir o banco no instante em que a tela é aberta.
export const fetchCache = "force-no-store";

export default async function PaginaInsumos() {
  const insumos = await listarInsumos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Meus Insumos</h1>
        <p className="mt-2 text-lg text-slate-600">
          Aqui você cadastra tudo o que usa na cozinha: farinha, ovos, molho, etc.
        </p>
        <div className="mt-3">
          <LinkAjuda secao="rendimento">O que é o rendimento do insumo?</LinkAjuda>
        </div>
      </div>

      <InsumosClient insumos={insumos} />
    </div>
  );
}
