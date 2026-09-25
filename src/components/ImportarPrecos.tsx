"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { importarPrecosBalanca, type RelatorioImportacao } from "@/app/actions/importarPrecos";
import Modal from "@/components/Modal";
import { botaoPrimario, botaoSecundario, rotulo } from "@/lib/estilos";
import { formatarMoeda } from "@/lib/formatar";

/**
 * A balanca grava o arquivo em ANSI (Windows-1252), nao em UTF-8. Tenta
 * UTF-8 primeiro (caso alguem tenha salvo de novo num editor) e cai para
 * Windows-1252 se os bytes nao forem UTF-8 valido -- sem isso, um "Ç" ou
 * "Ã" viraria lixo no nome.
 */
async function lerTextoDoArquivo(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export default function ImportarPrecos() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [previa, setPrevia] = useState<RelatorioImportacao | null>(null);
  const [processando, setProcessando] = useState(false);

  function fechar() {
    setAberto(false);
    setTexto("");
    setNomeArquivo("");
    setPrevia(null);
  }

  async function escolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    setProcessando(true);
    setPrevia(null);
    const conteudo = await lerTextoDoArquivo(arquivo);
    setTexto(conteudo);
    setNomeArquivo(arquivo.name);
    const resultado = await importarPrecosBalanca(conteudo, false);
    setProcessando(false);

    if (!resultado.ok) {
      toast.error(resultado.mensagem);
      return;
    }
    setPrevia(resultado);
  }

  async function confirmar() {
    setProcessando(true);
    const resultado = await importarPrecosBalanca(texto, true);
    setProcessando(false);

    if (!resultado.ok) {
      toast.error(resultado.mensagem);
      return;
    }
    if (resultado.avisos.length > 0) {
      toast.warning(`${resultado.mensagem} Veja os avisos na tela.`);
      setPrevia(resultado);
    } else {
      toast.success(resultado.mensagem);
      fechar();
    }
    router.refresh();
  }

  const totalMudancas = previa ? previa.pratos.length + previa.pdv.length : 0;

  return (
    <>
      <button type="button" className={botaoSecundario} onClick={() => setAberto(true)}>
        <FileUp size={22} /> Importar preços da balança
      </button>

      <Modal
        aberto={aberto}
        titulo="Importar preços da balança"
        descricao="Escolha o arquivo de produtos exportado da balança. Nada é gravado antes de você confirmar."
        largura="grande"
        travado={processando}
        aoFechar={fechar}
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="arquivo-balanca" className={rotulo}>
              Arquivo de produtos (ex.: Produtos.txt)
            </label>
            <input
              id="arquivo-balanca"
              type="file"
              accept=".txt,text/plain"
              onChange={escolherArquivo}
              disabled={processando}
              className="block w-full text-lg text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-massa-600 file:px-5 file:py-3 file:text-lg file:font-bold file:text-white hover:file:bg-massa-700"
            />
            {nomeArquivo && (
              <p className="mt-2 text-base text-slate-600">
                Arquivo: <strong>{nomeArquivo}</strong>
              </p>
            )}
          </div>

          {processando && !previa && (
            <p className="flex items-center gap-2 text-lg text-slate-700">
              <Loader2 className="animate-spin" size={22} /> Lendo o arquivo...
            </p>
          )}

          {previa && (
            <>
              <div
                className={`rounded-xl border-2 p-4 ${
                  previa.aplicado ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"
                }`}
              >
                <p className="text-lg font-bold text-slate-900">{previa.mensagem}</p>
                <p className="mt-1 text-base text-slate-700">
                  {previa.lidos} produtos lidos no arquivo ·{" "}
                  {previa.pratosIguais + previa.pdvIguais}{" "}
                  {previa.pratosIguais + previa.pdvIguais === 1 ? "já estava" : "já estavam"} com o
                  preço certo
                  {previa.semPreco.length > 0 &&
                    ` · ${previa.semPreco.length} com preço 0,00 (ignorados)`}
                </p>
                {previa.pdvPulou && (
                  <p className="mt-1 text-base text-slate-700">
                    Banco do caixa não configurado aqui: só os pratos serão atualizados.
                  </p>
                )}
              </div>

              {previa.avisos.length > 0 && (
                <ul className="list-disc space-y-1 rounded-xl border-2 border-amber-200 bg-amber-50 py-3 pl-9 pr-4 text-base text-amber-900">
                  {previa.avisos.map((aviso, i) => (
                    <li key={i}>{aviso}</li>
                  ))}
                </ul>
              )}

              {previa.pratos.length > 0 && (
                <TabelaMudancas
                  titulo="Meus pratos (e o caixa junto)"
                  linhas={previa.pratos.map((m) => ({
                    plu: m.plu,
                    nome: m.nome + (m.vinculadoAgora ? " — vinculado ao PLU agora" : ""),
                    antes: m.precoAntes,
                    depois: m.precoDepois,
                  }))}
                />
              )}

              {previa.pdv.length > 0 && (
                <TabelaMudancas
                  titulo="Só no catálogo do caixa (sem prato cadastrado aqui)"
                  linhas={previa.pdv.map((m) => ({
                    plu: m.plu,
                    nome: m.nome,
                    antes: m.precoAntes,
                    depois: m.precoDepois,
                  }))}
                />
              )}

              {previa.plusRepetidos.length > 0 && (
                <p className="text-base text-slate-600">
                  PLU repetido no arquivo (valeu a última linha): {previa.plusRepetidos.join(", ")}
                </p>
              )}
            </>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" className={botaoSecundario} onClick={fechar} disabled={processando}>
              {previa?.aplicado ? "Fechar" : "Cancelar"}
            </button>
            {previa && !previa.aplicado && totalMudancas > 0 && (
              <button type="button" className={botaoPrimario} onClick={confirmar} disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="animate-spin" size={22} /> Atualizando...
                  </>
                ) : (
                  `Atualizar ${totalMudancas} ${totalMudancas === 1 ? "preço" : "preços"}`
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

function TabelaMudancas({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { plu: number; nome: string; antes?: number; depois: number }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-bold text-slate-900">
        {titulo} ({linhas.length})
      </h3>
      <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-base">
          <thead className="sticky top-0 bg-slate-50 text-sm uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-semibold">PLU</th>
              <th className="px-4 py-2 font-semibold">Produto</th>
              <th className="px-4 py-2 text-right font-semibold">Antes</th>
              <th className="px-4 py-2 text-right font-semibold">Depois</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map((linha) => (
              <tr key={linha.plu}>
                <td className="px-4 py-2 text-slate-500">{linha.plu}</td>
                <td className="px-4 py-2 text-slate-900">{linha.nome}</td>
                <td className="px-4 py-2 text-right text-slate-500">
                  {linha.antes === undefined ? "novo" : formatarMoeda(linha.antes)}
                </td>
                <td className="px-4 py-2 text-right font-bold text-slate-900">
                  {formatarMoeda(linha.depois)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
