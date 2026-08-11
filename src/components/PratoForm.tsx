"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { salvarPrato } from "@/app/actions/pratos";
import Dica from "@/components/Dica";
import {
  arredondar,
  custoDoIngrediente,
  custoFixoDaUnidade,
  custoPorUnidadeVendida,
  custoTotalDoPrato,
  lucroReal,
  margemReal,
  precoSugerido,
  situacaoDaMargem,
} from "@/lib/calculos";
import { botaoIcone, botaoPrimario, botaoSecundario, campo, rotulo } from "@/lib/estilos";
import {
  formatarMoeda,
  formatarNumero,
  formatarPorcentagem,
  paraCampo,
  paraNumero,
} from "@/lib/formatar";
import {
  UNIDADES_RENDIMENTO,
  type Categoria,
  type Insumo,
  type Prato,
  type Unidade,
} from "@/lib/types";

interface Props {
  insumos: Insumo[];
  categorias: Categoria[];
  prato: Prato | null;
  /** Quanto % de cada venda já está comprometido com as contas da casa. */
  percentualFixo: number;
  margemDesejada: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}

/** Linha da receita enquanto está sendo editada (quantidade fica como texto). */
interface LinhaReceita {
  chave: string;
  insumoId: string;
  quantidade: string;
}

let contador = 0;
function novaChave() {
  contador += 1;
  return `linha-${contador}`;
}

