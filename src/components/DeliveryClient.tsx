"use client";

import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { excluirCanal, salvarCanal, usarCanaisSugeridos } from "@/app/actions/canais";
import CampoBusca from "@/components/CampoBusca";
import ConfirmarExclusao from "@/components/ConfirmarExclusao";
import Dica from "@/components/Dica";
import Modal from "@/components/Modal";
import Paginacao from "@/components/Paginacao";
import { custoFixoDaUnidade, margemReal, precoQueFechaAConta } from "@/lib/calculos";
import {
  botaoIcone,
  botaoPrimario,
  botaoSecundario,
  campo,
  cartao,
  rotulo,
} from "@/lib/estilos";
import { formatarMoeda, formatarPorcentagem, paraCampo, paraNumero } from "@/lib/formatar";
import { usarListaPaginada } from "@/lib/usarListaPaginada";
import type { CanalVenda, Categoria } from "@/lib/types";

interface Item {
  id: string;
  nome: string;
  categoriaId?: string;
  precoVenda: number;
  unidadeRendimento: string;
  custoInsumos: number;
}

interface Props {
  canais: CanalVenda[];
  categorias: Categoria[];
  itens: Item[];
  percentualFixo: number;
  margemDesejada: number;
  faturamentoInformado: boolean;
}

const FORM_VAZIO = { id: "", nome: "", taxaPercentual: "", taxaFixa: "" };

