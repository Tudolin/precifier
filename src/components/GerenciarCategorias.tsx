"use client";

import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  classificarAutomaticamente,
  excluirCategoria,
  salvarCategoria,
} from "@/app/actions/categorias";
import ConfirmarExclusao from "@/components/ConfirmarExclusao";
import { botaoIcone, botaoPrimario, botaoSecundario, campo, rotulo } from "@/lib/estilos";
import { CORES_CATEGORIA, type Categoria } from "@/lib/types";

interface Props {
  categorias: Categoria[];
  /** Quantos produtos há em cada categoria (para mostrar do lado). */
  contagem: Record<string, number>;
  semCategoria: number;
}

const FORM_VAZIO = { id: "", nome: "", cor: "laranja" };

export default function GerenciarCategorias({ categorias, contagem, semCategoria }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const resultado = await salvarCategoria({
      id: form.id || undefined,
      nome: form.nome,
      cor: form.cor,
    });
    setSalvando(false);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
      setForm(FORM_VAZIO);
      setFormAberto(false);
      router.refresh();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  async function organizarSozinho() {
    setOrganizando(true);
    const resultado = await classificarAutomaticamente();
    setOrganizando(false);
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
    const resultado = await excluirCategoria(paraExcluir.id);
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span>
          <span className="block text-xl font-bold text-slate-900">Organizar em categorias</span>
          <span className="text-base text-slate-600">
            {categorias.length === 0
              ? "Agrupe seus produtos em massas, congelados, salgados, bebidas..."
              : `${categorias.length} categorias${semCategoria > 0 ? ` · ${semCategoria} produtos sem categoria` : ""}`}
          </span>
        </span>
        {aberto ? <ChevronUp size={26} /> : <ChevronDown size={26} />}
      </button>

      {aberto && (
        <div className="border-t border-slate-200 px-6 py-5">
          {/* Botão de organizar tudo sozinho */}
          <div className="mb-5 rounded-xl border-2 border-sky-200 bg-sky-50 p-5">
            <p className="text-lg font-bold text-sky-900">Deixe o sistema organizar para você</p>
            <p className="mt-1 text-base text-sky-900">
              Ele lê o nome de cada produto e separa em Massas, Massas recheadas, Lasanhas,
              Congelados, Salgados, Molhos, Carnes, Rotisseria, Doces e Bebidas. O que você já
              organizou na mão não é mexido.
            </p>
            <button
              type="button"
              className={`${botaoPrimario} mt-4`}
              onClick={organizarSozinho}
              disabled={organizando}
            >
              {organizando ? (
                <>
                  <Loader2 className="animate-spin" size={22} /> Organizando...
                </>
              ) : (
                <>
                  <Wand2 size={22} /> Organizar meus produtos
                </>
              )}
            </button>
          </div>

          {/* Lista de categorias */}
          {categorias.length > 0 && (
            <ul className="mb-4 space-y-2">
              {categorias.map((categoria) => {
                const cor = CORES_CATEGORIA[categoria.cor] ?? CORES_CATEGORIA.cinza;
                return (
                  <li
                    key={categoria.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <span className={`h-4 w-4 shrink-0 rounded-full ${cor.ponto}`} />
                    <span className="flex-1 text-lg font-semibold text-slate-900">
                      {categoria.nome}
                    </span>
                    <span className="text-base text-slate-500">
                      {contagem[categoria.id] ?? 0}{" "}
                      {(contagem[categoria.id] ?? 0) === 1 ? "produto" : "produtos"}
                    </span>
                    <button
                      type="button"
                      className={botaoIcone}
                      onClick={() => {
                        setForm({ id: categoria.id, nome: categoria.nome, cor: categoria.cor });
                        setFormAberto(true);
                      }}
                      aria-label={`Editar ${categoria.nome}`}
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                      onClick={() => setParaExcluir(categoria)}
                      aria-label={`Excluir ${categoria.nome}`}
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Formulário de categoria */}
          {formAberto ? (
            <form onSubmit={enviar} className="rounded-xl bg-slate-50 p-5" noValidate>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {form.id ? "Editar categoria" : "Nova categoria"}
                </h3>
                <button
                  type="button"
                  className={botaoIcone}
                  onClick={() => setFormAberto(false)}
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nome-categoria" className={rotulo}>
                    Nome
                  </label>
                  <input
                    id="nome-categoria"
                    className={campo}
                    placeholder="Ex: Massas"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    disabled={salvando}
                  />
                </div>
                <div>
                  <span className={rotulo}>Cor</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(CORES_CATEGORIA).map(([chave, cor]) => (
                      <button
                        key={chave}
                        type="button"
                        onClick={() => setForm({ ...form, cor: chave })}
                        aria-label={`Cor ${chave}`}
                        aria-pressed={form.cor === chave}
                        className={`h-10 w-10 rounded-full ${cor.ponto} transition ${
                          form.cor === chave
                            ? "ring-4 ring-slate-400 ring-offset-2"
                            : "hover:scale-110"
                        }`}
                      />
                    ))}
                  </div>
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
                    "Salvar categoria"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={botaoSecundario}
              onClick={() => {
                setForm(FORM_VAZIO);
                setFormAberto(true);
              }}
            >
              <Plus size={22} /> Criar categoria
            </button>
          )}
        </div>
      )}

      <ConfirmarExclusao
        aberto={Boolean(paraExcluir)}
        titulo="Tem certeza?"
        descricao={`Tem certeza que deseja excluir a categoria "${paraExcluir?.nome ?? ""}"? Os produtos dela NÃO serão excluídos, apenas ficarão sem categoria.`}
        processando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}
