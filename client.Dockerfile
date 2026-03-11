# ── Dev stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build stage ────────────────────────────────────────────────────────────
FROM dev AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/local.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
