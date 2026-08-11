/** Testa os filtros rápidos, a ordenação e o guia de primeiros passos. */
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
await pagina.waitForLoadState("networkidle");

const resumo = () =>
  pagina
    .locator("text=/Mostrando \\d+ a \\d+ de \\d+/")
    .first()
    .textContent()
    .catch(() => "(vazio)");

console.log("\n=== GUIA 'POR ONDE COMEÇAR' ===");
const guia = await pagina.locator("text=Por onde começar").count();
console.log(`  visível: ${guia > 0}`);
if (guia > 0) {
  const itens = await pagina.locator("ol li").allInnerTexts();
  itens.forEach((t) => console.log("   - " + t.split("\n").slice(0, 2).join(" | ")));
}

console.log("\n=== FILTROS RÁPIDOS ===");
for (const rotulo of ["Todos", "Dando prejuízo", "Abaixo da meta", "Sem preço"]) {
  await pagina.click(`button:has-text("${rotulo}")`);
  await pagina.waitForTimeout(400);
  const linhas = await pagina.locator("tbody tr").count();
  console.log(`  ${rotulo.padEnd(16)} -> linhas=${String(linhas).padStart(2)}  ${await resumo()}`);
}

console.log("\n=== ORDENAÇÃO (com filtro 'Dando prejuízo') ===");
await pagina.click('button:has-text("Dando prejuízo")');
await pagina.waitForTimeout(300);
for (const ordem of ["pior", "melhor"]) {
  await pagina.selectOption("#ordenar", ordem);
  await pagina.waitForTimeout(400);
  const primeiro = await pagina.locator("tbody tr").first().innerText();
  console.log(`  ${ordem.padEnd(7)} -> primeiro da lista: ${primeiro.split("\n")[0]}`);
}

console.log("\n=== BUSCA JUNTO COM FILTRO ===");
await pagina.click('button:has-text("Todos")');
await pagina.fill('input[type="search"]', "lasanha");
await pagina.waitForTimeout(500);
console.log(`  buscando "lasanha" -> ${await resumo()}`);

console.log(`\n  Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
