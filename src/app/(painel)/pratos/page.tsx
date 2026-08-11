import Link from "next/link";

import LinkAjuda from "@/components/LinkAjuda";
import PratosClient from "@/components/PratosClient";
import {
  listarCategorias,
  listarInsumos,
  listarPratos,
  obterConfiguracoes,
} from "@/lib/banco";
import { percentualCustoFixo } from "@/lib/calculos";
import { botaoPrimario, cartao } from "@/lib/estilos";

export const dynamic = "force-dynamic";
// Nunca reaproveitar leitura de banco guardada em cache: os números
// precisam refletir o banco no instante em que a tela é aberta.
export const fetchCache = "force-no-store";

export default async function PaginaPratos() {
  const [insumos, pratos, config, categorias] = await Promise.all([
    listarInsumos(),
    listarPratos(),
    obterConfiguracoes(),
    listarCategorias(),
  ]);

  const percentualFixo = percentualCustoFixo(config);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Meus Pratos</h1>
        <p className="mt-2 text-lg text-slate-600">
          Monte a ficha técnica de cada prato e acompanhe os custos.
        </p>
        <div className="mt-3">
          <LinkAjuda secao="rendimento">
            Como preencher o rendimento da receita
          </LinkAjuda>
        </div>
      </div>

      {insumos.length === 0 ? (
        <div className={`${cartao} text-center`}>
          <p className="text-2xl font-bold text-slate-800">Primeiro cadastre os seus insumos</p>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
            Para montar a receita de um prato, você precisa ter os ingredientes cadastrados
            (farinha, ovos, molho...).
          </p>
          <Link href="/insumos" className={`${botaoPrimario} mt-6`}>
            Ir para Meus Insumos
          </Link>
        </div>
      ) : (
        <PratosClient
          insumos={insumos}
          pratos={pratos}
          categorias={categorias}
          percentualFixo={percentualFixo}
          margemDesejada={config.margemDesejada}
        />
      )}
    </div>
  );
}
