/**
 * ---------------------------------------------------------------------
 * IMPORTADOR DO PDV
 * ---------------------------------------------------------------------
 * Le a lista de produtos exportada do pdv_database.db e monta, para cada
 * um, uma ficha tecnica ESTIMADA (ingredientes + quantidades).
 *
 * ATENCAO: os precos dos insumos e as quantidades das receitas sao
 * ESTIMATIVAS de mercado, para adiantar o cadastro. O dono precisa
 * revisar insumo por insumo com as notas fiscais dele.
 *
 * Uso:
 *   docker compose exec app node scripts/importar-pdv.mjs
 *
 * Gera: scripts/saida-insumos.json e scripts/saida-pratos.json
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const arq = (nome) => path.join(RAIZ, nome);

// =====================================================================
// 1) CATALOGO DE INSUMOS (precos estimados de atacado)
// =====================================================================
// chave: usada nas receitas | preco: R$ por unidade | rendimento: % aproveitado
const INSUMOS = {
  // --- Secos e basicos ---
  farinha:      { nome: "Farinha de trigo",          unidade: "kg", preco: 5.5,  rendimento: 100 },
  semolina:     { nome: "Semolina de grano duro",    unidade: "kg", preco: 9.0,  rendimento: 100 },
  ovos:         { nome: "Ovos",                      unidade: "un", preco: 0.9,  rendimento: 100 },
  sal:          { nome: "Sal e temperos",            unidade: "kg", preco: 12.0, rendimento: 100 },
  oleo:         { nome: "Óleo de soja",              unidade: "L",  preco: 8.0,  rendimento: 100 },
  azeite:       { nome: "Azeite de oliva",           unidade: "L",  preco: 45.0, rendimento: 100 },
  manteiga:     { nome: "Manteiga",                  unidade: "kg", preco: 45.0, rendimento: 100 },
  leite:        { nome: "Leite",                     unidade: "L",  preco: 5.0,  rendimento: 100 },
  cremeLeite:   { nome: "Creme de leite",            unidade: "L",  preco: 14.0, rendimento: 100 },
  arroz:        { nome: "Arroz",                     unidade: "kg", preco: 6.0,  rendimento: 100 },
  farMandioca:  { nome: "Farinha de mandioca",       unidade: "kg", preco: 8.0,  rendimento: 100 },
  trigoKibe:    { nome: "Trigo para quibe",          unidade: "kg", preco: 10.0, rendimento: 100 },
  fermento:     { nome: "Fermento biológico",        unidade: "kg", preco: 30.0, rendimento: 100 },

  // --- Queijos e laticinios ---
  mussarela:    { nome: "Mussarela",                 unidade: "kg", preco: 42.0, rendimento: 100 },
  mussBufala:   { nome: "Mussarela de búfala",       unidade: "kg", preco: 70.0, rendimento: 100 },
  ricota:       { nome: "Ricota",                    unidade: "kg", preco: 22.0, rendimento: 100 },
  parmesao:     { nome: "Parmesão",                  unidade: "kg", preco: 75.0, rendimento: 100 },
  provolone:    { nome: "Provolone",                 unidade: "kg", preco: 55.0, rendimento: 100 },
  gorgonzola:   { nome: "Gorgonzola",                unidade: "kg", preco: 62.0, rendimento: 100 },
  catupiry:     { nome: "Requeijão / catupiry",      unidade: "kg", preco: 35.0, rendimento: 100 },

  // --- Carnes ---
  carneMoida:   { nome: "Carne moída (patinho)",     unidade: "kg", preco: 34.0, rendimento: 85 },
  peitoFrango:  { nome: "Peito de frango",           unidade: "kg", preco: 18.0, rendimento: 90 },
  frangoInt:    { nome: "Frango inteiro",            unidade: "kg", preco: 12.0, rendimento: 70 },
  chester:      { nome: "Chester",                   unidade: "kg", preco: 22.0, rendimento: 70 },
  presunto:     { nome: "Presunto",                  unidade: "kg", preco: 28.0, rendimento: 100 },
  peitoPeru:    { nome: "Peito de peru (fatiado)",   unidade: "kg", preco: 45.0, rendimento: 100 },
  bacon:        { nome: "Bacon",                     unidade: "kg", preco: 32.0, rendimento: 90 },
  salsicha:     { nome: "Salsicha",                  unidade: "kg", preco: 14.0, rendimento: 100 },
  atum:         { nome: "Atum em lata",              unidade: "kg", preco: 60.0, rendimento: 100 },
  costelaBov:   { nome: "Costela bovina",            unidade: "kg", preco: 38.0, rendimento: 70 },
  alcatraSuina: { nome: "Alcatra suína",             unidade: "kg", preco: 24.0, rendimento: 80 },
  pernil:       { nome: "Pernil suíno",              unidade: "kg", preco: 19.0, rendimento: 75 },
  lombo:        { nome: "Lombo suíno",               unidade: "kg", preco: 26.0, rendimento: 85 },
  picanhaSuina: { nome: "Picanha suína",             unidade: "kg", preco: 28.0, rendimento: 85 },
  costelaSuina: { nome: "Costela suína",             unidade: "kg", preco: 25.0, rendimento: 70 },
  postaBov:     { nome: "Posta bovina (coxão)",      unidade: "kg", preco: 39.0, rendimento: 85 },
  bifeBov:      { nome: "Bife bovino (coxão mole)",  unidade: "kg", preco: 36.0, rendimento: 85 },

  // --- Legumes e verduras ---
  batata:       { nome: "Batata",                    unidade: "kg", preco: 5.0,  rendimento: 80 },
  cebola:       { nome: "Cebola",                    unidade: "kg", preco: 5.0,  rendimento: 85 },
  alho:         { nome: "Alho",                      unidade: "kg", preco: 25.0, rendimento: 85 },
  cenoura:      { nome: "Cenoura",                   unidade: "kg", preco: 5.0,  rendimento: 80 },
  espinafre:    { nome: "Espinafre",                 unidade: "kg", preco: 12.0, rendimento: 60 },
  abobora:      { nome: "Abóbora",                   unidade: "kg", preco: 5.0,  rendimento: 70 },
  palmito:      { nome: "Palmito",                   unidade: "kg", preco: 35.0, rendimento: 100 },
  funghi:       { nome: "Funghi / champignon",       unidade: "kg", preco: 60.0, rendimento: 100 },
  milhoErvilha: { nome: "Milho e ervilha",           unidade: "kg", preco: 12.0, rendimento: 100 },
  tomatePelado: { nome: "Tomate pelado",             unidade: "kg", preco: 9.0,  rendimento: 100 },
  molhoTomate:  { nome: "Molho de tomate",           unidade: "kg", preco: 7.0,  rendimento: 100 },
  tomateSeco:   { nome: "Tomate seco",               unidade: "kg", preco: 55.0, rendimento: 100 },
  maionese:     { nome: "Maionese",                  unidade: "kg", preco: 14.0, rendimento: 100 },
  batataPalha:  { nome: "Batata palha",              unidade: "kg", preco: 25.0, rendimento: 100 },

  // --- Doces ---
  acucar:       { nome: "Açúcar",                    unidade: "kg", preco: 4.5,  rendimento: 100 },
  leiteCond:    { nome: "Leite condensado",          unidade: "kg", preco: 20.0, rendimento: 100 },
  chocolatePo:  { nome: "Chocolate em pó",           unidade: "kg", preco: 30.0, rendimento: 100 },
  cocoRalado:   { nome: "Coco ralado",               unidade: "kg", preco: 30.0, rendimento: 100 },
  morango:      { nome: "Morango",                   unidade: "kg", preco: 25.0, rendimento: 85 },
  banana:       { nome: "Banana",                    unidade: "kg", preco: 6.0,  rendimento: 65 },
  limao:        { nome: "Limão",                     unidade: "kg", preco: 6.0,  rendimento: 40 },
  goiabada:     { nome: "Goiabada",                  unidade: "kg", preco: 18.0, rendimento: 100 },
  damasco:      { nome: "Damasco seco",              unidade: "kg", preco: 60.0, rendimento: 100 },
  castanhas:    { nome: "Castanhas",                 unidade: "kg", preco: 70.0, rendimento: 100 },
  nozes:        { nome: "Nozes",                     unidade: "kg", preco: 90.0, rendimento: 100 },
  biscoito:     { nome: "Biscoito para base",        unidade: "kg", preco: 20.0, rendimento: 100 },

  // --- Embalagem ---
  embalagem:    { nome: "Embalagem (bandeja + filme)", unidade: "un", preco: 1.8, rendimento: 100 },

  // --- Revenda (bebidas e afins): custo de COMPRA por unidade ---
  cCoca2l:      { nome: "[Compra] Coca-Cola 2L",           unidade: "un", preco: 8.5,  rendimento: 100 },
  cCoca350:     { nome: "[Compra] Coca-Cola 350ml",        unidade: "un", preco: 3.2,  rendimento: 100 },
  cFanta350:    { nome: "[Compra] Fanta 350ml",            unidade: "un", preco: 2.9,  rendimento: 100 },
  cGuarana350:  { nome: "[Compra] Guaraná 350ml",          unidade: "un", preco: 2.9,  rendimento: 100 },
  cDelValle:    { nome: "[Compra] Suco Del Valle 350ml",   unidade: "un", preco: 3.5,  rendimento: 100 },
  cAguaSem:     { nome: "[Compra] Água sem gás",           unidade: "un", preco: 1.2,  rendimento: 100 },
  cAguaCom:     { nome: "[Compra] Água com gás",           unidade: "un", preco: 1.6,  rendimento: 100 },
  cCerveja:     { nome: "[Compra] Cerveja Itaipava",       unidade: "un", preco: 3.2,  rendimento: 100 },
  cSucoUva:     { nome: "[Compra] Suco de uva integral 1L",unidade: "un", preco: 11.0, rendimento: 100 },
  cMixCast:     { nome: "[Compra] Mix de castanhas (pct)", unidade: "un", preco: 1.8,  rendimento: 100 },
  cParmRalado:  { nome: "[Compra] Parmesão ralado",        unidade: "kg", preco: 75.0, rendimento: 100 },
};

// =====================================================================
// 2) FICHAS TECNICAS POR FAMILIA
// =====================================================================
// Massas e pratos por peso rendem 1 kg. Salgadinhos rendem 50 unidades.
// Bebidas rendem 1 unidade (o "ingrediente" e a propria bebida comprada).
const R = (rendimento, unidade, ingredientes) => ({ rendimento, unidade, ingredientes });

const RECEITAS = {
  // ---------- Massas simples (1 kg) ----------
  massaSimples: R(1, "kg", [["farinha", 0.62], ["semolina", 0.1], ["ovos", 5], ["oleo", 0.02], ["sal", 0.01], ["embalagem", 1]]),
  massaVerde:   R(1, "kg", [["farinha", 0.58], ["semolina", 0.1], ["ovos", 5], ["espinafre", 0.12], ["oleo", 0.02], ["sal", 0.01], ["embalagem", 1]]),
  massaCozida:  R(1, "kg", [["farinha", 0.42], ["semolina", 0.07], ["ovos", 3], ["oleo", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  massaPastel:  R(1, "kg", [["farinha", 0.72], ["oleo", 0.05], ["sal", 0.01], ["embalagem", 1]]),
  massaLasanha: R(1, "kg", [["farinha", 0.6], ["semolina", 0.12], ["ovos", 4], ["oleo", 0.02], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Massas recheadas (1 kg = ~55% massa + 45% recheio) ----------
  rechCarne:    R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["carneMoida", 0.33], ["cebola", 0.04], ["alho", 0.005], ["sal", 0.01], ["oleo", 0.02], ["embalagem", 1]]),
  rechFrango:   R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["peitoFrango", 0.3], ["catupiry", 0.08], ["cebola", 0.04], ["sal", 0.01], ["oleo", 0.02], ["embalagem", 1]]),
  rechFrangoCat:R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["peitoFrango", 0.26], ["catupiry", 0.14], ["cebola", 0.03], ["sal", 0.01], ["oleo", 0.02], ["embalagem", 1]]),
  rechRicota:   R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["ricota", 0.36], ["espinafre", 0.05], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechRicTomate:R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["ricota", 0.3], ["tomateSeco", 0.09], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechRicDamasc:R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["ricota", 0.3], ["damasco", 0.08], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechQueijo:   R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["mussarela", 0.28], ["ricota", 0.1], ["parmesao", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  rech4Queijos: R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["mussarela", 0.16], ["provolone", 0.1], ["gorgonzola", 0.08], ["parmesao", 0.08], ["sal", 0.01], ["embalagem", 1]]),
  rechPresQ:    R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["presunto", 0.2], ["mussarela", 0.22], ["sal", 0.01], ["embalagem", 1]]),
  rechMussBuf:  R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["mussBufala", 0.28], ["tomateSeco", 0.08], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechPeitoPeru:R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["peitoPeru", 0.24], ["catupiry", 0.12], ["sal", 0.01], ["embalagem", 1]]),
  rechAbobora:  R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["abobora", 0.35], ["ricota", 0.1], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechPalmito:  R(1, "kg", [["farinha", 0.34], ["ovos", 3], ["palmito", 0.3], ["catupiry", 0.08], ["cebola", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  rechBatata:   R(1, "kg", [["farinha", 0.3], ["ovos", 3], ["batata", 0.45], ["cebola", 0.04], ["sal", 0.01], ["oleo", 0.02], ["embalagem", 1]]),

  // ---------- Lasanhas (1 kg) ----------
  lasBolonhesa: R(1, "kg", [["farinha", 0.2], ["ovos", 2], ["carneMoida", 0.28], ["molhoTomate", 0.25], ["mussarela", 0.15], ["presunto", 0.06], ["cebola", 0.03], ["sal", 0.01], ["embalagem", 1]]),
  lasSugo:      R(1, "kg", [["farinha", 0.24], ["ovos", 2], ["molhoTomate", 0.34], ["mussarela", 0.22], ["parmesao", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  lasFrango:    R(1, "kg", [["farinha", 0.2], ["ovos", 2], ["peitoFrango", 0.28], ["catupiry", 0.1], ["molhoTomate", 0.18], ["mussarela", 0.14], ["sal", 0.01], ["embalagem", 1]]),
  lasMista:     R(1, "kg", [["farinha", 0.2], ["ovos", 2], ["presunto", 0.18], ["mussarela", 0.22], ["molhoTomate", 0.2], ["sal", 0.01], ["embalagem", 1]]),
  las4Queijos:  R(1, "kg", [["farinha", 0.2], ["ovos", 2], ["mussarela", 0.18], ["provolone", 0.1], ["gorgonzola", 0.08], ["parmesao", 0.07], ["cremeLeite", 0.15], ["sal", 0.01], ["embalagem", 1]]),
  lasMolhoBrc:  R(1, "kg", [["farinha", 0.22], ["ovos", 2], ["cremeLeite", 0.25], ["leite", 0.15], ["mussarela", 0.16], ["presunto", 0.12], ["manteiga", 0.03], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Nhoque (1 kg) ----------
  nhoque:       R(1, "kg", [["batata", 0.75], ["farinha", 0.25], ["ovos", 2], ["sal", 0.01], ["embalagem", 1]]),
  nhoqueRech:   R(1, "kg", [["batata", 0.6], ["farinha", 0.2], ["ovos", 2], ["mussarela", 0.15], ["presunto", 0.06], ["sal", 0.01], ["embalagem", 1]]),
  nhoqueMolho:  R(1, "kg", [["batata", 0.5], ["farinha", 0.17], ["ovos", 2], ["molhoTomate", 0.3], ["parmesao", 0.03], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Massa no molho (1 kg) ----------
  massaNoMolho: R(1, "kg", [["farinha", 0.3], ["ovos", 2], ["molhoTomate", 0.42], ["parmesao", 0.04], ["oleo", 0.02], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Molhos (1 kg) ----------
  molhoSugo:    R(1, "kg", [["tomatePelado", 0.85], ["cebola", 0.08], ["alho", 0.01], ["azeite", 0.03], ["sal", 0.015], ["embalagem", 1]]),
  molhoBolonh:  R(1, "kg", [["carneMoida", 0.4], ["tomatePelado", 0.5], ["cebola", 0.06], ["alho", 0.01], ["azeite", 0.02], ["sal", 0.015], ["embalagem", 1]]),
  molhoBranco:  R(1, "kg", [["leite", 0.6], ["cremeLeite", 0.25], ["manteiga", 0.08], ["farinha", 0.06], ["sal", 0.015], ["embalagem", 1]]),
  molho4Queijos:R(1, "kg", [["cremeLeite", 0.45], ["leite", 0.2], ["mussarela", 0.12], ["provolone", 0.08], ["gorgonzola", 0.07], ["parmesao", 0.07], ["sal", 0.01], ["embalagem", 1]]),
  molhoFunghi:  R(1, "kg", [["cremeLeite", 0.5], ["funghi", 0.22], ["cebola", 0.06], ["manteiga", 0.05], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Rotisseria (1 kg) ----------
  arrozGrega:   R(1, "kg", [["arroz", 0.42], ["milhoErvilha", 0.15], ["cenoura", 0.1], ["presunto", 0.08], ["cebola", 0.05], ["oleo", 0.03], ["sal", 0.015], ["embalagem", 1]]),
  farofaSalg:   R(1, "kg", [["farMandioca", 0.55], ["bacon", 0.15], ["cebola", 0.1], ["manteiga", 0.1], ["ovos", 2], ["sal", 0.015], ["embalagem", 1]]),
  farofaDoce:   R(1, "kg", [["farMandioca", 0.55], ["banana", 0.2], ["acucar", 0.12], ["manteiga", 0.12], ["sal", 0.005], ["embalagem", 1]]),
  maioneseSal:  R(1, "kg", [["batata", 0.5], ["maionese", 0.3], ["cenoura", 0.12], ["milhoErvilha", 0.08], ["sal", 0.01], ["embalagem", 1]]),
  salpicaoSalg: R(1, "kg", [["peitoFrango", 0.35], ["maionese", 0.25], ["batataPalha", 0.12], ["milhoErvilha", 0.1], ["cenoura", 0.08], ["sal", 0.01], ["embalagem", 1]]),
  salpicaoDoce: R(1, "kg", [["peitoFrango", 0.3], ["maionese", 0.25], ["batataPalha", 0.12], ["banana", 0.12], ["castanhas", 0.05], ["sal", 0.01], ["embalagem", 1]]),
  fricasse:     R(1, "kg", [["peitoFrango", 0.42], ["cremeLeite", 0.2], ["milhoErvilha", 0.12], ["mussarela", 0.1], ["batataPalha", 0.08], ["cebola", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  risotoFrango: R(1, "kg", [["arroz", 0.38], ["peitoFrango", 0.3], ["cremeLeite", 0.1], ["cebola", 0.05], ["parmesao", 0.04], ["azeite", 0.03], ["sal", 0.015], ["embalagem", 1]]),
  strogNozes:   R(1, "kg", [["nozes", 0.18], ["cremeLeite", 0.35], ["funghi", 0.15], ["molhoTomate", 0.1], ["cebola", 0.06], ["manteiga", 0.05], ["sal", 0.01], ["embalagem", 1]]),
  empadaoFrango:R(1, "kg", [["farinha", 0.3], ["manteiga", 0.12], ["ovos", 3], ["peitoFrango", 0.3], ["catupiry", 0.08], ["cebola", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  empadaoPalm:  R(1, "kg", [["farinha", 0.3], ["manteiga", 0.12], ["ovos", 3], ["palmito", 0.32], ["cebola", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  empadaoMisto: R(1, "kg", [["farinha", 0.3], ["manteiga", 0.12], ["ovos", 3], ["presunto", 0.16], ["mussarela", 0.16], ["sal", 0.01], ["embalagem", 1]]),
  panqCarne:    R(1, "kg", [["farinha", 0.16], ["ovos", 3], ["leite", 0.18], ["carneMoida", 0.3], ["molhoTomate", 0.22], ["cebola", 0.04], ["sal", 0.01], ["embalagem", 1]]),
  panqFrango:   R(1, "kg", [["farinha", 0.16], ["ovos", 3], ["leite", 0.18], ["peitoFrango", 0.28], ["catupiry", 0.06], ["molhoTomate", 0.2], ["sal", 0.01], ["embalagem", 1]]),
  panqPalmito:  R(1, "kg", [["farinha", 0.16], ["ovos", 3], ["leite", 0.18], ["palmito", 0.28], ["catupiry", 0.06], ["molhoTomate", 0.2], ["sal", 0.01], ["embalagem", 1]]),
  sopaCapeleti: R(1, "kg", [["farinha", 0.12], ["ovos", 1], ["carneMoida", 0.1], ["tomatePelado", 0.25], ["cenoura", 0.1], ["cebola", 0.06], ["sal", 0.015], ["embalagem", 1]]),
  coxaRecheada: R(1, "kg", [["frangoInt", 1.1], ["mussarela", 0.12], ["presunto", 0.1], ["sal", 0.02], ["oleo", 0.02], ["embalagem", 1]]),
  frangoAssado: R(1, "kg", [["frangoInt", 1.35], ["sal", 0.025], ["oleo", 0.03], ["alho", 0.01], ["embalagem", 1]]),
  chesterAssado:R(1, "kg", [["chester", 1.35], ["sal", 0.025], ["manteiga", 0.03], ["embalagem", 1]]),
  bifeRole:     R(1, "kg", [["bifeBov", 1.1], ["bacon", 0.1], ["cenoura", 0.08], ["molhoTomate", 0.15], ["sal", 0.02], ["embalagem", 1]]),

  // ---------- Carnes assadas (1 kg) ----------
  carneCostBov: R(1, "kg", [["costelaBov", 1.35], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carneAlcSui:  R(1, "kg", [["alcatraSuina", 1.2], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carnePernil:  R(1, "kg", [["pernil", 1.3], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carneLombo:   R(1, "kg", [["lombo", 1.15], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carnePicSui:  R(1, "kg", [["picanhaSuina", 1.15], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carneCostSui: R(1, "kg", [["costelaSuina", 1.35], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),
  carnePosta:   R(1, "kg", [["postaBov", 1.15], ["sal", 0.02], ["alho", 0.01], ["embalagem", 1]]),

  // ---------- Doces (1 kg) ----------
  pudim:        R(1, "kg", [["leiteCond", 0.35], ["leite", 0.35], ["ovos", 6], ["acucar", 0.18], ["embalagem", 1]]),
  negaMaluca:   R(1, "kg", [["farinha", 0.3], ["acucar", 0.28], ["chocolatePo", 0.1], ["ovos", 4], ["leite", 0.15], ["manteiga", 0.08], ["embalagem", 1]]),
  cuqueGoiaba:  R(1, "kg", [["farinha", 0.35], ["goiabada", 0.22], ["acucar", 0.15], ["ovos", 3], ["manteiga", 0.1], ["leite", 0.1], ["embalagem", 1]]),
  formigueiro:  R(1, "kg", [["farinha", 0.32], ["acucar", 0.25], ["chocolatePo", 0.07], ["ovos", 4], ["leite", 0.15], ["manteiga", 0.1], ["embalagem", 1]]),
  tortaMorango: R(1, "kg", [["biscoito", 0.18], ["morango", 0.25], ["leiteCond", 0.2], ["cremeLeite", 0.2], ["acucar", 0.06], ["manteiga", 0.06], ["embalagem", 1]]),
  tortaLimao:   R(1, "kg", [["biscoito", 0.2], ["limao", 0.22], ["leiteCond", 0.28], ["cremeLeite", 0.15], ["ovos", 3], ["manteiga", 0.06], ["embalagem", 1]]),
  tortaBanana:  R(1, "kg", [["biscoito", 0.2], ["banana", 0.35], ["leiteCond", 0.22], ["cremeLeite", 0.15], ["acucar", 0.08], ["manteiga", 0.06], ["embalagem", 1]]),
  banofe:       R(1, "kg", [["biscoito", 0.2], ["banana", 0.3], ["leiteCond", 0.3], ["cremeLeite", 0.18], ["manteiga", 0.08], ["embalagem", 1]]),
  morangofe:    R(1, "kg", [["biscoito", 0.2], ["morango", 0.3], ["leiteCond", 0.28], ["cremeLeite", 0.18], ["manteiga", 0.08], ["embalagem", 1]]),
  atumRicota:   R(1, "kg", [["atum", 0.3], ["ricota", 0.35], ["maionese", 0.15], ["cebola", 0.05], ["sal", 0.01], ["embalagem", 1]]),

  // ---------- Salgados fritos (rendem 50 unidades) ----------
  sCoxinha:     R(50, "un", [["farinha", 1.2], ["peitoFrango", 0.9], ["catupiry", 0.25], ["manteiga", 0.1], ["cebola", 0.1], ["oleo", 0.35], ["sal", 0.03]]),
  sBolinhaQ:    R(50, "un", [["farinha", 1.1], ["mussarela", 0.9], ["leite", 0.3], ["manteiga", 0.1], ["oleo", 0.35], ["sal", 0.03]]),
  sCroquete:    R(50, "un", [["farinha", 1.1], ["carneMoida", 0.85], ["cebola", 0.1], ["manteiga", 0.1], ["oleo", 0.35], ["sal", 0.03]]),
  sDoguinho:    R(50, "un", [["farinha", 1.2], ["salsicha", 0.9], ["molhoTomate", 0.2], ["oleo", 0.35], ["sal", 0.03]]),
  sEsfihaCarne: R(50, "un", [["farinha", 1.5], ["carneMoida", 0.9], ["cebola", 0.15], ["fermento", 0.02], ["oleo", 0.08], ["sal", 0.03]]),
  sEsfihaFrango:R(50, "un", [["farinha", 1.5], ["peitoFrango", 0.85], ["catupiry", 0.2], ["cebola", 0.12], ["fermento", 0.02], ["oleo", 0.08], ["sal", 0.03]]),
  sKibe:        R(50, "un", [["trigoKibe", 1.0], ["carneMoida", 0.9], ["cebola", 0.15], ["oleo", 0.35], ["sal", 0.03]]),
  sPastelCarne: R(50, "un", [["farinha", 1.3], ["carneMoida", 0.8], ["cebola", 0.12], ["oleo", 0.4], ["sal", 0.03]]),
  sPastelPQ:    R(50, "un", [["farinha", 1.3], ["presunto", 0.45], ["mussarela", 0.5], ["oleo", 0.4], ["sal", 0.03]]),
  sRisolesCarne:R(50, "un", [["farinha", 1.2], ["carneMoida", 0.8], ["leite", 0.3], ["cebola", 0.1], ["oleo", 0.35], ["sal", 0.03]]),
  sRisolesPizza:R(50, "un", [["farinha", 1.2], ["mussarela", 0.5], ["presunto", 0.3], ["molhoTomate", 0.25], ["leite", 0.3], ["oleo", 0.35], ["sal", 0.03]]),
  sRisolesPalm: R(50, "un", [["farinha", 1.2], ["palmito", 0.75], ["leite", 0.3], ["cebola", 0.1], ["oleo", 0.35], ["sal", 0.03]]),

  // ---------- Bebidas e revenda (1 unidade) ----------
  bCoca2l:      R(1, "un", [["cCoca2l", 1]]),
  bCoca350:     R(1, "un", [["cCoca350", 1]]),
  bFanta350:    R(1, "un", [["cFanta350", 1]]),
  bGuarana350:  R(1, "un", [["cGuarana350", 1]]),
  bDelValle:    R(1, "un", [["cDelValle", 1]]),
  bAguaSem:     R(1, "un", [["cAguaSem", 1]]),
  bAguaCom:     R(1, "un", [["cAguaCom", 1]]),
  bCerveja:     R(1, "un", [["cCerveja", 1]]),
  bSucoUva:     R(1, "un", [["cSucoUva", 1]]),
  bMixCast:     R(1, "un", [["cMixCast", 1]]),
  bParmRalado:  R(1, "kg", [["cParmRalado", 1]]),
  bLimonada:    R(1, "un", [["limao", 0.12], ["acucar", 0.05], ["embalagem", 1]]),
};

// =====================================================================
// 3) DE-PARA: nome do produto no PDV -> ficha tecnica
// =====================================================================
// A ordem IMPORTA: a primeira regra que casar vence. Regras mais
// especificas ficam antes das genericas.
const MAPA = [
  // --- Salgadinhos (comecam com "6" no PDV) ---
  [/^6BOLINHA/, "sBolinhaQ"],
  [/^6COXINHA/, "sCoxinha"],
  [/^6CROQUETE/, "sCroquete"],
  [/^6DOGUINHO/, "sDoguinho"],
  [/^6ESFIHA DE CARNE/, "sEsfihaCarne"],
  [/^6ESFIHA DE FRANGO/, "sEsfihaFrango"],
  [/^6KIBE/, "sKibe"],
  [/^6PASTEL CARNE/, "sPastelCarne"],
  [/^6PASTEL P\/Q/, "sPastelPQ"],
  [/^6RISOLES CARNE/, "sRisolesCarne"],
  [/^6RISOLES DE PIZZA/, "sRisolesPizza"],
  [/^6RISOLES PALMITO/, "sRisolesPalm"],

  // --- Bebidas e revenda ---
  [/^COCA-COLA 2L/, "bCoca2l"],
  [/^COCA-COLA 350/, "bCoca350"],
  [/^FANTA/, "bFanta350"],
  [/^GUARANA/, "bGuarana350"],
  [/^SUCO DEL VALLE/, "bDelValle"],
  [/^SUCO DE UVA/, "bSucoUva"],
  [/^AGUA COM GAS/, "bAguaCom"],
  [/^AGUA SEM GAS/, "bAguaSem"],
  [/^CERVEJA/, "bCerveja"],
  [/^MIX-CASTANHAS/, "bMixCast"],
  [/^PARMESAO RALADO/, "bParmRalado"],
  [/^LIMONADA/, "bLimonada"],

  // --- Carnes assadas ---
  [/^COSTELA BOVINA/, "carneCostBov"],
  [/^COSTELA SUINA/, "carneCostSui"],
  [/^ALCATRA SUINA/, "carneAlcSui"],
  [/^PICANHA SUINA/, "carnePicSui"],
  [/^PERNIL/, "carnePernil"],
  [/^LOMBO/, "carneLombo"],
  [/^POSTA/, "carnePosta"],
  [/^BIFE A ROLE/, "bifeRole"],
  [/^CHESTER/, "chesterAssado"],
  [/^FRANGO ASSADO/, "frangoAssado"],
  [/^COXA DESOS/, "coxaRecheada"],

  // --- Lasanhas (antes das regras genericas de recheio) ---
  [/^LASANHA.*(4 ?Q|4 QUEIJOS)/, "las4Queijos"],
  [/^LASANHA.*BOL/, "lasBolonhesa"],
  [/^LASANHA.*SUGO/, "lasSugo"],
  [/^LASANHA.*FRG|^LASANHA DE FRANGO/, "lasFrango"],
  [/^LASANHA.*(M\. BRC|MOLHO BRANCO)/, "lasMolhoBrc"],
  [/^LASANHA.*MISTA/, "lasMista"],
  [/^LASANHA/, "lasSugo"],

  // --- Molhos ---
  [/^MOLHO 4 QUEIJOS/, "molho4Queijos"],
  [/^MOLHO AO SUGO|^MOLHO SUG/, "molhoSugo"],
  [/^MOLHO BOL/, "molhoBolonh"],
  [/^MOLHO BRANCO/, "molhoBranco"],
  [/^MOLHO FUNGHI/, "molhoFunghi"],

  // --- Nhoque ---
  [/^NHOQUE RECHEADO/, "nhoqueRech"],
  [/^NHOQUE NO MOLHO/, "nhoqueMolho"],
  [/^NHOQUE/, "nhoque"],

  // --- Empadao / panqueca / sopa ---
  [/^EMPADAO PALMITO/, "empadaoPalm"],
  [/^EMPADAO MISTO/, "empadaoMisto"],
  [/^EMPADAO/, "empadaoFrango"],
  [/^PANQUECA DE CARNE/, "panqCarne"],
  [/^PANQUECA PALMITO/, "panqPalmito"],
  [/^PANQUECA/, "panqFrango"],
  [/^SOPA CAPELETI/, "sopaCapeleti"],

  // --- Rotisseria ---
  [/^ARROZ A GREGA/, "arrozGrega"],
  [/^FAROFA DOCE/, "farofaDoce"],
  [/^FAROFA SALGADA/, "farofaSalg"],
  [/^MAIONESE/, "maioneseSal"],
  [/^SALPICAO DOCE/, "salpicaoDoce"],
  [/^SALPICAO SALGADO/, "salpicaoSalg"],
  [/^FRICASSE/, "fricasse"],
  [/^RISOTO DE FRANGO/, "risotoFrango"],
  [/^STROGONOFF DE NOZES/, "strogNozes"],

  // --- Doces ---
  [/^PUDIM/, "pudim"],
  [/^NEGA MALUCA/, "negaMaluca"],
  [/^CUQUE DE GOIABA/, "cuqueGoiaba"],
  [/^FORMIGUEIRO/, "formigueiro"],
  [/^TORTA DE MORANGO/, "tortaMorango"],
  [/^TORTA DE LIMAO/, "tortaLimao"],
  [/^TORTA DE BANANA/, "tortaBanana"],
  [/^BANOFE/, "banofe"],
  [/^MORANGOFE/, "morangofe"],
  [/^ATUM COM RICOTA/, "atumRicota"],

  // --- Massas recheadas: recheio decide a ficha ---
  [/(4 ?QUEIJOS|4Q)/, "rech4Queijos"],
  [/(RIC.*DAMASCO|C\/ DAMASCO)/, "rechRicDamasc"],
  [/(RIC.*TM|TM\.? ?SEC|TOM.*SEC)/, "rechRicTomate"],
  [/(MUS.*BUF|MUSS BUF)/, "rechMussBuf"],
  [/PEITO PERU/, "rechPeitoPeru"],
  [/(FRG C\/? ?CAT|FRG C CAT|FRANGO C CAT)/, "rechFrangoCat"],
  [/(FRANGO|FRG)/, "rechFrango"],
  [/CARN/, "rechCarne"],
  [/RICOTA/, "rechRicota"],
  // "\bPQ\b" pega o "CALZOE PQ C CAT" (presunto e queijo), que no PDV
  // ainda esta escrito sem a letra N.
  [/(P\/Q|\bPQ\b|PRESUNTO)/, "rechPresQ"],
  [/(MUSSARELA|MUSARELA|QUEIJO)/, "rechQueijo"],
  [/ABOBORA/, "rechAbobora"],
  [/PALMITO/, "rechPalmito"],
  [/BATATA SALSA/, "rechBatata"],
  [/^PIEROG/, "rechBatata"],

  // --- Massas simples ---
  [/^MASSA PASTEL/, "massaPastel"],
  [/^MASSA LASANHA/, "massaLasanha"],
  [/^MASSA COZIDA/, "massaCozida"],
  [/(VERDE|INTG)/, "massaVerde"],
  [/^MACARRAO NO MOLHO/, "massaNoMolho"],
  [/^(MACARRAO|ESPAGUETE|FETUTINE|TALHARIM|MASSA FRESCA)/, "massaSimples"],
];

// =====================================================================
// 4) EXECUCAO
// =====================================================================

/** Tira acento e deixa minusculo, para comparar nomes com seguranca. */
const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Le um JSON tolerando o BOM que o PowerShell do Windows costuma inserir. */
function lerJson(caminho, padrao) {
  try {
    const bruto = fs.readFileSync(arq(caminho), "utf8").replace(/^﻿/, "").trim();
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

const produtos = lerJson("scripts/produtos-export.json", []);
const insumosAtuais = lerJson("scripts/atual-insumos.json", []);
const pratosAtuais = lerJson("scripts/atual-pratos.json", []);

// --- 4.1 Limpeza da lista do PDV ---
const ignorados = [];
const porNome = new Map();

for (const p of produtos) {
  const nome = p.nome.trim();

  if (/^PRODUTO POR KG/i.test(nome)) {
    ignorados.push([nome, "item técnico do PDV, não é produto"]);
    continue;
  }

  // Duplicado no proprio PDV: fica o de maior preco
  const anterior = porNome.get(nome);
  if (anterior) {
    if (p.preco > anterior.preco) porNome.set(nome, p);
    ignorados.push([nome, "nome repetido no PDV, ficou o de maior preço"]);
    continue;
  }
  porNome.set(nome, p);
}

// --- 4.2 Monta os insumos (reaproveitando os que ja existem) ---
const insumosFinais = [...insumosAtuais];
const idPorChave = {};

/** Acha um insumo ja cadastrado pelo nome, para nao duplicar. */
function acharExistente(nome) {
  return insumosAtuais.find((i) => normalizar(i.nome) === normalizar(nome));
}

for (const [chave, def] of Object.entries(INSUMOS)) {
  const existente = acharExistente(def.nome);
  if (existente) {
    // Ja existe: respeitamos o cadastro do dono e so reutilizamos o id
    idPorChave[chave] = existente.id;
    continue;
  }
  const id = `pdv-ins-${chave}`;
  idPorChave[chave] = id;
  insumosFinais.push({
    id,
    nome: def.nome,
    unidade: def.unidade,
    preco: def.preco,
    rendimento: def.rendimento,
    atualizadoEm: new Date().toISOString(),
  });
}

// --- 4.3 Monta os pratos ---
const pratosFinais = [...pratosAtuais];
const nomesUsados = new Set(pratosAtuais.map((p) => normalizar(p.nome)));
const semReceita = [];
const criados = [];

for (const p of porNome.values()) {
  const nome = p.nome.trim();

  if (nomesUsados.has(normalizar(nome))) {
    ignorados.push([nome, "você já tem um prato com esse nome"]);
    continue;
  }

  const regra = MAPA.find(([regex]) => regex.test(nome));
  if (!regra) {
    semReceita.push(nome);
    continue;
  }

  const receita = RECEITAS[regra[1]];
  const ingredientes = receita.ingredientes.map(([chave, quantidade]) => ({
    insumoId: idPorChave[chave],
    quantidade,
  }));

  // Custo da receita inteira, com a mesma conta do sistema:
  // (quantidade x preco) / (rendimento / 100)
  const custoInsumos =
    Math.round(
      receita.ingredientes.reduce((soma, [chave, qtd]) => {
        const def = INSUMOS[chave];
        return soma + (qtd * def.preco) / (def.rendimento / 100);
      }, 0) * 100
    ) / 100;

  pratosFinais.push({
    id: `pdv-${normalizar(nome).replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    nome,
    precoVenda: p.preco,
    ingredientes,
    rendimento: receita.rendimento,
    unidadeRendimento: receita.unidade,
    custoInsumos,
    atualizadoEm: new Date().toISOString(),
  });

  nomesUsados.add(normalizar(nome));
  criados.push([nome, regra[1], p.preco, custoInsumos, receita.rendimento, receita.unidade]);
}

// --- 4.4 Grava a saida ---
fs.writeFileSync(arq("scripts/saida-insumos.json"), JSON.stringify(insumosFinais), "utf8");
fs.writeFileSync(arq("scripts/saida-pratos.json"), JSON.stringify(pratosFinais), "utf8");

// --- 4.5 Relatorio ---
console.log(`Produtos no PDV .............. ${produtos.length}`);
console.log(`Pratos criados ............... ${criados.length}`);
console.log(`Ja existiam / ignorados ...... ${ignorados.length}`);
console.log(`SEM FICHA (nao mapeados) ..... ${semReceita.length}`);
if (semReceita.length) console.log("  -> " + semReceita.join(", "));
console.log(`Insumos no total ............. ${insumosFinais.length} (${insumosAtuais.length} já existiam)`);

console.log("\nAmostra (nome | ficha | preço venda | custo receita | rende):");
for (const [nome, ficha, preco, custo, rend, un] of criados.slice(0, 12)) {
  console.log(`  ${nome.padEnd(24)} ${ficha.padEnd(14)} R$ ${String(preco).padStart(6)} | R$ ${String(custo).padStart(6)} | ${rend} ${un}`);
}