export default function PratoForm({
  insumos,
  categorias,
  prato,
  percentualFixo,
  margemDesejada,
  aoFechar,
  aoSalvar,
}: Props) {
  const [nome, setNome] = useState(prato?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState(prato?.categoriaId ?? "");
  const [precoVendaTexto, setPrecoVendaTexto] = useState(paraCampo(prato?.precoVenda));
  const [rendimentoTexto, setRendimentoTexto] = useState(paraCampo(prato?.rendimento, 3) || "1");
  const [unidadeRendimento, setUnidadeRendimento] = useState<Unidade>(
    prato?.unidadeRendimento ?? "un"
  );
  const [linhas, setLinhas] = useState<LinhaReceita[]>(() =>
    prato && prato.ingredientes.length > 0
      ? prato.ingredientes.map((ing) => ({
          chave: novaChave(),
          insumoId: ing.insumoId,
          quantidade: paraCampo(ing.quantidade, 3),
        }))
      : [{ chave: novaChave(), insumoId: "", quantidade: "" }]
  );
  const [salvando, setSalvando] = useState(false);

  const insumosPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  /**
   * CÁLCULO EM TEMPO REAL.
   * Roda a cada tecla digitada, usando exatamente as mesmas funções que o
   * servidor usa ao salvar — por isso o número da tela nunca "pula" depois.
   */
  const calculo = useMemo(() => {
    const custosPorLinha = linhas.map((linha) => {
      const insumo = insumosPorId.get(linha.insumoId);
      if (!insumo) return 0;
      return custoDoIngrediente(paraNumero(linha.quantidade), insumo.preco, insumo.rendimento);
    });

    // Custo de TODOS os ingredientes juntos: a receita inteira.
    const custoDaReceita = arredondar(custosPorLinha.reduce((a, b) => a + b, 0));

    // Quanto essa receita rende (10 coxinhas, 1 kg de macarrao...).
    const rendimento = paraNumero(rendimentoTexto);

    // Daqui para baixo, tudo passa a ser por UMA unidade vendida.
    const custoInsumos = custoPorUnidadeVendida(custoDaReceita, rendimento);
    const precoVenda = paraNumero(precoVendaTexto);

    // A fatia das contas da casa é um percentual do preço praticado
    const custoOperacional = custoFixoDaUnidade(precoVenda, percentualFixo);
    const custoTotal = custoTotalDoPrato(custoInsumos, custoOperacional);

    const margem = margemReal(precoVenda, custoTotal);
    const sugerido = precoSugerido(custoInsumos, margemDesejada, percentualFixo);

    return {
      custosPorLinha,
      custoDaReceita,
      rendimento,
      custoInsumos,
      custoOperacional,
      custoTotal,
      precoVenda,
      margem,
      lucro: lucroReal(precoVenda, custoTotal),
      sugerido,
      situacao: situacaoDaMargem(margem, margemDesejada),
      precisaAjuste:
        sugerido > 0 && precoVenda > 0 && margem < margemDesejada && sugerido > precoVenda,
    };
  }, [linhas, insumosPorId, percentualFixo, precoVendaTexto, rendimentoTexto, margemDesejada]);

  /** Nome amigável da unidade no singular, para os textos da tela. */
  const nomeUnidade = unidadeRendimento === "un" ? "porção" : unidadeRendimento;

  const coresMargem = {
    boa: "text-emerald-600",
    atencao: "text-amber-600",
    prejuizo: "text-red-600",
  } as const;

  function adicionarLinha() {
    setLinhas((atual) => [...atual, { chave: novaChave(), insumoId: "", quantidade: "" }]);
  }

  function removerLinha(chave: string) {
    setLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  function atualizarLinha(chave: string, campos: Partial<LinhaReceita>) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const ingredientes = linhas
      .filter((l) => l.insumoId)
      .map((l) => ({ insumoId: l.insumoId, quantidade: paraNumero(l.quantidade) }));

    if (ingredientes.length === 0) {
      toast.error("Adicione pelo menos um ingrediente na receita.");
      return;
    }
    if (ingredientes.some((i) => i.quantidade <= 0)) {
      toast.error("Opa! A quantidade precisa ser um número positivo.");
      return;
    }

    if (paraNumero(rendimentoTexto) <= 0) {
      toast.error("Opa! Diga quanto esta receita rende (precisa ser maior que zero).");
      return;
    }

    setSalvando(true);
    const resultado = await salvarPrato({
      id: prato?.id,
      nome,
      categoriaId,
      precoVenda: paraNumero(precoVendaTexto),
      rendimento: paraNumero(rendimentoTexto),
      unidadeRendimento,
      ingredientes,
    });
    setSalvando(false);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
      aoSalvar();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {/* ---------- Nome e categoria ---------- */}
      <div className="mb-7 grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="nome-prato" className={rotulo}>
            Nome do prato
          </label>
          <input
            id="nome-prato"
            className={campo}
            placeholder="Ex: Nhoque de batata"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={salvando}
          />
        </div>

        <div>
          <label htmlFor="categoria-prato" className={rotulo}>
            Categoria
            <Dica texto="Serve para agrupar seus produtos: massas, congelados, salgados, bebidas... Ajuda a achar as coisas e a ver como vai cada parte do cardápio." />
          </label>
          <select
            id="categoria-prato"
            className={campo}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            disabled={salvando}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {categorias.length === 0 && (
            <p className="mt-2 text-base text-slate-500">
              Você ainda não criou categorias. Use o botão “Organizar em categorias” na lista.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Rendimento da receita ---------- */}
      <div className="mb-7 rounded-2xl border-2 border-sky-200 bg-sky-50 p-5">
        <label htmlFor="rendimento-prato" className="mb-1.5 block text-lg font-bold text-sky-900">
          Esta receita rende quanto?
          <Dica texto="Faça a receita uma vez e diga o que ela produz. Ex: 10 coxinhas, 1 kg de macarrão, 4 marmitas. O sistema divide o custo dos ingredientes por esse número para achar o custo de cada unidade que você vende." />
        </label>
        <p className="mb-4 text-base text-sky-900">
          Ex: uma receita de coxinha rende <strong>10 porções</strong>. Uma massa rende{" "}
          <strong>1 kg</strong>.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="rendimento-prato" className={rotulo}>
              Quantidade
            </label>
            <input
              id="rendimento-prato"
              inputMode="decimal"
              className={`${campo} w-40`}
              placeholder="Ex: 10"
              value={rendimentoTexto}
              onChange={(e) => setRendimentoTexto(e.target.value)}
              disabled={salvando}
            />
          </div>

          <div>
            <label htmlFor="unidade-rendimento" className={rotulo}>
              De quê?
            </label>
            <select
              id="unidade-rendimento"
              className={`${campo} w-56`}
              value={unidadeRendimento}
              onChange={(e) => setUnidadeRendimento(e.target.value as Unidade)}
              disabled={salvando}
            >
              {UNIDADES_RENDIMENTO.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------- Receita ---------- */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">Ingredientes da receita inteira</h3>
        <p className="mt-1 text-base text-slate-600">
          Diga quanto você usa de cada ingrediente para fazer a receita{" "}
          <strong>
            toda ({rendimentoTexto || "1"}{" "}
            {unidadeRendimento === "un" ? "porções" : unidadeRendimento})
          </strong>{" "}
          — não para uma porção só.
        </p>
      </div>

      <div className="space-y-3">
        {linhas.map((linha, indice) => {
          const insumo = insumosPorId.get(linha.insumoId);
          const custoLinha = calculo.custosPorLinha[indice] ?? 0;

          return (
            <div
              key={linha.chave}
              className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_170px_120px_auto]"
            >
              <div>
                <label className={rotulo} htmlFor={`insumo-${linha.chave}`}>
                  Ingrediente
                </label>
                <select
                  id={`insumo-${linha.chave}`}
                  className={campo}
                  value={linha.insumoId}
                  onChange={(e) => atualizarLinha(linha.chave, { insumoId: e.target.value })}
                  disabled={salvando}
                >
                  <option value="">Escolha um insumo...</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome} ({i.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={rotulo} htmlFor={`qtd-${linha.chave}`}>
                  Quantidade {insumo ? `(${insumo.unidade})` : ""}
                </label>
                <input
                  id={`qtd-${linha.chave}`}
                  inputMode="decimal"
                  className={campo}
                  placeholder={insumo ? `Ex: 0,2 ${insumo.unidade}` : "Ex: 0,2"}
                  value={linha.quantidade}
                  onChange={(e) => atualizarLinha(linha.chave, { quantidade: e.target.value })}
                  disabled={salvando}
                />
              </div>

              {/* Custo parcial, atualizado enquanto digita */}
              <div className="text-right">
                <span className={rotulo}>Custo</span>
                <p className="py-3 text-lg font-extrabold text-massa-700">
                  {formatarMoeda(custoLinha)}
                </p>
              </div>

              <div className="flex justify-end pb-1">
                <button
                  type="button"
                  className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                  onClick={() => removerLinha(linha.chave)}
                  disabled={salvando || linhas.length === 1}
                  aria-label="Remover ingrediente"
                  title="Remover este ingrediente"
                >
                  <Trash2 size={19} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={`${botaoSecundario} mt-4`}
        onClick={adicionarLinha}
        disabled={salvando}
      >
        <Plus size={22} /> Adicionar ingrediente
      </button>

      {/* ---------- Resumo dos custos ---------- */}
      <div className="mt-7 space-y-2 rounded-2xl bg-massa-50 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg text-slate-700">Custo total de insumos (receita inteira):</span>
          <span className="text-2xl font-extrabold text-massa-800">
            {formatarMoeda(calculo.custoDaReceita)}
          </span>
        </div>

        {/* A divisão pelo rendimento, escrita por extenso para ficar óbvia */}
        <div className="flex items-baseline justify-between gap-4 border-t border-massa-200 pt-2">
          <span className="text-lg text-slate-700">
            Dividido por {formatarNumero(calculo.rendimento, 3)}{" "}
            {unidadeRendimento === "un"
              ? calculo.rendimento === 1
                ? "porção"
                : "porções"
              : unidadeRendimento}{" "}
            = insumos por {nomeUnidade}:
          </span>
          <span className="text-2xl font-extrabold text-massa-800">
            {formatarMoeda(calculo.custoInsumos)}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg text-slate-700">
            Contas da casa ({formatarPorcentagem(percentualFixo)} do preço):
            <Dica texto="É a parte do aluguel, gás, luz, equipe e outros custos que cabe a esta venda. Como o rateio é por porcentagem, quanto mais caro o item, mais ele ajuda a pagar as contas. Você define isso em “Custos da Casa”." />
          </span>
          <span className="text-lg font-bold text-slate-700">
            {formatarMoeda(calculo.custoOperacional)}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-massa-200 pt-2">
          <span className="text-lg font-bold text-slate-800">
            Custo total de 1 {nomeUnidade}:
          </span>
          <span className="text-2xl font-extrabold text-slate-900">
            {formatarMoeda(calculo.custoTotal)}
          </span>
        </div>
      </div>

      {/* ---------- Preço de venda + margem ---------- */}
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="preco-venda" className={rotulo}>
            Preço de venda por {nomeUnidade} (R$)
            <Dica texto="É o preço que já está no seu cardápio hoje, por unidade vendida. Se ainda não tem, coloque quanto você pensa em cobrar." />
          </label>
          <input
            id="preco-venda"
            inputMode="decimal"
            className={campo}
            placeholder="Ex: 32,00"
            value={precoVendaTexto}
            onChange={(e) => setPrecoVendaTexto(e.target.value)}
            disabled={salvando}
          />
        </div>

        <div className="rounded-2xl border-2 border-slate-200 p-5">
          <p className="text-base font-medium text-slate-500">Sua margem de lucro real</p>
          <p className={`text-4xl font-extrabold ${coresMargem[calculo.situacao]}`}>
            {formatarPorcentagem(calculo.margem)}
          </p>
          <p className="mt-1 text-base text-slate-600">
            Sobram <strong>{formatarMoeda(calculo.lucro)}</strong> a cada {nomeUnidade} vendida.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sua meta é {formatarPorcentagem(margemDesejada, 0)}.
          </p>
        </div>
      </div>

      {/* ---------- Sugestão automática de preço ---------- */}
      {calculo.precisaAjuste && (
        <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-lg text-amber-900">
          ⚠️ Sua margem real está abaixo da desejada. Considere aumentar o preço para{" "}
          <strong>{formatarMoeda(calculo.sugerido)}</strong> para atingir a margem de{" "}
          {formatarPorcentagem(margemDesejada, 0)}.
        </div>
      )}

      {calculo.margem < 0 && calculo.precoVenda > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4 text-lg text-red-900">
          🚨 Atenção: neste preço você está <strong>perdendo dinheiro</strong> a cada prato vendido.
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" className={botaoSecundario} onClick={aoFechar} disabled={salvando}>
          Cancelar
        </button>
        <button type="submit" className={botaoPrimario} disabled={salvando}>
          {salvando ? (
            <>
              <Loader2 className="animate-spin" size={22} /> Salvando...
            </>
          ) : (
            "Salvar prato"
          )}
        </button>
      </div>
    </form>
  );
}
