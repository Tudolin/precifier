"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

import { botaoPrimario, campo, rotulo } from "@/lib/estilos";

export default function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [problemaDeConfiguracao, setProblemaDeConfiguracao] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!email.trim()) return setErro("Digite o seu email.");
    if (!senha) return setErro("Digite a sua senha.");

    setCarregando(true);
    const resposta = await signIn("credentials", {
      email: email.trim(),
      senha,
      redirect: false,
    });
    setCarregando(false);

    if (!resposta || resposta.error) {
      /**
       * O NextAuth devolve o texto do erro que o servidor lançou. Se for
       * "CONFIGURACAO", o problema não é a senha do dono — é o sistema que
       * ainda não foi configurado (banco ou variáveis de ambiente).
       */
      if (resposta?.error?.includes("CONFIGURACAO")) {
        setProblemaDeConfiguracao(true);
        setErro(null);
      } else {
        setErro("Email ou senha não conferem. Tente de novo.");
      }
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={entrar}
      className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
      noValidate
    >
      <div className="mb-5">
        <label htmlFor="email" className={rotulo}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className={campo}
          placeholder="Ex: dono@minhamassa.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={carregando}
        />
      </div>

      <div className="mb-2">
        <label htmlFor="senha" className={rotulo}>
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            className={`${campo} pr-14`}
            placeholder="Digite a sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={carregando}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={mostrarSenha ? "Esconder a senha" : "Mostrar a senha"}
            title={mostrarSenha ? "Esconder a senha" : "Mostrar a senha"}
          >
            {mostrarSenha ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>

      <div className="mb-5 text-right">
        {/* Link apenas visual, conforme combinado */}
        <span
          role="link"
          tabIndex={0}
          title="Peça ajuda a quem instalou o sistema para trocar a senha."
          className="cursor-pointer text-sm font-medium text-massa-700 underline underline-offset-2 hover:text-massa-800"
        >
          Esqueci a senha?
        </span>
      </div>

      {erro && (
        <p
          role="alert"
          className="mb-5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-700"
        >
          {erro}
        </p>
      )}

      {problemaDeConfiguracao && (
        <div
          role="alert"
          className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-base text-amber-900"
        >
          <p className="font-bold">O sistema ainda não está configurado</p>
          <p className="mt-1 leading-snug">
            Não é a sua senha. Falta ligar o banco de dados ou cadastrar as variáveis de ambiente.
          </p>
          <a
            href="/api/diagnostico"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-bold underline underline-offset-2"
          >
            Ver o que está faltando →
          </a>
        </div>
      )}

      <button type="submit" className={`${botaoPrimario} w-full`} disabled={carregando}>
        {carregando ? (
          <>
            <Loader2 className="animate-spin" size={22} /> Entrando...
          </>
        ) : (
          <>
            <LogIn size={22} /> Entrar
          </>
        )}
      </button>
    </form>
  );
}
