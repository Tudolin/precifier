/**
 * Confere a fórmula do preço com taxas.
 * A prova é sempre a mesma: partir do preço calculado, descontar TUDO
 * (taxa do app, contas da casa, ingredientes) e ver se o que sobra é
 * exatamente a margem desejada.
 */

const arredondarParaCima = (v) => Math.ceil(v * 100) / 100;

function precoQueFechaAConta(custo, { custoFixo = 0, margem = 0, taxaCanal = 0 }, taxaFixa = 0) {
  const soma = custoFixo + margem + taxaCanal;
  const divisor = 1 - soma / 100;
  if (divisor <= 0) return 0;
  return arredondarParaCima((custo + taxaFixa) / divisor);
}

const casos = [
  { nome: "Balcão (sem taxa)", custo: 10, fixo: 30, margem: 20, taxa: 0, taxaFixa: 0 },
  { nome: "iFood entrega app", custo: 10, fixo: 30, margem: 20, taxa: 27, taxaFixa: 0 },
  { nome: "iFood entrega própria", custo: 10, fixo: 30, margem: 20, taxa: 12, taxaFixa: 0 },
  { nome: "99Food", custo: 10, fixo: 30, margem: 20, taxa: 20, taxaFixa: 0 },
  { nome: "Com taxa fixa R$ 2", custo: 10, fixo: 30, margem: 20, taxa: 20, taxaFixa: 2 },
  { nome: "Sem custo fixo", custo: 30, fixo: 0, margem: 60, taxa: 27, taxaFixa: 0 },
  { nome: "Impossível (soma 100%)", custo: 10, fixo: 50, margem: 30, taxa: 25, taxaFixa: 0 },
];

let falhas = 0;
console.log("nome                     preço     -taxa app  -contas   -ingred = lucro   margem");
console.log("-".repeat(88));

for (const c of casos) {
  const preco = precoQueFechaAConta(
    c.custo,
    { custoFixo: c.fixo, margem: c.margem, taxaCanal: c.taxa },
    c.taxaFixa
  );

  if (preco === 0) {
    const soma = c.fixo + c.margem + c.taxa;
    const ok = soma >= 100;
    if (!ok) falhas++;
    console.log(`${c.nome.padEnd(24)} ${ok ? "0 (correto: soma = " + soma + "%)" : "FALHA"}`);
    continue;
  }

  // A prova: descontar tudo do preço
  const taxaApp = (preco * c.taxa) / 100 + c.taxaFixa;
  const contas = (preco * c.fixo) / 100;
  const lucro = preco - taxaApp - contas - c.custo;
  const margemReal = (lucro / preco) * 100;

  // O arredondamento para cima faz a margem sobrar alguns centésimos
  const ok = margemReal >= c.margem - 0.01 && margemReal <= c.margem + 0.5;
  if (!ok) falhas++;

  console.log(
    `${c.nome.padEnd(24)} ${preco.toFixed(2).padStart(7)}  ${taxaApp.toFixed(2).padStart(8)}  ` +
      `${contas.toFixed(2).padStart(7)}  ${c.custo.toFixed(2).padStart(7)} = ` +
      `${lucro.toFixed(2).padStart(6)}  ${margemReal.toFixed(2).padStart(6)}% ${ok ? "OK" : "FALHA"}`
  );
}

console.log("-".repeat(88));
console.log(`${casos.length - falhas} de ${casos.length} passaram.`);
process.exit(falhas === 0 ? 0 : 1);
