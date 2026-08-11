import Link from "next/link";

import Acordeao from "@/components/Acordeao";
import { cartao } from "@/lib/estilos";

export const dynamic = "force-dynamic";

/** Caixinha de destaque usada dentro dos textos de ajuda. */
function Exemplo({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-xl border-2 border-massa-200 bg-massa-50 px-5 py-4 text-base">
      {children}
    </div>
  );
}

function Atencao({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base text-amber-900">
      {children}
    </div>
  );
}

export default function PaginaAjuda() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900">Ajuda e Dicas</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-600">
          Aqui está tudo explicado com palavras simples e exemplos com números de verdade. Clique
          no assunto que você quer entender.
        </p>
      </div>

      {/* ================= PASSO A PASSO ================= */}
      <Acordeao
        id="passo-a-passo"
        icone="👣"
        titulo="Por onde começar: o passo a passo"
        resumo="A ordem certa para preencher tudo, sem se perder."
      >
        <p>
          O sistema funciona como uma receita: cada passo depende do anterior. Faça nesta ordem e
          tudo se encaixa sozinho.
        </p>

        <ol className="mt-5 space-y-5">
          <li>
            <p className="text-xl font-bold text-slate-900">1. Cadastre seus ingredientes</p>
            <p>
              Em <Link href="/insumos" className="font-semibold text-massa-700 underline">Meus Insumos</Link>
              , coloque tudo o que você compra: farinha, ovos, queijo, molho, embalagem. Para cada
              um, o preço que você <strong>pagou</strong> e a unidade em que comprou.
            </p>
            <p className="mt-1 text-base text-slate-600">
              Dica: pegue as últimas notas fiscais e cadastre olhando nelas. É mais rápido e mais
              certo do que de cabeça.
            </p>
          </li>

          <li>
            <p className="text-xl font-bold text-slate-900">2. Informe as contas da casa</p>
            <p>
              Em <Link href="/configuracoes" className="font-semibold text-massa-700 underline">Custos da Casa</Link>
              , coloque aluguel, gás, luz, a equipe e quanto você fatura por mês. Sem isso o
              sistema só conhece o custo dos ingredientes — e ingrediente não é o único custo que
              você tem.
            </p>
          </li>

          <li>
            <p className="text-xl font-bold text-slate-900">3. Monte a receita de cada produto</p>
            <p>
              Em <Link href="/pratos" className="font-semibold text-massa-700 underline">Meus Pratos</Link>
              , diga o que entra em cada receita e <strong>quanto ela rende</strong> (10 coxinhas,
              1 kg de macarrão...). O sistema divide o custo pelo rendimento e descobre quanto
              custa cada unidade que você vende.
            </p>
          </li>

          <li>
            <p className="text-xl font-bold text-slate-900">4. Olhe o painel</p>
            <p>
              Na <Link href="/" className="font-semibold text-massa-700 underline">tela inicial</Link>
              , use o filtro <strong>“Dando prejuízo”</strong>. Se aparecer algum produto ali,
              comece por ele: é dinheiro saindo do seu bolso a cada venda.
            </p>
          </li>

          <li>
            <p className="text-xl font-bold text-slate-900">5. Configure os aplicativos</p>
            <p>
              Em <Link href="/delivery" className="font-semibold text-massa-700 underline">Delivery e Apps</Link>
              , anote a taxa de cada aplicativo e veja por quanto vender lá para não ganhar menos.
            </p>
          </li>
        </ol>
      </Acordeao>

      {/* ================= MARGEM ================= */}
      <Acordeao
        id="margem"
        icone="📊"
        titulo="Margem de lucro: o erro que quase todo mundo comete"
        resumo="A diferença entre “ganhar 100%” e “ter 100% de margem”."
      >
        <p>
          <strong>Margem de lucro</strong> é quanto sobra para você de cada R$ 100,00 que o cliente
          paga — depois de descontar <em>tudo</em>: ingredientes, aluguel, gás, luz, equipe.
        </p>

        <Exemplo>
          <p className="font-bold">O erro mais comum</p>
          <p className="mt-2">
            Você compra por <strong>R$ 10,00</strong> e vende por <strong>R$ 20,00</strong>. Muita
            gente diz: “ganhei 100%”.
          </p>
          <p className="mt-2">
            Ganhou R$ 10,00, que é 100% do que você <em>pagou</em>. Mas a margem olha o{" "}
            <em>preço de venda</em>: R$ 10,00 de lucro em R$ 20,00 de venda ={" "}
            <strong>50% de margem</strong>.
          </p>
          <p className="mt-2">
            Os dois números estão certos, só medem coisas diferentes. O sistema usa sempre a{" "}
            <strong>margem sobre o preço de venda</strong>, que é a que diz se o negócio se paga.
          </p>
        </Exemplo>

        <p className="mt-4 text-xl font-bold text-slate-900">Como o sistema calcula</p>
        <div className="my-3 rounded-xl bg-slate-100 px-5 py-4 font-mono text-base">
          margem = (preço de venda − custo total) ÷ preço de venda × 100
        </div>

        <p className="text-xl font-bold text-slate-900">Que margem é boa?</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Abaixo de 0%</strong> — você está pagando para trabalhar. Corrija hoje.
          </li>
          <li>
            <strong>Entre 0% e 15%</strong> — muito apertado. Qualquer aumento de ingrediente
            engole o lucro.
          </li>
          <li>
            <strong>Entre 20% e 40%</strong> — é a faixa mais comum em casa de massas e rotisseria.
          </li>
          <li>
            <strong>Acima de 50%</strong> — ótimo, mas confira se o preço está competitivo.
          </li>
        </ul>

        <Atencao>
          Margem alta demais na meta atrapalha: se você pedir 60% de lucro e o iFood ficar com 27%,
          sobram só 13% do preço para pagar ingredientes e contas — e o preço sugerido fica
          impraticável. Se os preços saírem muito altos,{" "}
          <strong>a meta é o primeiro lugar para olhar</strong>.
        </Atencao>
      </Acordeao>

      {/* ================= FATURAMENTO ================= */}
      <Acordeao
        id="faturamento"
        icone="💰"
        titulo="Faturamento e as contas da casa"
        resumo="Por que o sistema pergunta quanto você fatura por mês."
      >
        <p>
          <strong>Faturamento</strong> é todo o dinheiro que entra no mês, somando tudo o que você
          vendeu. Não é lucro — é o total que passou pelo caixa, antes de pagar qualquer coisa.
        </p>

        <p className="mt-4">
          Ele serve para uma conta só, mas muito importante: descobrir{" "}
          <strong>qual pedaço de cada venda já está comprometido</strong> com aluguel, gás, luz e
          equipe.
        </p>

        <Exemplo>
          <p className="font-bold">Exemplo</p>
          <p className="mt-2">
            Suas contas somam <strong>R$ 12.000,00</strong> por mês e você fatura{" "}
            <strong>R$ 40.000,00</strong>.
          </p>
          <div className="my-3 rounded-lg bg-white px-4 py-3 font-mono text-base">
            12.000 ÷ 40.000 = 0,30 → <strong>30%</strong>
          </div>
          <p>
            Ou seja: de cada R$ 100,00 que entram, <strong>R$ 30,00 já têm dono</strong> antes de
            você comprar um único ovo. Só os outros R$ 70,00 é que vão para ingredientes e lucro.
          </p>
        </Exemplo>

        <p className="mt-4 text-xl font-bold text-slate-900">
          Por que não “quantos pratos vendo por mês”?
        </p>
        <p>
          Porque numa casa de massas quase tudo é vendido por quilo. Contar “pratos” é impossível —
          mas o total faturado no mês seu caixa mostra. E o rateio por porcentagem é mais justo:
          uma lasanha de R$ 65,00 ajuda a pagar mais das contas do que um salgadinho de R$ 1,10, que
          é como funciona de verdade.
        </p>

        <p className="mt-4 text-base text-slate-600">
          Não precisa ser exato. Pegue a média dos últimos dois ou três meses.
        </p>
      </Acordeao>

      {/* ================= CUSTOS ================= */}
      <Acordeao
        id="custos"
        icone="🧾"
        titulo="Os três custos de qualquer produto"
        resumo="Ingredientes, contas da casa e taxas — e por que esquecer um deles quebra o negócio."
      >
        <p>Todo produto que você vende carrega três custos. A maioria só enxerga o primeiro.</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border-2 border-slate-200 p-5">
            <p className="text-xl font-bold text-slate-900">1. Ingredientes</p>
            <p>
              A farinha, o ovo, o queijo, a embalagem. É o mais fácil de ver e o único que a
              maioria das pessoas conta.
            </p>
          </div>

          <div className="rounded-xl border-2 border-slate-200 p-5">
            <p className="text-xl font-bold text-slate-900">2. As contas da casa</p>
            <p>
              Aluguel, gás, luz, salários. Você paga mesmo que não venda nada naquele dia — por
              isso todo produto precisa ajudar a cobrir.
            </p>
          </div>

          <div className="rounded-xl border-2 border-slate-200 p-5">
            <p className="text-xl font-bold text-slate-900">3. As taxas de quem vende para você</p>
            <p>
              iFood, 99Food, maquininha de cartão. O cliente paga R$ 100,00 e chega R$ 73,00 na sua
              conta. Os R$ 27,00 são um custo tão real quanto a farinha.
            </p>
          </div>
        </div>

        <Atencao>
          <strong>O erro clássico:</strong> calcular o preço só com os ingredientes, achar que está
          lucrando 60% e no fim do mês não sobrar nada. O dinheiro foi para os custos 2 e 3, que
          ninguém somou.
        </Atencao>
      </Acordeao>

      {/* ================= RENDIMENTO ================= */}
      <Acordeao
        id="rendimento"
        icone="⚖️"
        titulo="Rendimento: os dois tipos (e não confunda)"
        resumo="Um é do ingrediente, o outro é da receita."
      >
        <p className="text-xl font-bold text-slate-900">
          1. Rendimento do ingrediente (em Meus Insumos)
        </p>
        <p>
          É quanto você <strong>aproveita</strong> do que comprou. Serve para o que tem perda:
          casca, osso, gordura.
        </p>
        <Exemplo>
          Você compra 1 kg de batata por R$ 5,00, mas descasca e sobram 800 g. O rendimento é{" "}
          <strong>80%</strong>, e o quilo realmente útil custa R$ 6,25 — não R$ 5,00. Quem não conta
          isso acha que gasta menos do que gasta.
          <br />
          <span className="text-slate-600">
            Se você aproveita tudo (farinha, ovo), deixe 100%.
          </span>
        </Exemplo>

        <p className="mt-6 text-xl font-bold text-slate-900">
          2. Rendimento da receita (em Meus Pratos)
        </p>
        <p>
          É <strong>quanto a receita inteira produz</strong>. Uma receita quase nunca faz uma porção
          só.
        </p>
        <Exemplo>
          A receita de coxinha usa R$ 30,00 de ingredientes e rende <strong>10 coxinhas</strong>.
          Cada coxinha custa R$ 3,00.
          <br />
          Uma massa usa R$ 30,00 e rende <strong>1 kg</strong>. O quilo custa R$ 30,00.
        </Exemplo>
        <Atencao>
          Lance os ingredientes da <strong>receita inteira</strong>, não de uma porção. Se você
          colocar a farinha de uma coxinha só e disser que rende 10, o custo sai 10 vezes menor.
        </Atencao>
      </Acordeao>

      {/* ================= DELIVERY ================= */}
      <Acordeao
        id="delivery"
        icone="🛵"
        titulo="Vender pelos aplicativos sem perder dinheiro"
        resumo="Por que o preço no iFood tem que ser maior — e quanto maior."
      >
        <p>
          Quando você vende por R$ 100,00 no iFood, não entram R$ 100,00 na sua conta. Se a taxa é
          27%, chegam <strong>R$ 73,00</strong>. Se o preço lá for igual ao do balcão, você está
          dando 27% do seu trabalho de presente.
        </p>

        <p className="mt-4 text-xl font-bold text-slate-900">Por que não basta somar a taxa</p>
        <p>
          Parece que é só aumentar 27%, mas não é: a taxa incide sobre o{" "}
          <strong>preço novo</strong>, não sobre o antigo.
        </p>
        <Exemplo>
          Produto de R$ 100,00 no balcão. Aumentando 27% → R$ 127,00.
          <br />
          Mas o app fica com 27% de R$ 127,00 = R$ 34,29. Sobram R$ 92,71 —{" "}
          <strong>ainda menos que os R$ 100,00 do balcão</strong>.
          <br />
          <br />
          O preço certo é <strong>R$ 136,99</strong>: o app fica com R$ 36,99 e chegam exatamente
          R$ 100,00 para você.
        </Exemplo>
        <p>
          A tela <Link href="/delivery" className="font-semibold text-massa-700 underline">Delivery e Apps</Link>{" "}
          faz essa conta sozinha, para cada produto e cada aplicativo.
        </p>

        <p className="mt-6 text-xl font-bold text-slate-900">
          E quando o preço no app fica absurdo?
        </p>
        <p>Acontece, e quase sempre por um destes motivos:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Sua meta de lucro está alta.</strong> 60% de margem + 27% de taxa deixam só 13%
            para tudo o mais.
          </li>
          <li>
            <strong>O produto tem margem baixa no balcão.</strong> Produto apertado fica inviável no
            delivery.
          </li>
        </ul>
        <p className="mt-3">
          Saídas comuns: vender no app só os produtos de margem melhor, criar tamanhos próprios para
          delivery, ou negociar a entrega própria (taxa cai de 27% para cerca de 12%).
        </p>
      </Acordeao>

      {/* ================= DICAS ================= */}
      <Acordeao
        id="dicas"
        icone="💡"
        titulo="Dicas de precificação"
        resumo="O que costuma dar certo em casa de massas e rotisseria."
      >
        <div className="space-y-5">
          <div>
            <p className="text-xl font-bold text-slate-900">
              Não copie o preço do vizinho sem saber o seu custo
            </p>
            <p>
              O aluguel dele, a equipe dele e o fornecedor dele não são os seus. O preço do
              concorrente serve para saber se você está fora da realidade do mercado — nunca para
              definir o seu preço.
            </p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Margem diferente por categoria</p>
            <p>
              Não precisa ser a mesma para tudo. Costuma funcionar assim:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong>Bebidas:</strong> margem alta, o cliente compara pouco.
              </li>
              <li>
                <strong>Salgados:</strong> volume alto e preço redondo. Cuidado, é onde mais se
                perde dinheiro sem perceber.
              </li>
              <li>
                <strong>Massas e lasanhas:</strong> o carro-chefe. Margem sadia, sem exagero.
              </li>
              <li>
                <strong>Congelados:</strong> podem custar um pouco mais que o fresco — dão trabalho
                de embalagem e ocupam freezer.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Preço quebrado vende melhor</p>
            <p>
              R$ 49,90 parece bem mais barato que R$ 50,00. Se o sistema sugerir R$ 48,32, arredonde
              para <strong>R$ 49,90</strong> — nunca para baixo, ou você come a sua margem.
            </p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Revise quando o ingrediente subir</p>
            <p>
              Quando a nota do fornecedor vier mais cara, atualize o preço em{" "}
              <Link href="/insumos" className="font-semibold text-massa-700 underline">
                Meus Insumos
              </Link>
              . O sistema refaz o custo de todos os produtos que usam aquele item na hora. Vale
              revisar a cada 2 ou 3 meses, ou sempre que sentir que “não está sobrando”.
            </p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Cuidado com os itens pequenos</p>
            <p>
              Coxinha, croquete e risoles têm preço baixo, então qualquer centavo pesa. É comum
              descobrir que um salgado de R$ 1,10 custa R$ 1,17 — e cada venda dá prejuízo. Use o
              filtro <strong>“Dando prejuízo”</strong> no painel para achá-los.
            </p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Não esqueça a embalagem</p>
            <p>
              Bandeja, filme, sacola e etiqueta custam dinheiro e vão embora com o produto.
              Cadastre como ingrediente da receita.
            </p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">Aumente aos poucos</p>
            <p>
              Se um produto precisa subir muito, suba em duas ou três etapas ao longo de alguns
              meses. O cliente sente menos.
            </p>
          </div>
        </div>
      </Acordeao>

      {/* ================= GLOSSÁRIO ================= */}
      <Acordeao
        id="glossario"
        icone="📖"
        titulo="O que significa cada palavra"
        resumo="Um dicionário rápido dos termos que aparecem nas telas."
      >
        <dl className="space-y-4">
          {[
            ["Insumo", "Qualquer coisa que você compra para produzir: farinha, ovo, queijo, embalagem."],
            ["Ficha técnica", "A receita de um produto: o que entra e quanto de cada coisa."],
            ["Custo de insumos", "A soma do que os ingredientes custam para fazer uma unidade."],
            ["Custos fixos ou contas da casa", "O que você paga todo mês mesmo sem vender nada: aluguel, luz, gás, salários."],
            ["Faturamento", "Todo o dinheiro que entrou no mês. Não é lucro."],
            ["Lucro", "O que sobra depois de pagar absolutamente tudo."],
            ["Margem de lucro", "Quanto sobra de lucro em cada R$ 100,00 vendidos, em porcentagem."],
            ["Encargos", "O que se paga além do salário: FGTS, INSS, férias, 13º. Costuma ser 30% a 40% em cima do salário."],
            ["Rendimento do insumo", "Quanto você aproveita do que comprou (descontando casca, osso, perda)."],
            ["Rendimento da receita", "Quanto a receita inteira produz: 10 coxinhas, 1 kg de massa."],
            ["Preço sugerido", "O preço que paga todos os custos e ainda deixa a margem que você quer."],
            ["Taxa do aplicativo", "A parte da venda que o iFood, 99Food ou a maquininha ficam."],
            ["Canal de venda", "Onde você vende: balcão, WhatsApp, iFood, 99Food."],
          ].map(([termo, definicao]) => (
            <div key={termo} className="border-l-4 border-massa-200 pl-4">
              <dt className="text-lg font-bold text-slate-900">{termo}</dt>
              <dd className="text-base text-slate-600">{definicao}</dd>
            </div>
          ))}
        </dl>
      </Acordeao>

      {/* ================= PERGUNTAS ================= */}
      <Acordeao
        id="perguntas"
        icone="❓"
        titulo="Perguntas frequentes"
        resumo="As dúvidas que mais aparecem no dia a dia."
      >
        <div className="space-y-5">
          {[
            [
              "Um produto meu apareceu em vermelho. O que faço?",
              "Vermelho é prejuízo: cada venda tira dinheiro do seu bolso. Confira primeiro se a receita e os preços dos ingredientes estão certos (erro de cadastro é a causa mais comum). Se estiverem, use o preço sugerido, diminua a porção ou troque algum ingrediente por outro mais barato.",
            ],
            [
              "Devo colocar o meu próprio salário na equipe?",
              "Sim, se você tira dinheiro da cozinha para viver. Sem isso a conta mente: o negócio parece dar lucro quando na verdade está só pagando você. Coloque o quanto você retira por mês.",
            ],
            [
              "O preço sugerido ficou muito mais alto que o meu. Aumento tudo de uma vez?",
              "Não precisa. Comece pelos que estão no prejuízo, aumente aos poucos e acompanhe. O preço sugerido é uma referência do que fecharia a conta — a decisão continua sendo sua, olhando também o que o cliente aceita pagar.",
            ],
            [
              "De quanto em quanto tempo atualizo os preços dos ingredientes?",
              "Sempre que uma nota vier bem mais cara, e de forma geral a cada 2 ou 3 meses. Quando você muda o preço de um insumo, todos os produtos que usam ele são recalculados na hora.",
            ],
            [
              "Cadastro bebida e refrigerante?",
              "Sim. Para revenda, o “ingrediente” é a própria bebida pelo preço que você paga no atacado. Assim o sistema mostra a margem real dela também.",
            ],
            [
              "Mudei um insumo. Preciso refazer as receitas?",
              "Não. O sistema refaz o custo de todos os produtos automaticamente.",
            ],
            [
              "Posso usar no celular?",
              "Pode. As telas se ajustam à tela pequena. Nas tabelas largas, arraste para o lado para ver as demais colunas.",
            ],
          ].map(([pergunta, resposta]) => (
            <div key={pergunta}>
              <p className="text-lg font-bold text-slate-900">{pergunta}</p>
              <p className="text-base text-slate-600">{resposta}</p>
            </div>
          ))}
        </div>
      </Acordeao>

      <div className={`${cartao} text-center`}>
        <p className="text-lg text-slate-600">
          Ficou com dúvida em alguma tela? Procure o símbolo{" "}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-massa-50 align-middle text-massa-600">
            ?
          </span>{" "}
          ao lado dos campos — ele explica o que preencher ali.
        </p>
      </div>
    </div>
  );
}
