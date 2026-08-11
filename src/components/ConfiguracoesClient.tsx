"use client";

import { Loader2, Plus, Save, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { salvarConfiguracoes } from "@/app/actions/configuracoes";
import Dica from "@/components/Dica";
import { custoDaFolha, percentualCustoFixo, precoSugerido, somaCustosFixos } from "@/lib/calculos";
import { botaoIcone, botaoPrimario, botaoSecundario, campo, cartao, rotulo } from "@/lib/estilos";
import {
  formatarMoeda,
  formatarNumero,
  formatarPorcentagem,
  novoId,
  paraCampo,
  paraNumero,
} from "@/lib/formatar";
import type { Configuracoes } from "@/lib/types";

interface Props {
  config: Configuracoes;
}

/** Funcionário enquanto está sendo editado (salário fica como texto). */
interface LinhaEquipe {
  id: string;
  nome: string;
  salario: string;
}

export default function ConfiguracoesClient({ config }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  // Guardamos como texto para o dono poder digitar "1.200,00" à vontade
  const [form, setForm] = useState({
    gas: paraCampo(config.gas),
    aluguel: paraCampo(config.aluguel),
    luz: paraCampo(config.luz),
    outros: paraCampo(config.outros),
    encargosPercentual: paraCampo(config.encargosPercentual, 0) || "0",
    faturamentoMensal: paraCampo(config.faturamentoMensal),
    margemDesejada: String(config.margemDesejada ?? 30),
  });

  const [equipe, setEquipe] = useState<LinhaEquipe[]>(() =>
    (config.funcionarios ?? []).map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.nome,
      salario: paraCampo(pessoa.salario),
    }))
  );

  /** Prévia recalculada a cada tecla digitada. */
  const previa = useMemo(() => {
    const valores: Configuracoes = {
      gas: paraNumero(form.gas),
      aluguel: paraNumero(form.aluguel),
      luz: paraNumero(form.luz),
      outros: paraNumero(form.outros),
      funcionarios: equipe.map((pessoa) => ({
        id: pessoa.id,
        nome: pessoa.nome,
        salario: paraNumero(pessoa.salario),
      })),
      encargosPercentual: paraNumero(form.encargosPercentual),
      faturamentoMensal: paraNumero(form.faturamentoMensal),
      margemDesejada: paraNumero(form.margemDesejada),
    };

    const folha = custoDaFolha(valores);
    const salarios = valores.funcionarios.reduce((soma, p) => soma + p.salario, 0);

    return {
      valores,
      salarios,
      folha,
      fixos: somaCustosFixos(valores),
      percentual: percentualCustoFixo(valores),
    };
  }, [form, equipe]);

  function adicionarPessoa() {
    setEquipe((atual) => [...atual, { id: novoId(), nome: "", salario: "" }]);
  }

  function removerPessoa(id: string) {
    setEquipe((atual) => atual.filter((p) => p.id !== id));
  }

  function atualizarPessoa(id: string, campos: Partial<LinhaEquipe>) {
    setEquipe((atual) => atual.map((p) => (p.id === id ? { ...p, ...campos } : p)));
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const resultado = await salvarConfiguracoes(previa.valores);
    setSalvando(false);

    if (resultado.ok) {
      toast.success(resultado.mensagem);
      router.refresh();
    } else {
      toast.error(resultado.mensagem);
    }
  }

  const camposDinheiro = [
    { chave: "gas" as const, titulo: "Gás", placeholder: "Ex: 350,00", dica: null },
    { chave: "aluguel" as const, titulo: "Aluguel", placeholder: "Ex: 2.000,00", dica: null },
    { chave: "luz" as const, titulo: "Luz", placeholder: "Ex: 480,00", dica: null },
    {
      chave: "outros" as const,
      titulo: "Outros custos",
      placeholder: "Ex: internet, água, material de limpeza...",
      dica: "Some tudo o que você paga por mês e não entrou nos campos acima: internet, água, contador, material de limpeza...",
    },
  ];

  return (
    <form onSubmit={enviar} className="grid gap-6 lg:grid-cols-3" noValidate>
      <div className="space-y-6 lg:col-span-2">
        {/* ---------- Contas do mês ---------- */}
        <div className={cartao}>
          <h2 className="mb-1 text-2xl font-bold text-slate-900">O que você paga todo mês</h2>
          <p className="mb-6 text-base text-slate-600">
            Se não tiver o valor exato, coloque uma média. Você pode corrigir depois.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {camposDinheiro.map(({ chave, titulo, placeholder, dica }) => (
              <div key={chave}>
                <label htmlFor={chave} className={rotulo}>
                  {titulo} (R$ por mês)
                  {dica && <Dica texto={dica} />}
                </label>
                <input
                  id={chave}
                  inputMode="decimal"
                  className={campo}
                  placeholder={placeholder}
                  value={form[chave]}
                  onChange={(e) => setForm({ ...form, [chave]: e.target.value })}
                  disabled={salvando}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Equipe ---------- */}
        <div className={cartao}>
          <div className="mb-1 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-massa-100 text-massa-700">
              <Users size={24} />
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Minha equipe</h2>
          </div>
          <p className="mb-6 text-base text-slate-600">
            Quem trabalha com você e quanto cada pessoa ganha por mês. Se você mesmo tira um
            salário da cozinha, coloque o seu nome aqui também.
          </p>

          {equipe.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-slate-200 px-5 py-6 text-center text-base text-slate-500">
              Nenhuma pessoa cadastrada. Se você trabalha sozinho, pode deixar assim mesmo.
            </p>
          ) : (
            <div className="space-y-3">
              {equipe.map((pessoa) => (
                <div
                  key={pessoa.id}
                  className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_190px_auto]"
                >
                  <div>
                    <label className={rotulo} htmlFor={`nome-${pessoa.id}`}>
                      Nome
                    </label>
                    <input
                      id={`nome-${pessoa.id}`}
                      className={campo}
                      placeholder="Ex: Dona Maria (cozinha)"
                      value={pessoa.nome}
                      onChange={(e) => atualizarPessoa(pessoa.id, { nome: e.target.value })}
                      disabled={salvando}
                    />
                  </div>

                  <div>
                    <label className={rotulo} htmlFor={`salario-${pessoa.id}`}>
                      Salário (R$ por mês)
                    </label>
                    <input
                      id={`salario-${pessoa.id}`}
                      inputMode="decimal"
                      className={campo}
                      placeholder="Ex: 2.000,00"
                      value={pessoa.salario}
                      onChange={(e) => atualizarPessoa(pessoa.id, { salario: e.target.value })}
                      disabled={salvando}
                    />
                  </div>

                  <div className="flex justify-end pb-1">
                    <button
                      type="button"
                      className={`${botaoIcone} text-red-600 hover:bg-red-50`}
                      onClick={() => removerPessoa(pessoa.id)}
                      disabled={salvando}
                      aria-label={`Remover ${pessoa.nome || "esta pessoa"}`}
                      title="Remover esta pessoa"
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`${botaoSecundario} mt-4`}
            onClick={adicionarPessoa}
            disabled={salvando}
          >
            <Plus size={22} /> Adicionar funcionário
          </button>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <label htmlFor="encargosPercentual" className={rotulo}>
              Encargos sobre os salários (%)
              <Dica texto="É o quanto você paga a mais além do salário: FGTS, INSS, férias, 13º. Se não tem certeza, 40% costuma ser um bom chute para carteira assinada. Se você paga só o combinado, deixe 0." />
            </label>
            <input
              id="encargosPercentual"
              inputMode="decimal"
              className={`${campo} sm:max-w-xs`}
              placeholder="Ex: 40"
              value={form.encargosPercentual}
              onChange={(e) => setForm({ ...form, encargosPercentual: e.target.value })}
              disabled={salvando}
            />
            <p className="mt-2 text-base text-slate-500">
              Salários: <strong>{formatarMoeda(previa.salarios)}</strong> + encargos ={" "}
              <strong className="text-massa-700">{formatarMoeda(previa.folha)}</strong> por mês.
            </p>
          </div>
        </div>

        {/* ---------- Metas ---------- */}
        <div className={cartao}>
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Suas vendas e sua meta</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="faturamentoMensal" className={rotulo}>
                Faturamento por mês (R$)
                <Dica texto="Quanto entra de dinheiro na casa por mês, somando tudo. Seu sistema de caixa (PDV) mostra esse número. É com ele que o sistema descobre qual pedaço de cada venda vai para pagar as contas." />
              </label>
              <input
                id="faturamentoMensal"
                inputMode="decimal"
                className={campo}
                placeholder="Ex: 40.000,00"
                value={form.faturamentoMensal}
                onChange={(e) => setForm({ ...form, faturamentoMensal: e.target.value })}
                disabled={salvando}
              />
              <p className="mt-2 text-base text-slate-500">
                Pode ser uma média dos últimos meses. Não precisa ser exato.
              </p>
            </div>

            <div>
              <label htmlFor="margemDesejada" className={rotulo}>
                Margem de lucro que você deseja (%)
                <Dica texto="Quanto do preço final deve ser o seu lucro? Ex: 30%." />
              </label>
              <input
                id="margemDesejada"
                inputMode="decimal"
                className={campo}
                placeholder="Ex: 30"
                value={form.margemDesejada}
                onChange={(e) => setForm({ ...form, margemDesejada: e.target.value })}
                disabled={salvando}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`${botaoPrimario} mt-8 w-full py-4 text-xl`}
            disabled={salvando}
          >
            {salvando ? (
              <>
                <Loader2 className="animate-spin" size={24} /> Salvando e recalculando...
              </>
            ) : (
              <>
                <Save size={24} /> Salvar e recalcular tudo
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------- Prévia em tempo real ---------- */}
      <aside className="lg:col-span-1">
        <div className="sticky top-6 space-y-4 rounded-2xl border-2 border-massa-200 bg-massa-50 p-6">
          <h2 className="text-xl font-bold text-massa-900">Conta em tempo real</h2>

          <div>
            <p className="text-base text-slate-600">Custo fixo total</p>
            <p className="text-3xl font-extrabold text-slate-900">{formatarMoeda(previa.fixos)}</p>
            <p className="text-sm text-slate-500">por mês</p>
          </div>

          {/* Detalhamento: o dono enxerga o peso de cada conta */}
          <ul className="space-y-1.5 border-t border-massa-200 pt-4 text-sm text-slate-700">
            <li className="flex justify-between gap-3">
              <span>Gás</span>
              <span className="font-semibold">{formatarMoeda(previa.valores.gas)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Aluguel</span>
              <span className="font-semibold">{formatarMoeda(previa.valores.aluguel)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Luz</span>
              <span className="font-semibold">{formatarMoeda(previa.valores.luz)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Outros</span>
              <span className="font-semibold">{formatarMoeda(previa.valores.outros)}</span>
            </li>
            <li className="flex justify-between gap-3 text-massa-900">
              <span>
                Equipe ({equipe.length} {equipe.length === 1 ? "pessoa" : "pessoas"})
              </span>
              <span className="font-bold">{formatarMoeda(previa.folha)}</span>
            </li>
          </ul>

          <div className="border-t border-massa-200 pt-4">
            <p className="text-base text-slate-600">Some das contas em cada venda</p>
            <p className="text-3xl font-extrabold text-massa-800">
              {formatarPorcentagem(previa.percentual)}
            </p>
            <p className="text-sm leading-snug text-slate-500">
              {previa.valores.faturamentoMensal > 0 ? (
                <>
                  De cada {formatarMoeda(100)} vendidos,{" "}
                  <strong>{formatarMoeda(previa.percentual)}</strong> vão só para pagar as contas
                  da casa.
                </>
              ) : (
                "Informe o faturamento do mês para calcular"
              )}
            </p>
          </div>

          <div className="border-t border-massa-200 pt-4">
            <p className="text-base text-slate-600">Sua meta de lucro</p>
            <p className="text-3xl font-extrabold text-emerald-700">
              {formatarPorcentagem(previa.valores.margemDesejada, 0)}
            </p>
            <p className="mt-2 text-sm leading-snug text-slate-600">
              Exemplo: um prato com {formatarMoeda(10)} de ingredientes precisaria ser vendido por{" "}
              <strong>
                {formatarMoeda(
                  precoSugerido(10, previa.valores.margemDesejada, previa.percentual)
                )}
              </strong>{" "}
              para pagar as contas e sobrar o seu lucro.
            </p>
          </div>

          <p className="border-t border-massa-200 pt-4 text-sm text-slate-600">
            Ao salvar, todos os pratos são recalculados e a tela inicial já mostra os números novos.
          </p>
        </div>
      </aside>
    </form>
  );
}
