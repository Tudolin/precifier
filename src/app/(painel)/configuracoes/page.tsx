import ConfiguracoesClient from "@/components/ConfiguracoesClient";
import LinkAjuda from "@/components/LinkAjuda";
import { obterConfiguracoes } from "@/lib/banco";

export const dynamic = "force-dynamic";
// Nunca reaproveitar leitura de banco guardada em cache: os números
// precisam refletir o banco no instante em que a tela é aberta.
export const fetchCache = "force-no-store";

export default async function PaginaConfiguracoes() {
  const config = await obterConfiguracoes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Custos da Casa</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-600">
          Aqui você anota o que paga todo mês para manter a cozinha funcionando. Com isso o sistema
          descobre quanto cada prato precisa “pagar” dessas contas — e mostra se o seu preço está
          dando lucro de verdade.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <LinkAjuda secao="faturamento">O que é faturamento?</LinkAjuda>
          <LinkAjuda secao="margem">O que é margem de lucro?</LinkAjuda>
        </div>
      </div>

      <ConfiguracoesClient config={config} />
    </div>
  );
}
