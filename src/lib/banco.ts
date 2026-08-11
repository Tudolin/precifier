/**
 * Camada de acesso ao banco de dados.
 *
 * Em producao usa o Vercel KV (Redis). Se as variaveis KV_REST_API_URL /
 * KV_REST_API_TOKEN nao estiverem preenchidas (tipico do "npm run dev" na
 * maquina do desenvolvedor), cai automaticamente para um arquivo JSON local.
 * Assim o sistema roda em qualquer lugar sem configuracao extra.
 *
 * IMPORTANTE: este arquivo so pode ser importado por codigo de servidor
 * (Server Components e Server Actions).
 */

import {
  CONFIG_PADRAO,
  type CanalVenda,
  type Categoria,
  type Configuracoes,
  type Insumo,
  type Prato,
  type Usuario,
} from "./types";

const CHAVES = {
  insumos: "precifier:insumos",
  pratos: "precifier:pratos",
  config: "precifier:config",
  canais: "precifier:canais",
  categorias: "precifier:categorias",
  usuario: "precifier:usuario",
} as const;

const ARQUIVO_LOCAL = ".precifier-local.json";

/**
 * Descobre as credenciais do banco Redis.
 *
 * A Vercel aposentou o produto "Vercel KV" e passou a oferecer o Upstash
 * pelo Marketplace — e essa integracao cria as variaveis com OUTROS nomes.
 * Aceitamos os dois padroes para o projeto funcionar nos dois casos:
 *
 *   KV_REST_API_URL / KV_REST_API_TOKEN            (Vercel KV, formato antigo)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (Upstash, formato atual)
 *   REDIS_REST_API_URL / REDIS_REST_API_TOKEN      (algumas integracoes usam este)
 */
export function credenciaisBanco(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_API_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_API_TOKEN;

  if (!url || !token) return null;
  return { url, token };
}

/** Existe banco Redis configurado? */
function temKV(): boolean {
  return credenciaisBanco() !== null;
}

