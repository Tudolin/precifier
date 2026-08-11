/**
 * Prova que o preço sugerido para cada app devolve a MESMA margem
 * que o dono já tem no balcão.
 */
const arredondarParaCima = (v) => Math.ceil(v * 100) / 100;
const arredondar = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;

function precoQueFechaAConta(custo, { custoFixo = 0, margem = 0, taxaCanal = 0 }, taxaFixa = 0) {
  const divisor = 1 - (custoFixo + margem + taxaCanal) / 100;
  if (divisor <= 0) return 0;
  return arredondarParaCima((custo + taxaFixa) / divisor);
}

const margemReal = (preco, custoTotal) =>
  !preco || preco <= 0 ? 0 : arredondar(((preco - custoTotal) / preco) * 100, 1);

// Casos reais do cadastro do dono
const PERCENTUAL_FIXO = 30; // contas da casa
const produtos = [
  { nome: "LASANHA BOLONHESA", ingredientes: 29.03, precoBalcao: 64.9 },
  { nome: "6COXINHA PQ.", ingredientes: 1.06, precoBalcao: 1.1 },
  { nome: "MACARRAO", ingredientes: 12.5, precoBalcao: 36.9 },
  { nome: "FRANGO ASSADO", ingredientes: 18.0, precoBalcao: 38.9 },
];
const canais = [
  { nome: "Balcão", taxa: 0, fixa: 0 },
  { nome: "iFood próprio", taxa: 12, fixa: 0 },
  { nome: "99Food", taxa: 20, fixa: 0 },
  { nome: "iFood app", taxa: 27, fixa: 0 },
];

let falhas = 0;

for (const p of produtos) {
  const contasHoje = (p.precoBalcao * PERCENTUAL_FIXO) / 100;
  const margemHoje = margemReal(p.precoBalcao, p.ingredientes + contasHoje);

  console.log(`\n${p.nome}`);
  console.log(
    `  balcão: R$ ${p.precoBalcao.toFixed(2)} | ingredientes R$ ${p.ingredientes.toFixed(2)} | lucro de hoje = ${margemHoje.toFixed(1)}%`
  );

  for (const c of canais) {
    const preco = precoQueFechaAConta(
      p.ingredientes,
      { custoFixo: PERCENTUAL_FIXO, margem: margemHoje, taxaCanal: c.taxa },
      c.fixa
    );

    // Prova: recalcular a margem partindo do preço sugerido
    const taxaApp = (preco * c.taxa) / 100 + c.fixa;
    const contas = (preco * PERCENTUAL_FIXO) / 100;
    const lucro = preco - taxaApp - contas - p.ingredientes;
    const margemNoApp = (lucro / preco) * 100;

    const ok = Math.abs(margemNoApp - margemHoje) < 0.6;
    if (!ok) falhas++;

    console.log(
      `    ${c.nome.padEnd(14)} R$ ${preco.toFixed(2).padStart(8)}  -> lucro ${margemNoApp.toFixed(1).padStart(5)}%  ${ok ? "OK (igual ao balcão)" : "FALHA"}`
    );
  }
}

console.log(`\n${falhas === 0 ? "TODOS OS CANAIS devolvem a mesma margem do balcão." : falhas + " falhas"}`);
process.exit(falhas === 0 ? 0 : 1);
