/**
 * Relatorio rapido: mostra quais produtos estao com prejuizo ou margem
 * baixa, segundo os custos ESTIMADOS. Serve para o dono saber por onde
 * comecar a revisao.
 *
 * Uso: docker compose exec app node scripts/relatorio.mjs
 */
import fs from "node:fs";

const ler = (c) => JSON.parse(fs.readFileSync(c, "utf8").replace(/^﻿/, ""));
const insumos = ler("scripts/saida-insumos.json");
const pratos = ler("scripts/saida-pratos.json");

const porId = new Map(insumos.map((i) => [i.id, i]));
const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",");

const linhas = pratos.map((p) => {
  const custoReceita = p.ingredientes.reduce((s, ing) => {
    const i = porId.get(ing.insumoId);
    if (!i) return s;
    return s + (ing.quantidade * i.preco) / (i.rendimento / 100);
  }, 0);
  const rende = p.rendimento > 0 ? p.rendimento : 1;
  const custoUnit = custoReceita / rende;
  const margem = p.precoVenda > 0 ? ((p.precoVenda - custoUnit) / p.precoVenda) * 100 : null;
  return { nome: p.nome, preco: p.precoVenda, custoUnit, margem, un: p.unidadeRendimento };
});

const semPreco = linhas.filter((l) => l.margem === null);
const prejuizo = linhas.filter((l) => l.margem !== null && l.margem < 0).sort((a, b) => a.margem - b.margem);
const baixa = linhas.filter((l) => l.margem !== null && l.margem >= 0 && l.margem < 30).sort((a, b) => a.margem - b.margem);
const ok = linhas.filter((l) => l.margem !== null && l.margem >= 30);

console.log(`\n=== PREJUIZO (${prejuizo.length}) — custo maior que o preco ===`);
for (const l of prejuizo) {
  console.log(`  ${l.nome.padEnd(24)} vende ${brl(l.preco).padStart(9)}/${l.un}  custa ${brl(l.custoUnit).padStart(9)}  ${l.margem.toFixed(1)}%`);
}

console.log(`\n=== MARGEM ABAIXO DE 30% (${baixa.length}) ===`);
for (const l of baixa) {
  console.log(`  ${l.nome.padEnd(24)} vende ${brl(l.preco).padStart(9)}/${l.un}  custa ${brl(l.custoUnit).padStart(9)}  ${l.margem.toFixed(1)}%`);
}

console.log(`\n=== SEM PRECO NO PDV (${semPreco.length}) — o sistema vai sugerir um ===`);
console.log("  " + semPreco.map((l) => l.nome).join(", "));

console.log(`\n=== RESUMO ===`);
console.log(`  Prejuízo ............ ${prejuizo.length}`);
console.log(`  Margem < 30% ........ ${baixa.length}`);
console.log(`  Margem >= 30% ....... ${ok.length}`);
console.log(`  Sem preço ........... ${semPreco.length}`);
console.log(`  TOTAL ............... ${linhas.length}`);
