# 🍝 Meu Preço Certo

Sistema de precificação para casa de massas. O dono cadastra os insumos, monta a ficha técnica de
cada prato e vê **na hora** se está tendo lucro ou prejuízo em cada item do cardápio.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Vercel KV (Redis) · NextAuth.js

---

## O que o sistema faz

| Tela                | Para que serve                                                                    |
| ------------------- | --------------------------------------------------------------------------------- |
| **Início**          | Tabela colorida com custo, margem e lucro de cada prato. Preço editável na tabela. |
| **Meus Insumos**    | Cadastro de farinha, ovos, molho... com preço e rendimento.                        |
| **Meus Pratos**     | Ficha técnica de cada prato, com cálculo em tempo real enquanto digita.            |
| **Delivery e Apps** | Taxas de cada canal (balcão, iFood, 99Food) e o preço recomendado em cada um, com tudo incluso. |
| **Custos da Casa**  | Gás, aluguel, luz, outros custos, **equipe (salários + encargos)**, faturamento do mês e margem desejada. |
| **Ajuda e Dicas**   | Guia passo a passo, explicação de margem/faturamento/rendimento, dicas de precificação, glossário e perguntas frequentes. |

### Cache: por que as leituras do banco NÃO podem ser cacheadas

O `@vercel/kv` conversa com o banco por **HTTP (fetch)**, e o Next.js 14 guarda automaticamente o
resultado de todo `fetch` feito em Server Component — ou seja, ele passa a guardar as **leituras
do banco** em `.next/cache/fetch-cache` e continua devolvendo o valor antigo depois que os dados
mudam. Na prática, a tela mostrava dados velhos ao navegar pelo menu e só acertava com F5.

Três defesas, todas necessárias:

| Onde | O quê | Protege de |
| ---- | ----- | ---------- |
| [banco.ts](src/lib/banco.ts) | `createClient({ cache: "no-store" })` | cache das leituras do banco (a causa raiz) |
| páginas | `export const fetchCache = "force-no-store"` | o mesmo, no nível da rota |
| [next.config.mjs](next.config.mjs) | `staleTimes: { dynamic: 0 }` | cache de navegação no navegador |

`export const dynamic = "force-dynamic"` **não** resolve isso: ele controla a renderização da
rota, não o cache de dados do fetch.

### Categorias

Os produtos são agrupados em categorias (Massas, Massas recheadas, Lasanhas, Congelados,
Salgados, Molhos, Carnes, Rotisseria, Doces, Bebidas). O dono cria, renomeia, escolhe a cor e
exclui categorias em **Meus Pratos → Organizar em categorias**.

O botão **"Organizar meus produtos"** classifica tudo sozinho lendo o nome de cada produto
(regras em `CATEGORIAS_SUGERIDAS`, [types.ts](src/lib/types.ts)). Duas garantias importantes:

- **A ordem das regras importa**: "Congelados" vem antes de "Massas", então `LASANHA BOL. CONG`
  cai em Congelados, não em Lasanhas. A primeira regra que casar vence.
- **Nunca sobrescreve trabalho manual**: só mexe em produto que ainda está sem categoria.

Excluir uma categoria **não exclui os produtos** — eles apenas voltam a ficar sem categoria.

O filtro por categoria aparece nas três telas: botões coloridos em Meus Pratos, e uma lista
suspensa no painel inicial e em Delivery e Apps.

### Janelas de edição (popup)

Cadastrar e editar insumos, pratos e canais acontece numa janela sobreposta
([Modal.tsx](src/components/Modal.tsx)), e não num formulário que empurra a lista para baixo.
Três decisões pensadas para quem tem pouca familiaridade com tecnologia:

- **Clicar fora não fecha.** Um clique errado no meio de uma ficha técnica longa apagaria tudo o
  que a pessoa digitou. Fecha só no X, no botão Cancelar ou com a tecla Esc.
- **O cabeçalho fica fixo no topo**, então o X continua à vista mesmo quando o formulário é grande
  e precisa rolar.
- **O foco vai para o primeiro campo** ao abrir e volta para o botão de origem ao fechar; a
  rolagem da página atrás fica travada.

