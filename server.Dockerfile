# ── Dev stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY server/package*.json ./
RUN npm ci
COPY server/ .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ── Production stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
EXPOSE 3001
CMD ["npm", "start"]
