"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { excluirInsumo, salvarInsumo } from "@/app/actions/insumos";
import CampoBusca from "@/components/CampoBusca";
import ConfirmarExclusao from "@/components/ConfirmarExclusao";
import Dica from "@/components/Dica";
import Modal from "@/components/Modal";
import Paginacao from "@/components/Paginacao";
import { usarListaPaginada } from "@/lib/usarListaPaginada";
import { botaoIcone, botaoPrimario, botaoSecundario, campo, rotulo } from "@/lib/estilos";
import { formatarMoeda, formatarNumero, paraCampo, paraNumero } from "@/lib/formatar";
import { UNIDADES, type Insumo } from "@/lib/types";

interface Props {
  insumos: Insumo[];
}

const FORM_VAZIO = { id: "", nome: "", unidade: "kg", preco: "", rendimento: "100" };

export default function InsumosClient({ insumos }: Props) {
  const router = useRouter();
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Insumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const lista = usarListaPaginada(insumos, (i) => i.nome);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setFormAberto(true);
  }

  function abrirEdicao(insumo: Insumo) {
    setForm({
      id: insumo.id,
      nome: insumo.nome,
      unidade: insumo.unidade,
      preco: paraCampo(insumo.preco),
      rendimento: paraCampo(insumo.rendimento, 0),
    });
    setFormAberto(true);
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);

    const resultado = await salvarInsumo({
      id: form.id || undefined,
      nome: form.nome,
      unidade: form.unidade,
      preco: paraNumero(form.preco),
      rendimento: paraNumero(form.rendimento),
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

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    const resultado = await excluirInsumo(paraExcluir.id);
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
      {/* ---------- Botão de novo ---------- */}
      <button type="button" className={botaoPrimario} onClick={abrirNovo}>
        <Plus size={22} /> Novo insumo
      </button>

      {/* ---------- Janela de edição ---------- */}
      <Modal
        aberto={formAberto}
        titulo={form.id ? `Editar “${form.nome || "insumo"}”` : "Novo insumo"}
        descricao={
          form.id
            ? "Ao salvar, o custo de todos os pratos que usam este insumo é refeito."
            : "Cadastre algo que você compra para cozinhar."
        }
        travado={salvando}
        aoFechar={() => setFormAberto(false)}
      >
        <form onSubmit={enviar} noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="nome" className={rotulo}>
                Nome do insumo
              </label>
              <input
                id="nome"
                className={campo}
                placeholder="Ex: Farinha de trigo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                disabled={salvando}
              />
            </div>

            <div>
              <label htmlFor="unidade" className={rotulo}>
                Unidade de medida
                <Dica texto="Como você compra esse item? Em quilos, gramas, litros ou por unidade (ex: 1 ovo)." />
              </label>
              <select
                id="unidade"
                className={campo}
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                disabled={salvando}
              >
                {UNIDADES.map((u) => (
                  <option key={u.valor} value={u.valor}>
                    {u.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preco" className={rotulo}>
                Preço por unidade (R$)
                <Dica texto="Quanto você pagou por 1 unidade? Ex: R$ 5,00 por 1 kg de farinha." />
              </label>
              <input
                id="preco"
                inputMode="decimal"
                className={campo}
                placeholder="Ex: 5,00"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                disabled={salvando}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="rendimento" className={rotulo}>
                Rendimento (%)
                <Dica texto="Ex: se você compra 1 kg de trigo mas só aproveita 900 g, o rendimento é 90%. Se aproveita tudo, deixe 100." />
              </label>
              <input
                id="rendimento"
                inputMode="decimal"
                className={`${campo} md:max-w-xs`}
                placeholder="100"
                value={form.rendimento}
                onChange={(e) => setForm({ ...form, rendimento: e.target.value })}
                disabled={salvando}
              />
              <p className="mt-2 text-base text-slate-500">
                Na dúvida, deixe <strong>100</strong> (você aproveita tudo o que compra).
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
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
                "Salvar insumo"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Busca ---------- */}
      {insumos.length > 0 && (
        <CampoBusca
          valor={lista.busca}
          aoMudar={lista.definirBusca}
          placeholder="Procurar um insumo pelo nome..."
          resumo={
            lista.totalFiltrado === 0
              ? "Nenhum insumo encontrado"
              : `Mostrando ${lista.primeiro} a ${lista.ultimo} de ${lista.totalFiltrado}${
                  lista.buscando ? ` (de ${lista.total} no total)` : ""
                }`
          }
        />
      )}

      {/* ---------- Tabela ---------- */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {insumos.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-2xl font-bold text-slate-800">Nenhum insumo cadastrado ainda</p>
            <p className="mx-auto mt-3 max-w-lg text-lg text-slate-600">
              Clique em <strong>“+ Novo insumo”</strong> e comece pela farinha, pelos ovos ou por
              qualquer coisa que você compra para cozinhar.
            </p>
          </div>
        ) : lista.totalFiltrado === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-2xl font-bold text-slate-800">Nenhum insumo encontrado</p>
            <p className="mt-3 text-lg text-slate-600">
              Não achamos nada com <strong>“{lista.busca}”</strong>. Tente escrever de outro jeito.
            </p>
            <button
              type="button"
              onClick={() => lista.definirBusca("")}
              className="mt-5 text-lg font-semibold text-massa-700 underline underline-offset-2 hover:text-massa-800"
            >
              Ver todos os insumos
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Unidade</th>
                  <th className="px-4 py-3 text-right font-semibold">Preço pago</th>
                  <th className="px-4 py-3 text-right font-semibold">Rendimento</th>
                  <th className="px-6 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.visiveis.map((insumo) => (
                  <tr key={insumo.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-lg font-bold text-slate-900">{insumo.nome}</td>
                    <td className="px-4 py-4 text-lg text-slate-700">{insumo.unidade}</td>
                    <td className="px-4 py-4 text-right text-lg text-slate-900">
                      {formatarMoeda(insumo.preco)}
                      <span className="ml-1 text-sm text-slate-500">/ {insumo.unidade}</span>
                    </td>
                    <td className="px-4 py-4 text-right text-lg text-slate-700">
                      {formatarNumero(insumo.rendimento, 0)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={botaoIcone}
                          onClick={() => abrirEdicao(insumo)}
                          aria-label={`Editar ${insumo.nome}`}
                          title="Editar"
                        >
                          <Pencil size={19} />
                        </button>
                        <button
                          type="button"
                          className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                          onClick={() => setParaExcluir(insumo)}
                          aria-label={`Excluir ${insumo.nome}`}
                          title="Excluir"
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <p className="text-base text-slate-500">
        Sempre que você mudar o preço ou o rendimento de um insumo, o custo de todos os pratos que
        usam ele é refeito automaticamente.
      </p>

      <ConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Tem certeza?"
        descricao={`Tem certeza que deseja excluir "${paraExcluir?.nome ?? ""}"? Ele também será retirado das receitas dos pratos. Essa ação não pode ser desfeita.`}
        processando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </>
  );
}
