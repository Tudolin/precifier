# =====================================================================
# Imagem do sistema "Meu Preco Certo".
# Tem dois modos:
#   target=dev     -> desenvolvimento, com recarregamento automatico
#   target=runner  -> producao, enxuta (Next.js standalone)
# =====================================================================

FROM node:20-alpine AS base
# libc6-compat evita erros de biblioteca em imagens Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1


# ---------------------------------------------------------------------
# 1) Dependencias (camada em cache: so refaz se o package.json mudar)
# ---------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi


# ---------------------------------------------------------------------
# 2) Desenvolvimento — usado pelo docker-compose.yml
# ---------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------------
# 3) Build de producao
# ---------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Todas as telas sao "force-dynamic", entao o build NAO precisa acessar
# o banco nem as variaveis de ambiente reais.
RUN npm run build


# ---------------------------------------------------------------------
# 4) Producao — imagem final, so com o necessario para rodar
# ---------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Roda como usuario sem privilegios
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
