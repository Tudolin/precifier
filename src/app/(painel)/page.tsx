import Link from "next/link";
import { ChefHat, Percent, Wallet } from "lucide-react";

import PrimeirosPassos from "@/components/PrimeirosPassos";
import TabelaDashboard from "@/components/TabelaDashboard";
import {
  listarCanais,
  listarCategorias,
  listarInsumos,
  listarPratos,
  obterConfiguracoes,
} from "@/lib/banco";
import {
  calcularLinha,
  custoDaFolha,
  custoDeInsumosDoPrato,
  percentualCustoFixo,
  somaCustosFixos,
} from "@/lib/calculos";
import { botaoPrimario, cartao } from "@/lib/estilos";
import { formatarMoeda, formatarPorcentagem } from "@/lib/formatar";

export const dynamic = "force-dynamic";
// Nunca reaproveitar leitura de banco guardada em cache: os números
// precisam refletir o banco no instante em que a tela é aberta.
export const fetchCache = "force-no-store";

export default async function PaginaInicial() {
  const [insumos, pratos, config, canais, categorias] = await Promise.all([
    listarInsumos(),
    listarPratos(),
    obterConfiguracoes(),
    listarCanais(),
    listarCategorias(),
  ]);

  // Quanto de cada venda vai só para pagar as contas da casa
  // ((gás + aluguel + luz + outros + folha) ÷ faturamento do mês)
  const percentualFixo = percentualCustoFixo(config);
  const custosFixos = somaCustosFixos(config);
  const folha = custoDaFolha(config);
  const totalFuncionarios = config.funcionarios?.length ?? 0;

  /**
   * Recalculamos o custo de insumos aqui também (e não só o valor guardado),
   * para a tela nunca mostrar um número desatualizado, mesmo que algo
   * tenha falhado em algum recálculo anterior.
   */
  const linhas = pratos.map((prato) =>
    calcularLinha(
      prato,
      custoDeInsumosDoPrato(prato.ingredientes, insumos),
      percentualFixo,
      config.margemDesejada
    )
  );

  const precisandoAjuste = linhas.filter((l) => l.precisaAjuste).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Visão Geral do Meu Negócio</h1>
        <p className="mt-2 text-lg text-slate-600">
          Aqui você vê, prato por prato, quanto custa e quanto sobra de lucro.
        </p>
      </div>

      {/* Guia de preenchimento: some sozinho quando estiver tudo pronto */}
      <PrimeirosPassos
        passos={[
          {
            titulo: "Cadastrar os ingredientes",
            descricao: "Farinha, ovos, queijo... com o preço que você paga.",
            pronto: insumos.length > 0,
            href: "/insumos",
            acao: "Cadastrar",
          },
          {
            titulo: "Montar as receitas dos pratos",
            descricao: "O que entra em cada prato e quanto a receita rende.",
            pronto: pratos.length > 0,
            href: "/pratos",
            acao: "Cadastrar",
          },
          {
            titulo: "Informar as contas do mês",
            descricao: "Gás, aluguel, luz, equipe e outros custos fixos.",
            pronto: custosFixos > 0,
            href: "/configuracoes",
            acao: "Preencher",
          },
          {
            titulo: "Informar quanto fatura por mês",
            descricao: "Sem isso, as contas da casa não entram no preço.",
            pronto: config.faturamentoMensal > 0,
            href: "/configuracoes",
            acao: "Preencher",
          },
          {
            titulo: "Cadastrar onde você vende",
            descricao: "Balcão, iFood, 99Food — cada um cobra uma taxa diferente.",
            pronto: canais.length > 0,
            href: "/delivery",
            acao: "Cadastrar",
          },
        ]}
      />

      {/* ---------- Três cards de resumo ---------- */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className={cartao}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-massa-100 text-massa-700">
              <Wallet size={26} />
            </span>
            <div>
              <p className="text-base font-medium text-slate-500">As contas comem de cada venda</p>
              <p className="text-3xl font-extrabold text-slate-900">
                {formatarPorcentagem(percentualFixo)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {percentualFixo > 0
              ? `${formatarMoeda(custosFixos)} de contas ÷ ${formatarMoeda(config.faturamentoMensal)} de faturamento.`
              : "Informe suas contas e o faturamento em “Custos da Casa”."}
          </p>
          {totalFuncionarios > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              Inclui {formatarMoeda(folha)} de equipe ({totalFuncionarios}{" "}
              {totalFuncionarios === 1 ? "pessoa" : "pessoas"}).
            </p>
          )}
        </div>

        <div className={cartao}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Percent size={26} />
            </span>
            <div>
              <p className="text-base font-medium text-slate-500">Margem que você quer ganhar</p>
              <p className="text-3xl font-extrabold text-slate-900">
                {formatarPorcentagem(config.margemDesejada, 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            É o quanto do preço do prato deve sobrar de lucro para você.
          </p>
        </div>

        <div className={cartao}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <ChefHat size={26} />
            </span>
            <div>
              <p className="text-base font-medium text-slate-500">Pratos cadastrados</p>
              <p className="text-3xl font-extrabold text-slate-900">{pratos.length}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {precisandoAjuste > 0
              ? `${precisandoAjuste} ${
                  precisandoAjuste === 1 ? "prato precisa" : "pratos precisam"
                } de ajuste no preço.`
              : "Nenhum prato precisando de ajuste. Muito bem!"}
          </p>
        </div>
      </div>

      {/* ---------- Tabela principal ---------- */}
      {pratos.length === 0 ? (
        <div className={`${cartao} text-center`}>
          <p className="text-2xl font-bold text-slate-800">Você ainda não cadastrou nenhum prato</p>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
            Comece cadastrando os seus ingredientes em <strong>Meus Insumos</strong> e depois monte a
            receita de cada prato em <strong>Meus Pratos</strong>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/insumos" className={botaoPrimario}>
              Cadastrar meus insumos
            </Link>
            <Link href="/pratos" className={botaoPrimario}>
              Cadastrar meus pratos
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/*
            AVISO IMPORTANTE: sem "pratos vendidos por mes" nao ha como dividir
            os custos fixos, entao o custo da casa fica R$ 0,00 e as margens
            aparecem otimistas demais. Melhor avisar do que deixar o dono
            tomar uma decisao de preco em cima de um numero incompleto.
          */}
          {config.faturamentoMensal <= 0 && custosFixos > 0 && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 py-5">
              <p className="text-xl font-bold text-amber-900">
                ⚠️ Estes números ainda estão incompletos
              </p>
              <p className="mt-2 text-lg leading-snug text-amber-900">
                Você tem <strong>{formatarMoeda(custosFixos)}</strong> de contas por mês, mas ainda
                não disse <strong>quanto fatura por mês</strong>. Sem isso, o sistema não consegue
                calcular quanto de cada venda vai para pagar essas contas — e as margens abaixo
                estão <strong>melhores do que a realidade</strong>.
              </p>
              <Link href="/configuracoes" className={`${botaoPrimario} mt-4`}>
                Informar meu faturamento
              </Link>
            </div>
          )}

          <TabelaDashboard
            linhas={linhas}
            margemDesejada={config.margemDesejada}
            percentualFixo={percentualFixo}
            categorias={categorias}
          />
        </>
      )}
    </div>
  );
}
