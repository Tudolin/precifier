import { NextResponse } from "next/server";

import { credenciaisBanco } from "@/lib/banco";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de configuração.
 *
 * Serve para descobrir, em 5 segundos, por que o sistema não está
 * funcionando depois do deploy. Abra:  https://SEU-SITE/api/diagnostico
 *
 * SEGURANÇA: aqui nunca é devolvido o valor de nenhuma variável secreta —
 * só se ela está presente ou não, e o resultado de um teste de leitura no
 * banco. Nenhuma senha, token ou dado de cliente aparece.
 */
export async function GET() {
  const credenciais = credenciaisBanco();

  const relatorio: Record<string, unknown> = {
    ambiente: process.env.VERCEL ? "Vercel" : "local",
  };

  // ---------- Login ----------
  const temSecret = Boolean(process.env.NEXTAUTH_SECRET);
  const temEmail = Boolean(process.env.USER_EMAIL);
  const temSenha = Boolean(process.env.USER_PASSWORD || process.env.USER_PASSWORD_HASH);

  relatorio.login = {
    NEXTAUTH_SECRET: temSecret ? "ok" : "FALTANDO (obrigatório em produção)",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "não definida (a Vercel costuma resolver sozinha)",
    USER_EMAIL: temEmail ? "ok" : "FALTANDO",
    USER_PASSWORD: temSenha ? "ok" : "FALTANDO (USER_PASSWORD ou USER_PASSWORD_HASH)",
  };

  // ---------- Banco ----------
  if (!credenciais) {
    relatorio.banco = {
      status: "NÃO CONFIGURADO",
      procurei: [
        "KV_REST_API_URL + KV_REST_API_TOKEN",
        "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN",
        "REDIS_REST_API_URL + REDIS_REST_API_TOKEN",
      ],
      comoResolver:
        "Na Vercel: Storage → Create Database → Marketplace Database Providers → " +
        "Upstash → Redis. Conecte ao projeto e faça um novo deploy.",
    };
  } else {
    // Testa uma leitura de verdade
    try {
      const { createClient } = await import("@vercel/kv");
      const kv = createClient({ ...credenciais, cache: "no-store" });
      const usuario = await kv.get("precifier:usuario");
      const pratos = (await kv.get<unknown[]>("precifier:pratos")) ?? [];
      const insumos = (await kv.get<unknown[]>("precifier:insumos")) ?? [];

      relatorio.banco = {
        status: "CONECTADO",
        // Mostra só o começo da URL, o suficiente para conferir o servidor
        servidor: credenciais.url.replace(/^(https:\/\/[^.]{0,10}).*/, "$1..."),
        usuarioCriado: Boolean(usuario),
        totalPratos: Array.isArray(pratos) ? pratos.length : 0,
        totalInsumos: Array.isArray(insumos) ? insumos.length : 0,
      };
    } catch (erro) {
      relatorio.banco = {
        status: "ERRO AO CONECTAR",
        detalhe: erro instanceof Error ? erro.message : String(erro),
        comoResolver:
          "Confira se as variáveis do banco foram copiadas inteiras e se você " +
          "fez um novo deploy depois de cadastrá-las.",
      };
    }
  }

  // ---------- Conclusão ----------
  const bancoOk =
    typeof relatorio.banco === "object" &&
    (relatorio.banco as { status?: string }).status === "CONECTADO";

  relatorio.podeEntrar = Boolean(temSecret && temEmail && temSenha && bancoOk);

  if (!relatorio.podeEntrar) {
    const faltando: string[] = [];
    if (!temSecret) faltando.push("Cadastre NEXTAUTH_SECRET (qualquer frase longa e aleatória)");
    if (!temEmail) faltando.push("Cadastre USER_EMAIL");
    if (!temSenha) faltando.push("Cadastre USER_PASSWORD");
    if (!bancoOk) faltando.push("Conecte um banco Redis (Upstash) ao projeto");
    faltando.push("Depois de cadastrar, faça um NOVO DEPLOY para valer");
    relatorio.facaIsto = faltando;
  }

  return NextResponse.json(relatorio, {
    status: relatorio.podeEntrar ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
