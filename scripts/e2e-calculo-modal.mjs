/** Confere se o cálculo em tempo real continua funcionando dentro do popup. */
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
await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(900);

const modal = pagina.locator('[role="dialog"]');
// A caixa de resumo é a que tem fundo massa-50
const resumo = modal.locator("div.bg-massa-50").first();

async function lerResumo() {
  return (await resumo.innerText()).split("\n").filter(Boolean).join(" | ");
}

console.log("\nANTES de mexer:");
console.log("  " + (await lerResumo()));

const primeiraQtd = modal.locator('input[id^="qtd-"]').first();
const valorOriginal = await primeiraQtd.inputValue();
await primeiraQtd.fill("99");
await pagina.waitForTimeout(700);

console.log("\nDEPOIS de trocar a quantidade do 1º ingrediente para 99:");
const depois = await lerResumo();
console.log("  " + depois);

console.log("\nMargem e preço sugerido reagiram?");
const margemTexto = await modal.locator("text=/Sua margem de lucro real/").first().locator("..").innerText();
console.log("  " + margemTexto.split("\n").filter(Boolean).join(" | "));

// Devolve o valor e fecha sem salvar
await primeiraQtd.fill(valorOriginal);
await pagina.waitForTimeout(400);
console.log("\nAo voltar a quantidade original:");
console.log("  " + (await lerResumo()));

await modal.locator('button:has-text("Cancelar")').click();
console.log(`\n  Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