### Organização das listas

O painel inicial tem **filtros rápidos** (todos / dando prejuízo / abaixo da meta / sem preço, com
a contagem em cada botão) e **ordenação** (pior margem primeiro, melhor margem, maior lucro,
nome). Com mais de cem pratos, é assim que se acha o que precisa de atenção.

Um guia **"Por onde começar"** aparece no topo enquanto faltar alguma informação essencial e
desaparece sozinho quando tudo estiver preenchido.

As três listas (início, insumos e pratos) têm **barra de busca** e **paginação de 20 itens**. A
busca ignora acentos e maiúsculas — digitar `macarrao` encontra `MACARRÃO` — e aceita várias
palavras: `lasanha frango` encontra `LASANHA DE FRANGO`. Está tudo em
[usarListaPaginada.ts](src/lib/usarListaPaginada.ts), usado pelas três telas para que se comportem
igual.

---

## 1. Rodar com Docker (recomendado no Windows)

Você só precisa do [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e
aberto. **Não precisa instalar Node.js.**

Abra o PowerShell na pasta do projeto e rode:

```powershell
docker compose up --build
```

Espere aparecer `✓ Ready` e abra <http://localhost:3000>.

**Login padrão:** `dono@minhamassa.com.br` / `massa123`

Para parar: `Ctrl+C` e depois `docker compose down`.

### O que sobe

| Container | Para que serve |
| --------- | -------------- |
| `precifier-app`   | O site Next.js, em modo desenvolvimento (salvou o arquivo, a tela recarrega sozinha) |
| `precifier-redis` | O banco de dados de verdade, com os dados salvos num volume |
| `precifier-kv`    | Proxy que imita a API do Vercel KV |

> **Por que o proxy `kv`?** A biblioteca `@vercel/kv` conversa por **HTTP** (API REST do Upstash),
> não pelo protocolo Redis puro — apontar direto para o Redis não funcionaria. Com o proxy, o
> código que roda aqui é **exatamente** o mesmo que vai rodar na Vercel, sem nenhum `if` de
> ambiente. Nada de mock.

### Trocar a porta, o email e a senha

Crie um arquivo `.env` na raiz do projeto (o Docker Compose lê ele sozinho):

```env
PORTA=3001
USER_EMAIL=eu@meuemail.com
USER_PASSWORD=minha-senha
NEXTAUTH_SECRET=qualquer-frase-bem-longa-e-aleatoria
```

Depois rode `docker compose up --build` de novo. Com `PORTA=3001` o site passa a abrir em
<http://localhost:3001>.

> **Já existe um usuário salvo?** Ao mudar o email ou a senha, o sistema atualiza o usuário no
> próximo login (veja a seção 4). Se quiser mesmo começar do zero, use `docker compose down -v`.

### Comandos úteis

```powershell
docker compose up --build          # subir (reconstrói se algo mudou)
docker compose up -d               # subir em segundo plano
docker compose logs -f app         # ver o que o site está fazendo
docker compose down                # parar tudo
docker compose down -v             # parar E APAGAR os dados do banco
docker compose exec app sh         # abrir um terminal dentro do container
```

### Testar o modo produção

Para ver como fica publicado (compilado e otimizado, sem recarregamento automático):

```powershell
docker compose -f docker-compose.prod.yml up --build
```

### Se algo der errado

| Problema | O que fazer |
| -------- | ----------- |
| `port is already allocated` | Já tem algo usando a porta 3000. Coloque `PORTA=3001` no arquivo `.env` e suba de novo. |
| Salvei um arquivo e a tela não mudou | O modo polling já vem ligado. Se ainda assim não recarregar, rode `docker compose restart app`. |
| Instalei uma dependência nova (`npm install algo`) | Precisa reconstruir: `docker compose up --build`. |
| Quero começar do zero | `docker compose down -v` e depois `docker compose up --build`. |
| `docker: command not found` | O Docker Desktop não está instalado ou não está aberto. |

> As variáveis definidas no `docker-compose.yml` têm **prioridade** sobre um eventual
> `.env.local` na pasta — o Next.js nunca sobrescreve variáveis já presentes no ambiente.

---

## 2. Rodar sem Docker

Você precisa do [Node.js 18 ou superior](https://nodejs.org).

```bash
npm install
copy .env.example .env.local   # no Linux/Mac: cp .env.example .env.local
npm run dev
```

Abra <http://localhost:3000> e entre com o email e a senha que estão no `.env.local`.

> **Sem Vercel KV configurado**, o sistema grava os dados num arquivo local
> `.precifier-local.json` na raiz do projeto. Isso serve só para testar — em produção
> use o KV.

---

## 3. Publicar na Vercel (grátis)

### Passo 1 — Suba o código

Crie um repositório no GitHub com estes arquivos e importe em
<https://vercel.com/new>. Não é preciso mudar nenhuma configuração de build.

### Passo 2 — Crie o banco de dados

Dentro do projeto na Vercel:

1. Aba **Storage** → **Create Database** → **KV (Redis)**.
2. Dê um nome (ex.: `precifier-kv`) e conecte ao projeto.
3. A Vercel preenche `KV_REST_API_URL` e `KV_REST_API_TOKEN` sozinha. ✅

### Passo 3 — Cadastre as variáveis de ambiente

Em **Settings → Environment Variables**, adicione:

| Variável             | O que colocar                                                       |
| -------------------- | ------------------------------------------------------------------- |
| `KV_REST_API_URL`    | _(a Vercel preenche no passo 2)_                                    |
| `KV_REST_API_TOKEN`  | _(a Vercel preenche no passo 2)_                                    |
| `NEXTAUTH_SECRET`    | Uma frase aleatória longa. Gere com `openssl rand -base64 32`.      |
| `NEXTAUTH_URL`       | A URL final do site, ex.: `https://precifier.vercel.app`            |
| `USER_EMAIL`         | O email que o dono vai usar para entrar                             |
| `USER_PASSWORD`      | A senha do dono (o sistema gera o hash bcrypt sozinho)              |

### Passo 4 — Faça o deploy

Clique em **Deploy**. Pronto. Abra a URL, entre com o email e a senha e comece a usar.

---

## 4. Segurança da senha

Na **primeira tentativa de login**, o sistema cria o usuário no banco automaticamente (seed) e
guarda a senha como **hash bcrypt** — a senha em texto puro nunca fica salva no banco.

Se preferir não deixar a senha em texto puro nem na variável de ambiente, gere o hash antes:

```bash
npm run hash "minha-senha-secreta"
```

Copie a linha `USER_PASSWORD_HASH=...` para a Vercel e **apague** a variável `USER_PASSWORD`.

**Para trocar a senha depois:** basta mudar `USER_PASSWORD` (ou `USER_PASSWORD_HASH`) na Vercel e
fazer um novo deploy — o sistema detecta a mudança e atualiza o usuário no próximo login.

---

## 5. Como as contas são feitas

Toda a matemática fica num arquivo só: [`src/lib/calculos.ts`](src/lib/calculos.ts).

```
custo de um ingrediente   = (quantidade usada × preço por unidade) ÷ (rendimento ÷ 100)
custo da RECEITA INTEIRA  = soma do custo de todos os ingredientes
custo de insumos por      = custo da receita inteira ÷ quanto a receita rende
  unidade vendida

folha de pagamento        = (soma dos salários) × (1 + encargos ÷ 100)
custo fixo total          = gás + aluguel + luz + outros + folha de pagamento
% das contas da casa      = custo fixo total ÷ faturamento do mês × 100
contas da casa na venda   = preço de venda × (% das contas ÷ 100)

custo total do prato      = custo de insumos + contas da casa na venda
margem de lucro real (%)  = ((preço de venda − custo total) ÷ preço de venda) × 100

                            custo de ingredientes + taxa fixa do app
preço que fecha a conta  = ------------------------------------------------
                            1 − (%contas + %margem + %taxa do app) ÷ 100
```

**Por que percentual do faturamento e não "custo por prato":** numa casa de massas quase tudo é
vendido por quilo — contar "pratos vendidos no mês" é inviável, mas o total faturado qualquer PDV
informa. Além disso, o rateio percentual é mais justo: um item caro ajuda a pagar mais das contas
do que um salgadinho, que é como funciona na prática.

**Por que dividir e não somar:** custo fixo, margem e taxa de aplicativo são todos percentuais
**sobre o preço final**, então não podem ser somados ao custo — cada um incide sobre o próprio
preço. Um exemplo conferido em [testar-precos.mjs](scripts/testar-precos.mjs): ingredientes de
R$ 10,00, contas 30%, margem 20%, iFood 27% → preço R$ 43,48. Descontando: R$ 11,74 do app,
R$ 13,04 das contas, R$ 10,00 dos ingredientes, sobram **R$ 8,70 = exatamente 20%**.

Se a soma dos percentuais chegar a 100%, nenhum preço fecha a conta: a tela mostra
"impossível" em vez de um número absurdo.

**Sobre o rendimento da receita:** uma ficha técnica quase nunca produz uma porção só. O dono
informa o que a receita rende — **10 coxinhas**, **1 kg de macarrão**, **4 marmitas** — e o
sistema divide o custo dos ingredientes por esse número para achar o custo de **uma unidade
vendida**. Daí em diante (custo da casa, margem, lucro, preço sugerido) tudo é por unidade
vendida, na mesma unidade em que o preço é cobrado.

```
Receita de coxinha:  R$ 30,00 de insumos ÷ 10 porções = R$ 3,00 por coxinha
Receita de macarrão: R$ 30,00 de insumos ÷  1 kg      = R$ 30,00 por kg
```

Os ingredientes devem ser lançados para a **receita inteira**, não para uma porção. Rendimento
zerado ou inválido é tratado como 1, e pratos salvos antes deste campo existir são lidos como
"rende 1 porção" — exatamente como o sistema já os tratava, então nada muda para eles.

**Sobre a folha de pagamento:** cada pessoa da equipe é cadastrada com nome e salário mensal em
"Custos da Casa". O campo **encargos (%)** cobre o que se paga além do salário — FGTS, INSS,
férias, 13º. Com 40% de encargos, quem ganha R$ 2.000,00 custa R$ 2.800,00 por mês para o
negócio. Quem paga só o combinado deixa 0%.

Casos protegidos:

- **Preço de venda igual a zero** → margem 0% (nunca divide por zero).
- **Pratos vendidos por mês igual a zero** → custo da casa por prato = R$ 0,00.
- **Rendimento zerado ou inválido** → tratado como 100%.
- **Margem desejada de 100% ou mais** → limitada a 99% (nenhum preço atingiria 100%).
- **Encargos negativos ou inválidos** → tratados como 0%.
- **Salário negativo ou vazio** → conta como R$ 0,00 na soma.
- **Configuração salva antes dos funcionários existirem** → lida como equipe vazia, sem quebrar.

### Sobre digitar valores acima de mil

Os campos aceitam `2000`, `2.000` e `2.000,00` — todos viram dois mil. A regra está em
`paraNumero` ([formatar.ts](src/lib/formatar.ts)): quando só há pontos, eles são separador de
milhar **apenas** se todos os grupos tiverem exatamente 3 dígitos (`2.000` → 2000), senão são
decimais (`2.5` → 2,5). Ao preencher um campo, o sistema usa `paraCampo`, que **nunca** escreve
separador de milhar — o que aparece no campo é exatamente o que será gravado.

As mesmas funções rodam no navegador (para o cálculo em tempo real enquanto o dono digita) e no
servidor (na hora de salvar), então o número da tela nunca muda depois de salvar.

### Recálculo automático

- Mudou o **preço ou o rendimento de um insumo** → todos os pratos são recalculados no servidor.
- Excluiu um insumo → ele sai de todas as receitas e os custos são refeitos.
- Salvou os **Custos da Casa** → o custo da casa por prato muda em todos os pratos.
- Editou o **preço na tabela do início** → a margem e o lucro são recalculados na hora.

Em todos os casos o cache é invalidado com `revalidatePath`, então a tela inicial sempre mostra
números atualizados.

---

## 6. Organização dos arquivos

```
src/
├─ app/
│  ├─ (painel)/                 Área logada (compartilha cabeçalho + menu)
│  │  ├─ page.tsx               Dashboard "Visão Geral do Meu Negócio"
│  │  ├─ insumos/page.tsx       Tela "Meus Insumos"
│  │  ├─ pratos/page.tsx        Tela "Meus Pratos"
│  │  ├─ configuracoes/page.tsx Tela "Custos da Casa"
│  │  ├─ loading.tsx            Esqueletos de carregamento
│  │  └─ error.tsx              Tela amigável de erro
│  ├─ actions/                  Server Actions (toda a gravação passa por aqui)
│  ├─ api/auth/[...nextauth]/   Rota do NextAuth
│  ├─ login/page.tsx            Tela de login
│  └─ layout.tsx                Layout raiz + toasts
├─ components/                  Componentes de tela (formulários, tabelas, modais)
├─ lib/
│  ├─ calculos.ts               ⭐ Toda a matemática do negócio
│  ├─ banco.ts                  Acesso ao Vercel KV (com fallback local)
│  ├─ auth.ts                   Configuração do login
│  ├─ formatar.ts               Dinheiro e números no padrão brasileiro
│  ├─ estilos.ts                Classes Tailwind reaproveitadas
│  └─ types.ts                  Tipos de dados
└─ middleware.ts                Protege todas as rotas

Dockerfile                      Imagem (alvo "dev" e alvo "runner" de produção)
docker-compose.yml              Ambiente de desenvolvimento: app + redis + proxy KV
docker-compose.prod.yml         Ambiente de produção local
```

---

## 7. Dúvidas comuns

**Esqueci a senha.** O link "Esqueci a senha?" é só visual. Para trocar, altere a variável
`USER_PASSWORD` na Vercel e faça um novo deploy (veja a seção 4).

**Os dados sumiram.** Confira se `KV_REST_API_URL` e `KV_REST_API_TOKEN` estão preenchidas na
Vercel. Sem elas, o sistema tenta gravar em arquivo — e na Vercel esse arquivo não sobrevive.

**Quero mais de um usuário.** O sistema foi feito para um único dono. Vários usuários exigiriam
mudar `src/lib/auth.ts` e `src/lib/banco.ts`.

---

## 8. Sincronização com o PDV (caixa)

O PDV (`cadasmassas_pdv`) lê produtos do **mesmo Redis** deste sistema, quando os dois
projetos são configurados com as mesmas credenciais (`KV_REST_API_URL`/`KV_REST_API_TOKEN` ou
os equivalentes `UPSTASH_REDIS_REST_*`) — mas em chaves diferentes das que "Meus Pratos" usa.

Para um prato aparecer e vender pelo preço certo no caixa, edite-o e responda "Este prato é
vendido no caixa?":

- **Por peso** → informe o **PLU da balança** (0 a 9999).
- **Por unidade** (ex.: uma bebida) → informe o **código de barras**.
- **Não** (padrão) → o prato fica só no cálculo de custo/margem, sem afetar o caixa.

A partir daí, **toda vez que o prato for salvo** (inclusive a edição rápida de preço direto na
tabela do dashboard), o preço é publicado automaticamente nas chaves que o PDV lê
(`produto:{plu}` / `produto_ean:{código}` / `catalogo:snapshot` / `catalogo:versao` — ver
`src/lib/pdv.ts` e, no outro repositório, a seção 4 do README e `scripts/publicar_catalogo.py`).
O caixa pega o preço novo em até 60 segundos sozinho, ou na hora se alguém clicar em
"Atualizar catálogo" na tela dele.

**Isto é best-effort:** o cadastro aqui no precifier é sempre gravado primeiro; se o Redis do
PDV estiver fora do ar na hora de publicar, só o caixa fica desatualizado até a próxima
gravação — nada se perde aqui. Se isso acontecer, a mensagem de sucesso do formulário avisa.

**PLU ou código de barras repetido** em dois pratos: o segundo é ignorado na sincronização
(mas continua salvo normalmente aqui) — a mensagem avisa quantos itens ficaram de fora.

**Prato sem PLU/código de barras não é removido do caixa por engano.** Só produtos que já
tinham um dos dois preenchidos são publicados/atualizados/removidos de lá.
