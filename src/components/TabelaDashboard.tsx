"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { atualizarPrecoVenda } from "@/app/actions/pratos";
import CampoBusca from "@/components/CampoBusca";
import Paginacao from "@/components/Paginacao";
import SeloCategoria from "@/components/SeloCategoria";
import { calcularLinha, type LinhaCalculada } from "@/lib/calculos";
import type { Categoria } from "@/lib/types";
import { usarListaPaginada } from "@/lib/usarListaPaginada";
import {
  formatarMoeda,
  formatarNumero,
  formatarPorcentagem,
  paraCampo,
  paraNumero,
} from "@/lib/formatar";

interface Props {
  linhas: LinhaCalculada[];
  margemDesejada: number;
  /**
   * Percentual do preço que vai para as contas da casa.
   * ATENÇÃO: é percentual, não valor em reais — é o que calcularLinha espera.
   */
  percentualFixo: number;
  categorias: Categoria[];
}

/** Filtros rápidos de cima da tabela. */
type Filtro = "todos" | "prejuizo" | "abaixo" | "semPreco";
/** Como a lista é ordenada. */
type Ordem = "pior" | "melhor" | "lucro" | "nome";

const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: "pior", rotulo: "Pior margem primeiro" },
  { valor: "melhor", rotulo: "Melhor margem primeiro" },
  { valor: "lucro", rotulo: "Maior lucro primeiro" },
  { valor: "nome", rotulo: "Nome (A a Z)" },
];

/** "10 porções", "1 kg" — o texto que aparece do lado do rendimento. */
function rotuloUnidade(unidade: string, quantidade: number): string {
  if (unidade !== "un") return unidade;
  return quantidade === 1 ? "porção" : "porções";
}

/** Cores da margem: verde (bom), amarelo (atenção), vermelho (prejuízo). */
const CORES = {
  boa: { texto: "text-emerald-700", barra: "bg-emerald-500", fundo: "bg-emerald-50" },
  atencao: { texto: "text-amber-700", barra: "bg-amber-500", fundo: "bg-amber-50" },
  prejuizo: { texto: "text-red-700", barra: "bg-red-500", fundo: "bg-red-50" },
} as const;

