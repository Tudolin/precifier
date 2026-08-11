import DeliveryClient from "@/components/DeliveryClient";
import LinkAjuda from "@/components/LinkAjuda";
import {
  listarCanais,
  listarCategorias,
  listarInsumos,
  listarPratos,
  obterConfiguracoes,
} from "@/lib/banco";
import { custoDeInsumosDoPrato, custoPorUnidadeVendida, percentualCustoFixo } from "@/lib/calculos";

export const dynamic = "force-dynamic";
// Nunca reaproveitar leitura de banco guardada em cache: os números
// precisam refletir o banco no instante em que a tela é aberta.
export const fetchCache = "force-no-store";

export default async function PaginaDelivery() {
  const [insumos, pratos, config, canais, categorias] = await Promise.all([
    listarInsumos(),
    listarPratos(),
    obterConfiguracoes(),
    listarCanais(),
    listarCategorias(),
  ]);

  const percentualFixo = percentualCustoFixo(config);

  /**
   * Para a tabela de preços só interessa o custo de ingredientes de UMA
   * unidade vendida — o resto (custo fixo, margem, taxa do app) entra
   * como percentual na hora de calcular o preço de cada canal.
   */
  const itens = pratos.map((prato) => ({
    id: prato.id,
    nome: prato.nome,
    categoriaId: prato.categoriaId,
    precoVenda: prato.precoVenda,
    unidadeRendimento: prato.unidadeRendimento,
    custoInsumos: custoPorUnidadeVendida(
      custoDeInsumosDoPrato(prato.ingredientes, insumos),
      prato.rendimento
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Delivery e Aplicativos</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-600">
          Os aplicativos ficam com uma parte de cada venda. Aqui você anota quanto cada um cobra e
          o sistema mostra por quanto vender em cada lugar para o seu lucro continuar o mesmo.
        </p>
        <div className="mt-3">
          <LinkAjuda secao="delivery">
            Entenda por que não basta somar a taxa ao preço
          </LinkAjuda>
        </div>
      </div>

      <DeliveryClient
        canais={canais}
        categorias={categorias}
        itens={itens}
        percentualFixo={percentualFixo}
        margemDesejada={config.margemDesejada}
        faturamentoInformado={config.faturamentoMensal > 0}
      />
    </div>
  );
}
