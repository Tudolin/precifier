/**
 * Diagnostico completo: captura TUDO desde o inicio (inclusive prefetch)
 * e mostra o que fica na tela depois de clicar em "Meus Pratos".
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://app:3000";

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

const capturadas = [];
pagina.on("response", async (r) => {
  const url = r.url();
  if (!url.includes("pratos")) return;
  let corpo = "";
  try {
    corpo = await r.text();
  } catch {
    corpo = "";
  }
  const h = r.request().headers();
  capturadas.push({
    momento: rotuloAtual,
    url: url.replace(BASE, ""),
    status: r.status(),
    tamanho: corpo.length,
    ocorrencias: (corpo.match(/ingredientes/g) || []).length,
    temLasanha: corpo.includes("LASANHA"),
    prefetch: h["next-router-prefetch"] ?? "-",
    rsc: h.rsc ?? "-",
  });
});

let rotuloAtual = "inicio";

await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await pagina.fill("#email", "dono@minhamassa.com.br");
await pagina.fill("#senha", "massa123");
rotuloAtual = "login";
await pagina.click('button[type="submit"]');
await pagina.waitForURL(`${BASE}/`, { timeout: 20000 });
await pagina.waitForLoadState("networkidle");

rotuloAtual = "dashboard-parado";
await pagina.waitForTimeout(2500); // deixa o prefetch acontecer

rotuloAtual = "clique";
await pagina.click('a[href="/pratos"]');
await pagina.waitForURL(`${BASE}/pratos`, { timeout: 20000 });
await pagina.waitForLoadState("networkidle");
await pagina.waitForTimeout(2500); // espera bastante, caso ainda esteja carregando

console.log("\n=== REQUISIÇÕES QUE ENVOLVERAM /pratos ===");
if (!capturadas.length) console.log("  (nenhuma)");
for (const c of capturadas) {
  console.log(
    `  [${c.momento}] ${c.status} ${c.url}  tam=${c.tamanho}  ocorrências=${c.ocorrencias}  LASANHA=${c.temLasanha}  prefetch=${c.prefetch} rsc=${c.rsc}`
  );
}

console.log("\n=== O QUE ESTÁ NA TELA ===");
const texto = (await pagina.locator("main").innerText()).split("\n").filter(Boolean);
console.log(texto.slice(0, 22).map((l) => "  " + l).join("\n"));
console.log(`\n  Linhas de tabela: ${await pagina.locator("tbody tr").count()}`);
console.log(`  Esqueleto de carregando visível: ${await pagina.locator(".esqueleto").count()}`);

await navegador.close();