/** Estamos rodando na Vercel (ou em outro servidor de verdade)? */
function emProducao(): boolean {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

/** Erro com explicacao pronta, para o dono entender o que falta. */
export class BancoNaoConfigurado extends Error {
  constructor() {
    super(
      "O banco de dados não está configurado. Na Vercel, crie um Redis em " +
        "Storage → Create Database → Marketplace → Upstash, conecte ao projeto " +
        "e faça um novo deploy."
    );
    this.name = "BancoNaoConfigurado";
  }
}

// ---------------------------------------------------------------------
// Modo local (arquivo JSON) — apenas desenvolvimento
// ---------------------------------------------------------------------

async function lerArquivoLocal(): Promise<Record<string, unknown>> {
  try {
    const fs = await import("node:fs/promises");
    const conteudo = await fs.readFile(ARQUIVO_LOCAL, "utf8");
    return JSON.parse(conteudo) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function gravarArquivoLocal(chave: string, valor: unknown): Promise<void> {
  const fs = await import("node:fs/promises");
  const dados = await lerArquivoLocal();
  dados[chave] = valor;
  await fs.writeFile(ARQUIVO_LOCAL, JSON.stringify(dados, null, 2), "utf8");
}

// ---------------------------------------------------------------------
// Leitura / escrita genericas
// ---------------------------------------------------------------------

/**
 * Cliente do Vercel KV com o CACHE DESLIGADO.
 *
 * Por que isso e essencial:
 * o @vercel/kv conversa com o banco por HTTP (fetch). O Next.js 14 guarda
 * automaticamente o resultado de todo fetch feito em Server Component —
 * ou seja, ele passa a guardar as LEITURAS DO BANCO em disco
 * (.next/cache/fetch-cache) e continua devolvendo o valor antigo mesmo
 * depois de os dados mudarem.
 *
 * Na pratica isso aparecia assim: a tela mostrava dados velhos ao navegar
 * pelo menu e so acertava depois de um F5. Num sistema de precificacao
 * isso e inaceitavel, entao pedimos "no-store": toda leitura vai ao banco.
 *
 * Obs.: "dynamic = force-dynamic" nas paginas NAO resolve isso — aquilo
 * controla a renderizacao da rota, nao o cache de dados do fetch.
 */
interface ClienteKV {
  get: <T>(chave: string) => Promise<T | null>;
  set: (chave: string, valor: unknown) => Promise<unknown>;
}

let clienteKV: ClienteKV | null = null;

async function obterCliente(): Promise<ClienteKV> {
  if (clienteKV) return clienteKV;

  const credenciais = credenciaisBanco();
  if (!credenciais) throw new BancoNaoConfigurado();

  const { createClient } = await import("@vercel/kv");
  clienteKV = createClient({
    url: credenciais.url,
    token: credenciais.token,
    // <- a linha que impede o Next de guardar as leituras do banco
    cache: "no-store",
  }) as unknown as ClienteKV;

  return clienteKV;
}

async function obter<T>(chave: string, padrao: T): Promise<T> {
  if (temKV()) {
    const kv = await obterCliente();
    const valor = await kv.get<T>(chave);
    return valor ?? padrao;
  }
  // Em producao NAO ha arquivo para gravar (o disco da Vercel e somente
  // leitura). Melhor falhar com uma explicacao do que fingir que salvou.
  if (emProducao()) throw new BancoNaoConfigurado();

  const dados = await lerArquivoLocal();
  return (dados[chave] as T) ?? padrao;
}

async function gravar<T>(chave: string, valor: T): Promise<void> {
  if (temKV()) {
    const kv = await obterCliente();
    await kv.set(chave, valor);
    return;
  }
  if (emProducao()) throw new BancoNaoConfigurado();

  await gravarArquivoLocal(chave, valor);
}

// ---------------------------------------------------------------------
// Insumos
// ---------------------------------------------------------------------

export async function listarInsumos(): Promise<Insumo[]> {
  const insumos = await obter<Insumo[]>(CHAVES.insumos, []);
  // Ordena por nome para a tabela ficar sempre previsivel
  return [...insumos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function gravarInsumos(insumos: Insumo[]): Promise<void> {
  await gravar(CHAVES.insumos, insumos);
}

// ---------------------------------------------------------------------
// Pratos
// ---------------------------------------------------------------------

export async function listarPratos(): Promise<Prato[]> {
  const pratos = await obter<Prato[]>(CHAVES.pratos, []);
  return [...pratos]
    .map((prato) => ({
      ...prato,
      // Pratos salvos antes do rendimento existir renderiam "1 porcao",
      // que era exatamente como o sistema os tratava. Nada muda para eles.
      rendimento:
        Number.isFinite(prato.rendimento) && prato.rendimento > 0 ? prato.rendimento : 1,
      unidadeRendimento: prato.unidadeRendimento ?? "un",
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function gravarPratos(pratos: Prato[]): Promise<void> {
  await gravar(CHAVES.pratos, pratos);
}

// ---------------------------------------------------------------------
// Configuracoes do negocio
// ---------------------------------------------------------------------

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const salvo = await obter<Partial<Configuracoes>>(CHAVES.config, {});
  // Mescla com o padrao para nunca faltar um campo (ex.: dado salvo por uma
  // versao antiga do sistema, de antes dos funcionarios existirem).
  return {
    ...CONFIG_PADRAO,
    ...salvo,
    funcionarios: Array.isArray(salvo.funcionarios) ? salvo.funcionarios : [],
    encargosPercentual: Number.isFinite(salvo.encargosPercentual)
      ? (salvo.encargosPercentual as number)
      : CONFIG_PADRAO.encargosPercentual,
    faturamentoMensal: Number.isFinite(salvo.faturamentoMensal)
      ? (salvo.faturamentoMensal as number)
      : CONFIG_PADRAO.faturamentoMensal,
  };
}

export async function gravarConfiguracoes(config: Configuracoes): Promise<void> {
  await gravar(CHAVES.config, config);
}

// ---------------------------------------------------------------------
// Canais de venda (balcao, iFood, 99Food...)
// ---------------------------------------------------------------------

export async function listarCanais(): Promise<CanalVenda[]> {
  const canais = await obter<CanalVenda[]>(CHAVES.canais, []);
  // Do mais barato para o mais caro: o balcao aparece primeiro
  return [...canais].sort((a, b) => a.taxaPercentual - b.taxaPercentual);
}

export async function gravarCanais(canais: CanalVenda[]): Promise<void> {
  await gravar(CHAVES.canais, canais);
}

// ---------------------------------------------------------------------
// Categorias (massas, congelados, salgados...)
// ---------------------------------------------------------------------

export async function listarCategorias(): Promise<Categoria[]> {
  const categorias = await obter<Categoria[]>(CHAVES.categorias, []);
  return [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function gravarCategorias(categorias: Categoria[]): Promise<void> {
  await gravar(CHAVES.categorias, categorias);
}

// ---------------------------------------------------------------------
// Usuario unico (o dono)
// ---------------------------------------------------------------------

export async function obterUsuario(): Promise<Usuario | null> {
  return await obter<Usuario | null>(CHAVES.usuario, null);
}

export async function gravarUsuario(usuario: Usuario): Promise<void> {
  await gravar(CHAVES.usuario, usuario);
}
