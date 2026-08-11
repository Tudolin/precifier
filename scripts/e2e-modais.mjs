/** Testa as janelas de edição (popup) de insumos, pratos e canais. */
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

const modal = pagina.locator('[role="dialog"][aria-modal="true"]');

// ============ INSUMOS ============
console.log("\n=== INSUMOS ===");
await pagina.goto(`${BASE}/insumos`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);

console.log(`  janela fechada no início: ${(await modal.count()) === 0}`);

await pagina.click('button:has-text("Novo insumo")');
await pagina.waitForTimeout(500);
console.log(`  abriu ao clicar em "Novo insumo": ${(await modal.count()) > 0}`);
console.log(`  título: ${await modal.locator("h2").first().innerText()}`);

// Esc fecha
await pagina.keyboard.press("Escape");
await pagina.waitForTimeout(400);
console.log(`  fechou com Esc: ${(await modal.count()) === 0}`);

// Editar um insumo existente
await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(600);
console.log(`  abriu na edição: ${(await modal.count()) > 0}`);
console.log(`  título: ${await modal.locator("h2").first().innerText()}`);
const valorNome = await modal.locator("#nome").inputValue();
console.log(`  campo veio preenchido: "${valorNome}"`);

// Clicar fora NÃO pode fechar (evita perder o que foi digitado)
await pagina.mouse.click(10, 10);
await pagina.waitForTimeout(400);
console.log(`  clique fora NÃO fechou (proposital): ${(await modal.count()) > 0}`);

// Cancelar fecha
await modal.locator('button:has-text("Cancelar")').click();
await pagina.waitForTimeout(400);
console.log(`  fechou no Cancelar: ${(await modal.count()) === 0}`);

// ============ PRATOS ============
console.log("\n=== PRATOS ===");
await pagina.goto(`${BASE}/pratos`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(800);
console.log(`  abriu a ficha técnica: ${(await modal.count()) > 0}`);
console.log(`  título: ${await modal.locator("h2").first().innerText()}`);
console.log(`  nome do prato no campo: "${await modal.locator("#nome-prato").inputValue()}"`);
console.log(`  rendimento: ${await modal.locator("#rendimento-prato").inputValue()}`);
console.log(`  ingredientes na receita: ${await modal.locator('select[id^="insumo-"]').count()}`);

// Cálculo em tempo real dentro da janela
const antes = await modal.locator("text=/Custo total de 1/").first().innerText();
await modal.locator('input[id^="qtd-"]').first().fill("5");
await pagina.waitForTimeout(600);
const depois = await modal.locator("text=/Custo total de 1/").first().innerText();
console.log(`  cálculo em tempo real dentro da janela: ${antes !== depois}`);

await modal.locator('button:has-text("Cancelar")').click();
await pagina.waitForTimeout(500);
console.log(`  fechou sem salvar: ${(await modal.count()) === 0}`);

// ============ CANAIS ============
console.log("\n=== DELIVERY (canais) ===");
await pagina.goto(`${BASE}/delivery`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);
await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(600);
console.log(`  abriu a janela do canal: ${(await modal.count()) > 0}`);
console.log(`  título: ${await modal.locator("h2").first().innerText()}`);

// ============ SALVAMENTO REAL ============
console.log("\n=== SALVANDO DE VERDADE (insumo) ===");
await pagina.goto(`${BASE}/insumos`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);
await pagina.fill('input[type="search"]', "Ovos");
await pagina.waitForTimeout(600);
await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(600);
const precoAntes = await modal.locator("#preco").inputValue();
await modal.locator("#preco").fill("1,75");
await modal.locator('button:has-text("Salvar insumo")').click();
await pagina.waitForTimeout(3500);
console.log(`  janela fechou após salvar: ${(await modal.count()) === 0}`);
const linha = await pagina.locator("tbody tr").first().innerText();
console.log(`  linha na tabela: ${linha.split("\n").join(" | ")}`);

// devolve o valor original
await pagina.locator('button[aria-label^="Editar"]').first().click();
await pagina.waitForTimeout(600);
await modal.locator("#preco").fill(precoAntes);
await modal.locator('button:has-text("Salvar insumo")').click();
await pagina.waitForTimeout(3000);
console.log(`  valor original (${precoAntes}) restaurado`);

console.log(`\n  Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
