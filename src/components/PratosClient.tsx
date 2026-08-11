"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { excluirPrato } from "@/app/actions/pratos";
import CampoBusca from "@/components/CampoBusca";
import ConfirmarExclusao from "@/components/ConfirmarExclusao";
import GerenciarCategorias from "@/components/GerenciarCategorias";
import Modal from "@/components/Modal";
import Paginacao from "@/components/Paginacao";
import PratoForm from "@/components/PratoForm";
import SeloCategoria from "@/components/SeloCategoria";
import { usarListaPaginada } from "@/lib/usarListaPaginada";
import { calcularLinha } from "@/lib/calculos";
import { botaoIcone, botaoPrimario } from "@/lib/estilos";
import { formatarMoeda, formatarNumero, formatarPorcentagem } from "@/lib/formatar";
import { CORES_CATEGORIA, type Categoria, type Insumo, type Prato } from "@/lib/types";

interface Props {
  insumos: Insumo[];
  pratos: Prato[];
  categorias: Categoria[];
  percentualFixo: number;
  margemDesejada: number;
}

const CORES = {
  boa: "bg-emerald-100 text-emerald-800",
  atencao: "bg-amber-100 text-amber-800",
  prejuizo: "bg-red-100 text-red-800",
} as const;

export default function PratosClient({
  insumos,
  pratos,
  categorias,
  percentualFixo,
  margemDesejada,
}: Props) {
  const router = useRouter();
  /** "" = todas as categorias | "sem" = só os que não têm categoria */
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Prato | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Prato | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  /** Quantos produtos há em cada categoria (mostrado no gerenciador). */
  const contagem = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const prato of pratos) {
      if (prato.categoriaId) mapa[prato.categoriaId] = (mapa[prato.categoriaId] ?? 0) + 1;
    }
    return mapa;
  }, [pratos]);

  const semCategoria = pratos.filter((p) => !p.categoriaId).length;

  const filtrados = useMemo(() => {
    if (!categoriaFiltro) return pratos;
    if (categoriaFiltro === "sem") return pratos.filter((p) => !p.categoriaId);
    return pratos.filter((p) => p.categoriaId === categoriaFiltro);
  }, [pratos, categoriaFiltro]);

  const lista = usarListaPaginada(filtrados, (p) => p.nome);

  function abrirNovo() {
    setEmEdicao(null);
    setFormAberto(true);
  }

  function abrirEdicao(prato: Prato) {
    setEmEdicao(prato);
    setFormAberto(true);
  }

  function fechar() {
    setFormAberto(false);
    setEmEdicao(null);
  }

  function depoisDeSalvar() {
    fechar();
    router.refresh();
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    const resultado = await excluirPrato(paraExcluir.id);
    setExcluindo(false);
    setParaExcluir(null);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
      router.refresh();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  return (
    <>
      <button type="button" className={botaoPrimario} onClick={abrirNovo}>
        <Plus size={22} /> Novo prato
      </button>

      <Modal
        aberto={formAberto}
        titulo={emEdicao ? `Editar “${emEdicao.nome}”` : "Novo prato"}
        descricao="Diga o que entra na receita, quanto ela rende e por quanto você vende."
        largura="grande"
        aoFechar={fechar}
      >
        <PratoForm
          // A chave força o formulário a recomeçar do zero ao trocar de prato
          key={emEdicao?.id ?? "novo"}
          insumos={insumos}
          categorias={categorias}
          prato={emEdicao}
          percentualFixo={percentualFixo}
          margemDesejada={margemDesejada}
          aoFechar={fechar}
          aoSalvar={depoisDeSalvar}
        />
      </Modal>

      {pratos.length > 0 && (
        <GerenciarCategorias
          categorias={categorias}
          contagem={contagem}
          semCategoria={semCategoria}
        />
      )}

      {/* ---------- Filtro por categoria ---------- */}
      {categorias.length > 0 && (
        <div>
          <p className="mb-2 text-base font-semibold text-slate-700">Ver por categoria:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCategoriaFiltro("");
                lista.irPara(1);
              }}
              aria-pressed={categoriaFiltro === ""}
              className={`rounded-xl border-2 px-4 py-2.5 text-base font-semibold transition ${
                categoriaFiltro === ""
                  ? "border-transparent bg-slate-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Todas ({pratos.length})
            </button>

            {categorias.map((categoria) => {
              const cor = CORES_CATEGORIA[categoria.cor] ?? CORES_CATEGORIA.cinza;
              const ativa = categoriaFiltro === categoria.id;
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => {
                    setCategoriaFiltro(categoria.id);
                    lista.irPara(1);
                  }}
                  aria-pressed={ativa}
                  className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-base font-semibold transition ${
                    ativa
                      ? `border-transparent ${cor.fundo} ${cor.texto} ring-2 ring-slate-400`
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${cor.ponto}`} />
                  {categoria.nome} ({contagem[categoria.id] ?? 0})
                </button>
              );
            })}

            {semCategoria > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCategoriaFiltro("sem");
                  lista.irPara(1);
                }}
                aria-pressed={categoriaFiltro === "sem"}
                className={`rounded-xl border-2 border-dashed px-4 py-2.5 text-base font-semibold transition ${
                  categoriaFiltro === "sem"
                    ? "border-slate-500 bg-slate-100 text-slate-800"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                Sem categoria ({semCategoria})
              </button>
            )}
          </div>
        </div>
      )}

      {pratos.length > 0 && (
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
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {pratos.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-2xl font-bold text-slate-800">Nenhum prato cadastrado ainda</p>
            <p className="mx-auto mt-3 max-w-lg text-lg text-slate-600">
              Clique em <strong>“+ Novo prato”</strong>, dê um nome e escolha os ingredientes que
              entram na receita.
            </p>
          </div>
        ) : lista.totalFiltrado === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-2xl font-bold text-slate-800">Nenhum prato encontrado</p>
            <p className="mt-3 text-lg text-slate-600">
              Não achamos nada com <strong>“{lista.busca}”</strong>. Tente escrever de outro jeito.
            </p>
            <button
              type="button"
              onClick={() => lista.definirBusca("")}
              className="mt-5 text-lg font-semibold text-massa-700 underline underline-offset-2 hover:text-massa-800"
            >
              Ver todos os pratos
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-semibold">Prato</th>
                  <th className="px-4 py-3 text-right font-semibold">Custo total</th>
                  <th className="px-4 py-3 text-right font-semibold">Preço de venda</th>
                  <th className="px-4 py-3 text-right font-semibold">Margem</th>
                  <th className="px-6 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.visiveis.map((prato) => {
                  const linha = calcularLinha(
                    prato,
                    prato.custoInsumos,
                    percentualFixo,
                    margemDesejada
                  );

                  return (
                    <tr key={prato.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-slate-900">{prato.nome}</p>
                        <p className="mb-1 mt-0.5">
                          <SeloCategoria
                            categoria={prato.categoriaId ? porId.get(prato.categoriaId) : undefined}
                          />
                        </p>
                        <p className="text-sm text-slate-500">
                          {prato.ingredientes.length}{" "}
                          {prato.ingredientes.length === 1 ? "ingrediente" : "ingredientes"} · rende{" "}
                          {formatarNumero(linha.rendimento, 3)}{" "}
                          {linha.unidadeRendimento === "un"
                            ? linha.rendimento === 1
                              ? "porção"
                              : "porções"
                            : linha.unidadeRendimento}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-slate-900">
                        {formatarMoeda(linha.custoTotal)}
                      </td>
                      <td className="px-4 py-4 text-right text-lg text-slate-900">
                        {formatarMoeda(linha.precoVenda)}
                        {linha.precisaAjuste && (
                          <span className="mt-1 block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                            Sugerido: {formatarMoeda(linha.precoSugerido)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-base font-bold ${CORES[linha.situacao]}`}
                        >
                          {formatarPorcentagem(linha.margem)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={botaoIcone}
                            onClick={() => abrirEdicao(prato)}
                            aria-label={`Editar ${prato.nome}`}
                            title="Editar"
                          >
                            <Pencil size={19} />
                          </button>
                          <button
                            type="button"
                            className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                            onClick={() => setParaExcluir(prato)}
                            aria-label={`Excluir ${prato.nome}`}
                            title="Excluir"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Paginacao
          paginaAtual={lista.paginaAtual}
          totalPaginas={lista.totalPaginas}
          aoTrocar={lista.irPara}
        />
      </div>

      <ConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Tem certeza?"
        descricao={`Tem certeza que deseja excluir "${paraExcluir?.nome ?? ""}"? Essa ação não pode ser desfeita.`}
        processando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </>
  );
}
