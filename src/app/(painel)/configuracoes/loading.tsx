import { EsqueletoCabecalho, EsqueletoTabela } from "@/components/Esqueleto";

export default function Carregando() {
  return (
    <div className="space-y-8">
      <EsqueletoCabecalho />
      <EsqueletoTabela linhas={6} />
      <p className="text-center text-base text-slate-500">Carregando os seus custos...</p>
    </div>
  );
}
