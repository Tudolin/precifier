/** Testa criação, classificação automática e filtro por categoria. */
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

await pagina.goto(`${BASE}/pratos`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

console.log("\n1) Abrindo 'Organizar em categorias'");
await pagina.click('button:has-text("Organizar em categorias")');
await pagina.waitForTimeout(600);

const botaoOrganizar = pagina.locator('button:has-text("Organizar meus produtos")');
if ((await botaoOrganizar.count()) > 0) {
  console.log("2) Classificando automaticamente...");
  await botaoOrganizar.click();
  await pagina.waitForTimeout(6000);
  await pagina.waitForLoadState("networkidle");
}

console.log("\n3) CATEGORIAS CRIADAS:");
const itens = await pagina.locator("ul li:has(button[aria-label^='Editar'])").allInnerTexts();
itens.forEach((t) => console.log("   " + t.split("\n").join(" ").replace(/\s+/g, " ")));

console.log("\n4) FILTRO POR CATEGORIA (botões):");
const botoes = await pagina.locator('button[aria-pressed]').allInnerTexts();
console.log("   " + botoes.filter((b) => b.trim()).join(" | "));

console.log("\n5) Clicando em 'Congelados'");
const btnCong = pagina.locator('button[aria-pressed]:has-text("Congelados")');
if ((await btnCong.count()) > 0) {
  await btnCong.first().click();
  await pagina.waitForTimeout(700);
  const resumo = await pagina
    .locator("text=/Mostrando \\d+ a \\d+ de \\d+/")
    .first()
    .textContent();
  console.log("   " + resumo);
  const nomes = await pagina.locator("tbody tr td:first-child").allInnerTexts();
  nomes.slice(0, 5).forEach((n) => console.log("     " + n.split("\n").slice(0, 2).join(" | ")));
}

console.log("\n6) Clicando em 'Bebidas'");
const btnBeb = pagina.locator('button[aria-pressed]:has-text("Bebidas")');
if ((await btnBeb.count()) > 0) {
  await btnBeb.first().click();
  await pagina.waitForTimeout(700);
  const resumo = await pagina
    .locator("text=/Mostrando \\d+ a \\d+ de \\d+/")
    .first()
    .textContent();
  console.log("   " + resumo);
  const nomes = await pagina.locator("tbody tr td:first-child").allInnerTexts();
  nomes.slice(0, 5).forEach((n) => console.log("     " + n.split("\n").slice(0, 2).join(" | ")));
}

console.log(`\n   Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
