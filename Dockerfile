# ---- build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# A imagem final (abaixo) já vem com o Chromium certo pra versão do Playwright
# instalada — não precisamos baixar o navegador aqui, só compilar o Next.js.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# "Queimados" no bundle do cliente durante `next build` (Next.js embute
# NEXT_PUBLIC_* no JS enviado ao navegador). Não são segredo — vêm do
# .env.example. Informe-os como "Build Arguments" no Render.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
# Mesma versão do playwright instalada em package.json — se atualizar o
# pacote, atualize a tag da imagem junto (ex.: v1.63.0-jammy).
FROM mcr.microsoft.com/playwright:v1.62.1-jammy AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
# O Docker define HOSTNAME automaticamente com o nome do container; sem esta
# linha, o server.js do Next.js usa esse valor em vez de "0.0.0.0" e o proxy
# do Render não consegue alcançar o processo (502 mesmo com o app "no ar").
ENV HOSTNAME=0.0.0.0
EXPOSE 10000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# O output "standalone" só inclui os arquivos que o tracer do Next.js consegue
# detectar estaticamente; o playwright-core carrega alguns arquivos (como
# browsers.json) de um jeito que o tracer não enxerga, deixando a copia podada
# incompleta. Sobrescreve com os pacotes completos do estagio de build.
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core

# Mesmo problema com o pdf-parse: ele carrega o binário nativo do
# @napi-rs/canvas (variante certa por plataforma, ex.: -linux-x64-gnu) de um
# jeito que o tracer também não enxerga -- sem isso, o import de "pdf-parse"
# falha com "DOMMatrix is not defined" assim que o módulo é carregado.
COPY --from=builder /app/node_modules/pdf-parse ./node_modules/pdf-parse
COPY --from=builder /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder /app/node_modules/@napi-rs ./node_modules/@napi-rs

CMD ["node", "server.js"]
