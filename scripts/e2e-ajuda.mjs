/** Testa a central de ajuda e os links contextuais das telas. */
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

console.log("\n1) Abrindo 'Ajuda e Dicas' pelo menu");
await pagina.click('a[href="/ajuda"]');
await pagina.waitForURL(`${BASE}/ajuda`, { timeout: 20000 });
await pagina.waitForTimeout(1200);

console.log("\n2) ASSUNTOS DISPONÍVEIS:");
const titulos = await pagina.locator("main section h2 button").allInnerTexts();
titulos.forEach((t) => console.log("   - " + t.split("\n").join(" — ")));

console.log("\n3) Todos começam fechados?");
console.log(`   blocos abertos: ${await pagina.locator('main section h2 button[aria-expanded="true"]').count()}`);

console.log("\n4) Clicando em 'Margem de lucro'");
await pagina.click('button:has-text("Margem de lucro")');
await pagina.waitForTimeout(500);
const texto = await pagina.locator("#margem").innerText();
console.log("   trecho: " + texto.split("\n").slice(2, 5).join(" ").slice(0, 160) + "...");

console.log("\n5) Testando link direto /ajuda#delivery (deve abrir sozinho)");
await pagina.goto(`${BASE}/ajuda#delivery`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1200);
const deliveryAberto = await pagina
  .locator('#delivery button[aria-expanded="true"]')
  .count();
console.log(`   bloco 'delivery' abriu sozinho: ${deliveryAberto > 0}`);

console.log("\n6) Links contextuais nas telas:");
for (const [rota, texto] of [
  ["/configuracoes", "O que é faturamento?"],
  ["/pratos", "Como preencher o rendimento"],
  ["/insumos", "O que é o rendimento do insumo?"],
  ["/delivery", "Entenda por que não basta somar"],
]) {
  await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(500);
  const achou = await pagina.locator(`a:has-text("${texto}")`).count();
  console.log(`   ${rota.padEnd(16)} -> "${texto}": ${achou > 0 ? "OK" : "NÃO ENCONTRADO"}`);
}

console.log("\n7) Clicando no link de Custos da Casa e vendo se abre a seção certa");
await pagina.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
await pagina.click('a:has-text("O que é faturamento?")');
await pagina.waitForURL(/ajuda/, { timeout: 20000 });
await pagina.waitForTimeout(1200);
const fatAberto = await pagina.locator('#faturamento button[aria-expanded="true"]').count();
console.log(`   seção 'faturamento' abriu: ${fatAberto > 0}`);

console.log(`\n   Erros de JavaScript: ${erros.length ? erros.join(" | ") : "nenhum"}`);
await navegador.close();
