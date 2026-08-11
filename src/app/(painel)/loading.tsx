import { EsqueletoCabecalho, EsqueletoCards, EsqueletoTabela } from "@/components/Esqueleto";

export default function Carregando() {
  return (
    <div className="space-y-8">
      <EsqueletoCabecalho />
      <EsqueletoCards />
      <EsqueletoTabela linhas={5} />
      <p className="text-center text-base text-slate-500">Carregando os seus números...</p>
    </div>
  );
}
