/**
 * Configuracao do NextAuth com login por email e senha.
 *
 * Existe apenas UM usuario: o dono da casa de massas.
 * Na primeira tentativa de login o sistema cria esse usuario no banco
 * a partir das variaveis de ambiente (seed automatica), guardando a senha
 * como hash bcrypt — a senha em texto puro nunca fica salva.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { gravarUsuario, obterUsuario } from "./banco";
import type { Usuario } from "./types";

/**
 * Garante que o usuario dono exista no banco.
 * Tambem re-sincroniza quando o email ou a senha mudam no .env,
 * evitando que o dono fique trancado do lado de fora.
 */
async function garantirUsuario(): Promise<Usuario | null> {
  const emailEnv = (process.env.USER_EMAIL ?? "").trim().toLowerCase();
  const hashEnv = (process.env.USER_PASSWORD_HASH ?? "").trim();
  const senhaEnv = process.env.USER_PASSWORD ?? "";

  const existente = await obterUsuario();

  // Sem configuracao no ambiente: usamos o que ja estiver no banco (se houver).
  if (!emailEnv || (!hashEnv && !senhaEnv)) return existente;

  const hashDesejado = hashEnv || bcrypt.hashSync(senhaEnv, 10);

  if (existente) {
    const emailIgual = existente.email === emailEnv;
    // Se o hash foi informado direto no ambiente, ele manda.
    // Se veio senha em texto puro, comparamos com o hash salvo.
    const senhaIgual = hashEnv
      ? existente.senhaHash === hashEnv
      : bcrypt.compareSync(senhaEnv, existente.senhaHash);

    if (emailIgual && senhaIgual) return existente;

    const atualizado: Usuario = {
      email: emailEnv,
      senhaHash: hashDesejado,
      criadoEm: existente.criadoEm,
    };
    await gravarUsuario(atualizado);
    return atualizado;
  }

  const novo: Usuario = {
    email: emailEnv,
    senhaHash: hashDesejado,
    criadoEm: new Date().toISOString(),
  };
  await gravarUsuario(novo);
  return novo;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 dias logado, para o dono nao precisar entrar toda hora
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").trim().toLowerCase();
        const senha = credentials?.senha ?? "";
        if (!email || !senha) return null;

        const usuario = await garantirUsuario();
        if (!usuario) return null;
        if (usuario.email !== email) return null;

        const senhaConfere = bcrypt.compareSync(senha, usuario.senhaHash);
        if (!senhaConfere) return null;

        return { id: "dono", email: usuario.email, name: "Dono" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
