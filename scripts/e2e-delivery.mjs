/** Testa a tela de Delivery de ponta a ponta. */
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://app:3000";
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(e.message));

await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await pagina.fill("#email", "dono@minhamassa.com.br");
await pagina.fill("#senha", "massa123");
await pagina.click('button[type="submit"]');
await pagina.waitForURL(`${BASE}/`, { timeout: 20000 });

await pagina.goto(`${BASE}/delivery`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

const botaoSugerir = pagina.locator('button:has-text("Cadastrar os mais comuns")');
if ((await botaoSugerir.count()) > 0) {
  console.log("\n1) Cadastrando os canais sugeridos");
  await botaoSugerir.click();
  await pagina.waitForTimeout(4000);
} else {
  console.log("\n1) Canais já cadastrados");
}

console.log("\n2) ONDE EU VENDO");
const canais = await pagina.locator("main table").first().locator("tbody tr").allInnerTexts();
canais.forEach((l) => console.log("   " + l.split("\n").join(" | ")));

console.log("\n3) PREÇOS POR CANAL");
const tabelas = await pagina.locator("main table").count();
if (tabelas < 2) {
  console.log("   (tabela de preços não apareceu)");
} else {
  const precos = pagina.locator("main table").nth(1);
  const cols = await precos.locator("thead th").allInnerTexts();
  console.log("   COLUNAS: " + cols.map((c) => c.split("\n").join(" ")).join(" / "));
  const linhas = await precos.locator("tbody tr").allInnerTexts();
  linhas.slice(0, 5).forEach((l) => console.log("   " + l.split("\n").join(" | ")));

  console.log("\n4) BUSCA na tabela de preços");
  await pagina.locator('main input[type="search"]').last().fill("lasanha bolonhesa");
  await pagina.waitForTimeout(700);
  const achadas = await precos.locator("tbody tr").allInnerTexts();
  achadas.forEach((l) => console.log("   " + l.split("\n").join(" | ")));
}

console.log(`\n   Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
