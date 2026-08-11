/**
 * Reproduz num navegador de verdade o caminho que o dono faz:
 *   login -> Início -> clicar em "Meus Pratos" (SEM F5)
 * e conta o que aparece na tela.
 *
 * Uso (a partir do Windows):
 *   docker run --rm --network precifier_default -v c:/TESTE/precifier/scripts:/w -w /w \
 *     mcr.microsoft.com/playwright:v1.49.1-jammy \
 *     sh -c "npm i -s playwright-core@1.49.1 && node e2e-navegacao.mjs"
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://app:3000";
const EMAIL = process.env.EMAIL ?? "dono@minhamassa.com.br";
const SENHA = process.env.SENHA ?? "massa123";

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

const erros = [];
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push(m.text());
});
pagina.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));

async function medir(rotulo) {
  const resumo = await pagina
    .locator("text=/Mostrando \\d+ a \\d+ de \\d+/")
    .first()
    .textContent()
    .catch(() => "(sem resumo)");
  const linhas = await pagina.locator("tbody tr").count();
  console.log(`  ${rotulo.padEnd(34)} linhas=${String(linhas).padStart(3)}  ${resumo}`);
  return { linhas, resumo };
}

console.log("\n1) Login");
await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await pagina.fill("#email", EMAIL);
await pagina.fill("#senha", SENHA);
await pagina.click('button[type="submit"]');
await pagina.waitForURL(`${BASE}/`, { timeout: 20000 });
await pagina.waitForLoadState("networkidle");
console.log("   ok, entrou no sistema");

console.log("\n2) Estado inicial");
await medir("Início (após login)");

console.log("\n3) Clicando em 'Meus Pratos' pelo MENU (sem F5)");
await pagina.click('a[href="/pratos"]');
await pagina.waitForURL(`${BASE}/pratos`, { timeout: 20000 });
await pagina.waitForLoadState("networkidle");
const navegando = await medir("Meus Pratos (via menu)");

console.log("\n4) Agora dando F5 na mesma tela");
await pagina.reload({ waitUntil: "networkidle" });
const comF5 = await medir("Meus Pratos (após F5)");

console.log("\n5) Indo e voltando pelo menu várias vezes");
for (let i = 1; i <= 3; i++) {
  await pagina.click('a[href="/"]');
  await pagina.waitForURL(`${BASE}/`, { timeout: 20000 });
  await pagina.waitForLoadState("networkidle");
  await pagina.click('a[href="/pratos"]');
  await pagina.waitForURL(`${BASE}/pratos`, { timeout: 20000 });
  await pagina.waitForLoadState("networkidle");
  await medir(`volta ${i} a Meus Pratos`);
}

console.log("\n=== VEREDITO ===");
if (navegando.linhas === comF5.linhas) {
  console.log(`  OK: menu e F5 mostram a MESMA coisa (${comF5.linhas} linhas).`);
} else {
  console.log(`  BUG CONFIRMADO: pelo menu ${navegando.linhas} linhas, com F5 ${comF5.linhas}.`);
}

if (erros.length) {
  console.log("\n=== ERROS DE JAVASCRIPT NA TELA ===");
  for (const e of [...new Set(erros)].slice(0, 10)) console.log("  " + e);
}

await navegador.close();
