/**
 * Teste rapido da logica de busca (mesma regra usada em usarListaPaginada).
 * Uso: docker compose exec app node scripts/testar-busca.mjs
 */

const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function encontra(nome, busca) {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  const alvo = normalizar(nome);
  return palavras.every((p) => alvo.includes(p));
}

const casos = [
  // [nome do prato, o que o dono digita, deveria achar?]
  ["MACARRÃO", "macarrao", true],
  ["MACARRAO", "macarrão", true],
  ["LASANHA BOLONHESA", "lasanha bol", true],
  ["LASANHA DE FRANGO", "lasanha frango", true],
  ["CAPELETI DE FRANGO", "frango", true],
  ["TORTEI DE ABÓBORA", "abobora", true],
  ["NHOQUE BATATA SALSA", "batata", true],
  ["6COXINHA PQ.", "coxinha", true],
  ["COCA-COLA 2L", "coca", true],
  ["COCA-COLA 2L", "pizza", false],
  ["RAVIOLI DE CARNE", "ravioli queijo", false],
  ["MOLHO AO SUGO", "  molho  ", true],
];

let falhas = 0;
for (const [nome, busca, esperado] of casos) {
  const obtido = encontra(nome, busca);
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(
    `${ok ? "OK   " : "FALHA"}  procurar "${busca}" em "${nome}" -> ${obtido} (esperado ${esperado})`
  );
}

console.log(`\n${casos.length - falhas} de ${casos.length} passaram.`);
process.exit(falhas === 0 ? 0 : 1);