export default function TabelaDashboard({
  linhas,
  margemDesejada,
  percentualFixo,
  categorias,
}: Props) {
  // Cópia local para atualizar a tela na hora, antes mesmo do servidor responder
  const [dados, setDados] = useState<LinhaCalculada[]>(linhas);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("pior");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const categoriaPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  /** Quantos pratos há em cada situação (para os números dos botões). */
  const contagem = useMemo(
    () => ({
      todos: dados.length,
      prejuizo: dados.filter((l) => l.situacao === "prejuizo").length,
      abaixo: dados.filter((l) => l.situacao === "atencao").length,
      semPreco: dados.filter((l) => l.precoVenda <= 0).length,
    }),
    [dados]
  );

  /** Aplica os filtros (situação e categoria) e depois ordena. */
  const preparados = useMemo(() => {
    const filtrados = dados.filter((l) => {
      // Filtro por categoria
      if (categoriaFiltro === "sem" && l.categoriaId) return false;
      if (categoriaFiltro && categoriaFiltro !== "sem" && l.categoriaId !== categoriaFiltro) {
        return false;
      }
      // Filtro por situação
      if (filtro === "prejuizo") return l.situacao === "prejuizo";
      if (filtro === "abaixo") return l.situacao === "atencao";
      if (filtro === "semPreco") return l.precoVenda <= 0;
      return true;
    });

    const ordenados = [...filtrados];
    if (ordem === "pior") ordenados.sort((a, b) => a.margem - b.margem);
    else if (ordem === "melhor") ordenados.sort((a, b) => b.margem - a.margem);
    else if (ordem === "lucro") ordenados.sort((a, b) => b.lucro - a.lucro);
    else ordenados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return ordenados;
  }, [dados, filtro, ordem, categoriaFiltro]);

  // Busca + paginação (a tabela pode ter mais de cem pratos)
  const lista = usarListaPaginada(preparados, (linha) => linha.nome);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quando o servidor devolve dados novos (após salvar algo), sincronizamos
  useEffect(() => {
    setDados(linhas);
  }, [linhas]);

  useEffect(() => {
    if (editandoId) inputRef.current?.select();
  }, [editandoId]);

  function comecarEdicao(linha: LinhaCalculada) {
    setEditandoId(linha.id);
    setRascunho(paraCampo(linha.precoVenda));
  }

  async function salvar(linha: LinhaCalculada) {
    const novoPreco = paraNumero(rascunho);
    setEditandoId(null);

    // Não mudou nada: não precisa ir ao servidor
    if (novoPreco === linha.precoVenda) return;

    if (novoPreco < 0) {
      toast.error("Opa! O preço precisa ser um número positivo.");
      return;
    }

    // Recalcula na hora (otimista) usando as MESMAS funções do servidor.
    // Passamos o custo da RECEITA e o rendimento, igual o servidor faz.
    const recalculada = calcularLinha(
      {
        id: linha.id,
        nome: linha.nome,
        precoVenda: novoPreco,
        rendimento: linha.rendimento,
        unidadeRendimento: linha.unidadeRendimento,
      },
      linha.custoReceita,
      percentualFixo,
      margemDesejada
    );
    setDados((atual) => atual.map((l) => (l.id === linha.id ? recalculada : l)));

    setSalvandoId(linha.id);
    const resultado = await atualizarPrecoVenda(linha.id, novoPreco);
    setSalvandoId(null);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
    } else {
      toast.error(resultado.mensagem);
      setDados(linhas); // desfaz a mudança otimista
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Meus pratos, prato por prato</h2>
          <p className="mt-1 text-base text-slate-600">
            Clique no <strong>preço de venda</strong> para trocar o valor. É só digitar e apertar
            Enter.
          </p>
        </div>

        <CampoBusca
          valor={lista.busca}
          aoMudar={lista.definirBusca}
          placeholder="Procurar um prato pelo nome..."
          resumo={
            lista.totalFiltrado === 0
              ? "Nenhum prato encontrado"
              : `Mostrando ${lista.primeiro} a ${lista.ultimo} de ${lista.totalFiltrado}${
                  lista.buscando ? ` (de ${lista.total} no total)` : ""
                }`
          }
        />

        {/* ---------- Filtros rápidos ---------- */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-base font-semibold text-slate-700">Ver só:</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["todos", "Todos", contagem.todos, "bg-slate-700"],
                  ["prejuizo", "Dando prejuízo", contagem.prejuizo, "bg-red-600"],
                  ["abaixo", "Abaixo da meta", contagem.abaixo, "bg-amber-600"],
                  ["semPreco", "Sem preço", contagem.semPreco, "bg-sky-600"],
                ] as [Filtro, string, number, string][]
              ).map(([chave, rotulo, quantos, cor]) => (
                <button
                  key={chave}
                  type="button"
                  onClick={() => {
                    setFiltro(chave);
                    lista.irPara(1);
                  }}
                  aria-pressed={filtro === chave}
                  className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-base font-semibold transition focus:outline-none focus:ring-4 focus:ring-massa-200 ${
                    filtro === chave
                      ? `${cor} border-transparent text-white`
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {rotulo}
                  <span
                    className={`rounded-full px-2 py-0.5 text-sm font-bold ${
                      filtro === chave ? "bg-white/25" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {quantos}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {categorias.length > 0 && (
              <div>
                <label
                  htmlFor="categoria-dash"
                  className="mb-2 block text-base font-semibold text-slate-700"
                >
                  Categoria:
                </label>
                <select
                  id="categoria-dash"
                  value={categoriaFiltro}
                  onChange={(e) => {
                    setCategoriaFiltro(e.target.value);
                    lista.irPara(1);
                  }}
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 outline-none focus:border-massa-500 focus:ring-4 focus:ring-massa-100"
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                  <option value="sem">Sem categoria</option>
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="ordenar"
                className="mb-2 block text-base font-semibold text-slate-700"
              >
                Ordenar por:
              </label>
              <select
                id="ordenar"
                value={ordem}
                onChange={(e) => {
                  setOrdem(e.target.value as Ordem);
                  lista.irPara(1);
                }}
                className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 outline-none focus:border-massa-500 focus:ring-4 focus:ring-massa-100"
              >
                {ORDENS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3 font-semibold">Prato</th>
              <th className="px-4 py-3 text-right font-semibold">Insumos</th>
              <th className="px-4 py-3 text-right font-semibold">
                Contas da casa
                <span className="block text-xs font-normal normal-case text-slate-400">
                  {formatarPorcentagem(percentualFixo)} do preço
                </span>
              </th>
              <th className="px-4 py-3 text-right font-semibold">Custo total</th>
              <th className="px-4 py-3 text-right font-semibold">Preço de venda</th>
              <th className="px-4 py-3 font-semibold">Margem real</th>
              <th className="px-6 py-3 text-right font-semibold">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.visiveis.map((linha) => {
              const cor = CORES[linha.situacao];
              const larguraBarra = Math.min(Math.max(linha.margem, 0), 100);

              return (
                <tr key={linha.id} className="transition hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <span className="block text-lg font-bold text-slate-900">{linha.nome}</span>
                    <span className="mb-1 mt-0.5 block">
                      <SeloCategoria
                        categoria={
                          linha.categoriaId ? categoriaPorId.get(linha.categoriaId) : undefined
                        }
                      />
                    </span>
                    {/* Deixa claro que os valores da linha são por unidade vendida */}
                    <span className="text-sm text-slate-500">
                      receita rende {formatarNumero(linha.rendimento, 3)}{" "}
                      {rotuloUnidade(linha.unidadeRendimento, linha.rendimento)} ·{" "}
                      {formatarMoeda(linha.custoReceita)} de insumos
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right text-lg text-slate-700">
                    {formatarMoeda(linha.custoInsumos)}
                  </td>

                  <td className="px-4 py-4 text-right text-lg text-slate-700">
                    {formatarMoeda(linha.custoOperacional)}
                  </td>

                  <td className="px-4 py-4 text-right text-lg font-bold text-slate-900">
                    {formatarMoeda(linha.custoTotal)}
                  </td>

                  {/* ----- Preço editável direto na tabela ----- */}
                  <td className="px-4 py-4 text-right">
                    {editandoId === linha.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-lg text-slate-500">R$</span>
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="decimal"
                          value={rascunho}
                          onChange={(e) => setRascunho(e.target.value)}
                          onBlur={() => salvar(linha)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              salvar(linha);
                            }
                            if (e.key === "Escape") setEditandoId(null);
                          }}
                          className="w-28 rounded-lg border-2 border-massa-500 px-3 py-1.5 text-right text-lg font-bold text-slate-900 outline-none ring-4 ring-massa-100"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => comecarEdicao(linha)}
                          title="Clique para mudar o preço"
                          className="group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-lg font-bold text-slate-900 transition hover:bg-massa-50"
                        >
                          {salvandoId === linha.id ? (
                            <Loader2 size={18} className="animate-spin text-massa-600" />
                          ) : (
                            <Pencil
                              size={16}
                              className="text-slate-400 transition group-hover:text-massa-600"
                            />
                          )}
                          {formatarMoeda(linha.precoVenda)}
                        </button>

                        {/* Tag azul com o preço sugerido */}
                        {linha.precisaAjuste && (
                          <span
                            title={`Cobrando ${formatarMoeda(
                              linha.precoSugerido
                            )} você atinge a margem de ${formatarPorcentagem(margemDesejada, 0)}.`}
                            className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800"
                          >
                            Sugerido: {formatarMoeda(linha.precoSugerido)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* ----- Margem com barra colorida ----- */}
                  <td className="px-4 py-4">
                    <div className="min-w-[150px]">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className={`text-lg font-extrabold ${cor.texto}`}>
                          {formatarPorcentagem(linha.margem)}
                        </span>
                        {linha.situacao === "boa" && (
                          <Check size={18} className="text-emerald-600" />
                        )}
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${cor.barra}`}
                          style={{ width: `${linha.margem < 0 ? 100 : larguraBarra}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {linha.situacao === "prejuizo"
                          ? "Você está tendo prejuízo neste prato"
                          : linha.situacao === "atencao"
                            ? `Abaixo da sua meta de ${formatarPorcentagem(margemDesejada, 0)}`
                            : "Dentro da sua meta"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span className={`text-lg font-extrabold ${cor.texto}`}>
                      {formatarMoeda(linha.lucro)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lista.totalFiltrado === 0 && (
        <div className="px-6 py-14 text-center">
          <p className="text-2xl font-bold text-slate-800">Nenhum prato aqui</p>
          <p className="mt-3 text-lg text-slate-600">
            {lista.buscando ? (
              <>
                Não achamos nada com <strong>“{lista.busca}”</strong>. Tente escrever de outro jeito.
              </>
            ) : filtro === "prejuizo" ? (
              "Nenhum prato está dando prejuízo. Muito bem!"
            ) : filtro === "abaixo" ? (
              "Nenhum prato está abaixo da sua meta de lucro. Parabéns!"
            ) : (
              "Todos os seus pratos já têm preço cadastrado."
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              lista.definirBusca("");
              setFiltro("todos");
            }}
            className="mt-5 text-lg font-semibold text-massa-700 underline underline-offset-2 hover:text-massa-800"
          >
            Ver todos os pratos
          </button>
        </div>
      )}

      <Paginacao
        paginaAtual={lista.paginaAtual}
        totalPaginas={lista.totalPaginas}
        aoTrocar={lista.irPara}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" /> Lucro dentro da meta
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" /> Lucrando, mas abaixo da meta
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" /> Prejuízo
        </span>
      </div>
    </div>
  );
}