export default function DeliveryClient({
  canais,
  categorias,
  itens,
  percentualFixo,
  margemDesejada,
  faturamentoInformado,
}: Props) {
  const router = useRouter();
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<CanalVenda | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  /** Qual lucro o preço do app deve devolver: o de hoje ou a meta. */
  const [base, setBase] = useState<"hoje" | "meta">("hoje");

  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const itensFiltrados = useMemo(() => {
    if (!categoriaFiltro) return itens;
    if (categoriaFiltro === "sem") return itens.filter((i) => !i.categoriaId);
    return itens.filter((i) => i.categoriaId === categoriaFiltro);
  }, [itens, categoriaFiltro]);

  const lista = usarListaPaginada(itensFiltrados, (i) => i.nome);

  /**
   * ---------------------------------------------------------------
   * O CÁLCULO DESTA TELA
   * ---------------------------------------------------------------
   * A ideia é simples: o dono não quer ganhar menos por vender pelo
   * aplicativo. Então descobrimos a margem que ele JÁ TEM no balcão e
   * procuramos, para cada app, o preço que devolve essa MESMA margem
   * depois de descontada a comissão.
   *
   * Quando o produto ainda não tem preço (ou está no prejuízo), não há
   * margem para "manter" — nesse caso usamos a meta de lucro dele.
   */
  const linhas = useMemo(() => {
    return lista.visiveis.map((item) => {
      // O que ele ganha hoje, vendendo no balcão pelo preço atual
      const contasHoje = custoFixoDaUnidade(item.precoVenda, percentualFixo);
      const custoTotalHoje = item.custoInsumos + contasHoje;
      const margemHoje = margemReal(item.precoVenda, custoTotalHoje);

      // Dá para manter a margem de hoje? Só se ela existir e for positiva.
      const podeManter = base === "hoje" && item.precoVenda > 0 && margemHoje > 0;
      const margemAlvo = podeManter ? margemHoje : margemDesejada;

      const precosPorCanal = canais.map((canal) =>
        precoQueFechaAConta(
          item.custoInsumos,
          {
            custoFixo: percentualFixo,
            margem: margemAlvo,
            taxaCanal: canal.taxaPercentual,
          },
          canal.taxaFixa
        )
      );

      return { item, margemHoje, margemAlvo, usouMeta: !podeManter, precosPorCanal };
    });
  }, [lista.visiveis, canais, percentualFixo, margemDesejada, base]);

  /**
   * Pega um produto real da lista para explicar a tabela por extenso.
   * Escolhemos um que tenha preço e lucro positivo, e o canal de maior taxa,
   * que é onde a diferença fica mais visível.
   */
  const exemplo = useMemo(() => {
    const canalCaro = [...canais].sort((a, b) => b.taxaPercentual - a.taxaPercentual)[0];
    if (!canalCaro || canalCaro.taxaPercentual <= 0) return null;

    const escolhida = linhas.find((l) => l.item.precoVenda > 0 && l.margemHoje > 0);
    if (!escolhida) return null;

    const indice = canais.findIndex((c) => c.id === canalCaro.id);
    const precoCaro = escolhida.precosPorCanal[indice];
    if (!precoCaro) return null;

    return { item: escolhida.item, margemHoje: escolhida.margemHoje, canalCaro, precoCaro };
  }, [linhas, canais]);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setFormAberto(true);
  }

  function abrirEdicao(canal: CanalVenda) {
    setForm({
      id: canal.id,
      nome: canal.nome,
      taxaPercentual: paraCampo(canal.taxaPercentual, 2),
      taxaFixa: paraCampo(canal.taxaFixa),
    });
    setFormAberto(true);
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const resultado = await salvarCanal({
      id: form.id || undefined,
      nome: form.nome,
      taxaPercentual: paraNumero(form.taxaPercentual),
      taxaFixa: paraNumero(form.taxaFixa),
    });
    setSalvando(false);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
      setFormAberto(false);
      setForm(FORM_VAZIO);
      router.refresh();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  async function adicionarSugeridos() {
    setSugerindo(true);
    const resultado = await usarCanaisSugeridos();
    setSugerindo(false);
    if (resultado.ok) {
      toast.success(resultado.mensagem);
      router.refresh();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    const resultado = await excluirCanal(paraExcluir.id);
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
    <div className="space-y-6">
      {/* ================= ONDE EU VENDO ================= */}
      <section className={cartao}>
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Onde eu vendo</h2>
        <p className="mb-5 text-base text-slate-600">
          Anote quanto cada lugar cobra de você. A taxa está no seu contrato com o aplicativo, ou
          no extrato de repasse.
        </p>

        {canais.length === 0 && !formAberto && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-8 text-center">
            <p className="text-lg text-slate-600">
              Você ainda não cadastrou nenhum lugar de venda.
            </p>
            <button
              type="button"
              className={`${botaoPrimario} mt-4`}
              onClick={adicionarSugeridos}
              disabled={sugerindo}
            >
              {sugerindo ? (
                <>
                  <Loader2 className="animate-spin" size={22} /> Cadastrando...
                </>
              ) : (
                <>
                  <Sparkles size={22} /> Cadastrar os mais comuns
                </>
              )}
            </button>
            <p className="mt-3 text-base text-slate-500">
              Cadastra balcão, iFood e 99Food com as taxas mais usadas. Você ajusta depois.
            </p>
          </div>
        )}

        {canais.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
                  <th className="py-3 font-semibold">Onde vendo</th>
                  <th className="py-3 text-right font-semibold">Taxa do app</th>
                  <th className="py-3 text-right font-semibold">Taxa fixa</th>
                  <th className="py-3 text-right font-semibold">
                    De cada R$ 100, você recebe
                  </th>
                  <th className="py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {canais.map((canal) => {
                  // Quanto do que o cliente paga realmente chega até você
                  const recebe = Math.max(100 - canal.taxaPercentual, 0);
                  return (
                    <tr key={canal.id}>
                      <td className="py-4 text-lg font-bold text-slate-900">{canal.nome}</td>
                      <td className="py-4 text-right text-lg text-slate-900">
                        {formatarPorcentagem(canal.taxaPercentual)}
                      </td>
                      <td className="py-4 text-right text-lg text-slate-700">
                        {canal.taxaFixa > 0 ? formatarMoeda(canal.taxaFixa) : "—"}
                      </td>
                      <td className="py-4 text-right">
                        <span
                          className={`text-lg font-bold ${
                            canal.taxaPercentual > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {formatarMoeda(recebe)}
                        </span>
                        {canal.taxaFixa > 0 && (
                          <span className="block text-sm text-slate-500">
                            menos {formatarMoeda(canal.taxaFixa)} por pedido
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={botaoIcone}
                            onClick={() => abrirEdicao(canal)}
                            aria-label={`Editar ${canal.nome}`}
                            title="Editar"
                          >
                            <Pencil size={19} />
                          </button>
                          <button
                            type="button"
                            className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                            onClick={() => setParaExcluir(canal)}
                            aria-label={`Excluir ${canal.nome}`}
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

        {canais.length > 0 && (
          <button type="button" className={`${botaoSecundario} mt-5`} onClick={abrirNovo}>
            <Plus size={22} /> Adicionar outro lugar de venda
          </button>
        )}

        {/* ---------- Janela de edição do canal ---------- */}
        <Modal
          aberto={formAberto}
          titulo={form.id ? `Editar “${form.nome || "canal"}”` : "Novo lugar de venda"}
          descricao="A taxa está no seu contrato com o aplicativo ou no extrato de repasse."
          travado={salvando}
          aoFechar={() => setFormAberto(false)}
        >
          <form onSubmit={enviar} noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="nome-canal" className={rotulo}>
                  Nome
                </label>
                <input
                  id="nome-canal"
                  className={campo}
                  placeholder="Ex: iFood"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  disabled={salvando}
                />
              </div>
              <div>
                <label htmlFor="taxa-canal" className={rotulo}>
                  Taxa (%)
                  <Dica texto="Quanto o aplicativo fica de cada venda. No iFood costuma ser 27% quando a entrega é do app e 12% quando a entrega é sua." />
                </label>
                <input
                  id="taxa-canal"
                  inputMode="decimal"
                  className={campo}
                  placeholder="Ex: 27"
                  value={form.taxaPercentual}
                  onChange={(e) => setForm({ ...form, taxaPercentual: e.target.value })}
                  disabled={salvando}
                />
              </div>
              <div>
                <label htmlFor="taxa-fixa" className={rotulo}>
                  Taxa fixa (R$)
                  <Dica texto="Alguns aplicativos cobram um valor fixo por pedido, além da porcentagem. Se não cobram, deixe 0." />
                </label>
                <input
                  id="taxa-fixa"
                  inputMode="decimal"
                  className={campo}
                  placeholder="0,00"
                  value={form.taxaFixa}
                  onChange={(e) => setForm({ ...form, taxaFixa: e.target.value })}
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                className={botaoSecundario}
                onClick={() => setFormAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button type="submit" className={botaoPrimario} disabled={salvando}>
                {salvando ? (
                  <>
                    <Loader2 className="animate-spin" size={22} /> Salvando...
                  </>
                ) : (
                  "Salvar canal"
                )}
              </button>
            </div>
          </form>
        </Modal>
      </section>

      {/* ================= AVISOS ================= */}
      {!faturamentoInformado && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 py-5 text-lg text-amber-900">
          ⚠️ Você ainda não informou o <strong>faturamento do mês</strong> em “Custos da Casa”.
          Sem ele, os preços abaixo cobrem só os ingredientes, a sua margem e a taxa do
          aplicativo — <strong>não incluem aluguel, gás, luz e equipe</strong>.
        </div>
      )}

      {/* ================= PREÇOS POR CANAL ================= */}
      {canais.length > 0 && itens.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Por quanto vender em cada lugar
              </h2>
              <p className="mt-1 text-base text-slate-600">
                O aplicativo fica com uma parte da venda. Para você{" "}
                <strong>não ganhar menos por isso</strong>, o preço no app precisa ser maior. É esse
                preço que aparece abaixo — já com ingredientes, contas da casa (
                {formatarPorcentagem(percentualFixo)}) e o seu lucro.
              </p>
            </div>

            {/* Escolha do que o preço deve preservar */}
            <fieldset className="rounded-xl border-2 border-slate-200 bg-white p-4">
              <legend className="px-2 text-base font-bold text-slate-700">
                O preço no aplicativo deve me dar:
              </legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-start gap-2 text-base text-slate-700">
                  <input
                    type="radio"
                    name="base"
                    className="mt-1 h-5 w-5 accent-massa-600"
                    checked={base === "hoje"}
                    onChange={() => setBase("hoje")}
                  />
                  <span>
                    <strong>O mesmo lucro que tenho no balcão</strong>
                    <span className="block text-sm text-slate-500">
                      Mantém, em cada app, a margem que você já pratica hoje.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2 text-base text-slate-700">
                  <input
                    type="radio"
                    name="base"
                    className="mt-1 h-5 w-5 accent-massa-600"
                    checked={base === "meta"}
                    onChange={() => setBase("meta")}
                  />
                  <span>
                    <strong>
                      A minha meta de {formatarPorcentagem(margemDesejada, 0)} de lucro
                    </strong>
                    <span className="block text-sm text-slate-500">
                      Ignora o preço de hoje e busca a meta em todo lugar.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Um exemplo por extenso, com o primeiro produto da lista */}
            {exemplo && (
              <p className="rounded-xl bg-white px-5 py-4 text-base leading-relaxed text-slate-700">
                <strong>Como ler:</strong> você vende {exemplo.item.nome.toLowerCase()} a{" "}
                <strong>{formatarMoeda(exemplo.item.precoVenda)}</strong> no balcão e fica com{" "}
                <strong>{formatarPorcentagem(exemplo.margemHoje)}</strong> de lucro. Para ganhar
                esse mesmo tanto no {exemplo.canalCaro.nome} — que fica com{" "}
                {formatarPorcentagem(exemplo.canalCaro.taxaPercentual)} da venda — você precisa
                cobrar <strong>{formatarMoeda(exemplo.precoCaro)}</strong> lá.
              </p>
            )}

            {categorias.length > 0 && (
              <div>
                <label
                  htmlFor="categoria-delivery"
                  className="mb-2 block text-base font-semibold text-slate-700"
                >
                  Ver só a categoria:
                </label>
                <select
                  id="categoria-delivery"
                  value={categoriaFiltro}
                  onChange={(e) => {
                    setCategoriaFiltro(e.target.value);
                    lista.irPara(1);
                  }}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-700 outline-none focus:border-massa-500 focus:ring-4 focus:ring-massa-100 sm:w-auto"
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

            <CampoBusca
              valor={lista.busca}
              aoMudar={lista.definirBusca}
              placeholder="Procurar um produto pelo nome..."
              resumo={
                lista.totalFiltrado === 0
                  ? "Nenhum produto encontrado"
                  : `Mostrando ${lista.primeiro} a ${lista.ultimo} de ${lista.totalFiltrado}`
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: `${420 + canais.length * 150}px` }}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 text-right font-semibold">Ingredientes</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Balcão hoje
                    <span className="block text-xs font-normal normal-case text-slate-400">
                      preço e lucro atual
                    </span>
                  </th>
                  {canais.map((canal) => (
                    <th key={canal.id} className="px-4 py-3 text-right font-semibold">
                      {canal.nome}
                      <span className="block text-xs font-normal normal-case text-slate-400">
                        {canal.taxaPercentual > 0
                          ? `app fica com ${formatarPorcentagem(canal.taxaPercentual)}`
                          : "sem taxa"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map(({ item, margemHoje, margemAlvo, usouMeta, precosPorCanal }) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <span className="block text-lg font-bold text-slate-900">{item.nome}</span>
                      <span className="text-sm text-slate-500">
                        preço por{" "}
                        {item.unidadeRendimento === "un" ? "unidade" : item.unidadeRendimento}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right text-lg text-slate-700">
                      {formatarMoeda(item.custoInsumos)}
                    </td>

                    {/* Referência: o que ele cobra e ganha hoje no balcão */}
                    <td className="px-4 py-4 text-right">
                      {item.precoVenda > 0 ? (
                        <>
                          <span className="block text-lg font-bold text-slate-900">
                            {formatarMoeda(item.precoVenda)}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              margemHoje < 0
                                ? "text-red-600"
                                : margemHoje >= margemDesejada
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                            }`}
                          >
                            lucro de {formatarPorcentagem(margemHoje)}
                          </span>
                        </>
                      ) : (
                        <span className="text-base text-slate-400">sem preço</span>
                      )}
                    </td>

                    {/* Preço em cada app que devolve a mesma margem */}
                    {precosPorCanal.map((preco, i) => {
                      const canal = canais[i];
                      const diferenca = item.precoVenda > 0 ? preco - item.precoVenda : 0;
                      return (
                        <td key={canal.id} className="px-4 py-4 text-right">
                          {preco === 0 ? (
                            <span className="text-base font-semibold text-red-600">
                              impossível
                            </span>
                          ) : (
                            <>
                              <span className="block text-lg font-extrabold text-sky-700">
                                {formatarMoeda(preco)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {diferenca > 0.004
                                  ? `+${formatarMoeda(diferenca)}`
                                  : "igual ao balcão"}
                              </span>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lista.totalFiltrado === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="text-2xl font-bold text-slate-800">Nenhum produto encontrado</p>
              <button
                type="button"
                onClick={() => lista.definirBusca("")}
                className="mt-4 text-lg font-semibold text-massa-700 underline underline-offset-2"
              >
                Ver todos
              </button>
            </div>
          )}

          <Paginacao
            paginaAtual={lista.paginaAtual}
            totalPaginas={lista.totalPaginas}
            aoTrocar={lista.irPara}
          />
        </section>
      )}

      <ConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Tem certeza?"
        descricao={`Tem certeza que deseja excluir "${paraExcluir?.nome ?? ""}"? Essa ação não pode ser desfeita.`}
        processando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}
