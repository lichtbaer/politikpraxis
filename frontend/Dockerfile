# Frontend – Build-Stage
FROM node:26-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# API-URL zur Build-Zeit (kann beim Build überschrieben werden)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Frontend – Production-Stage mit Nginx
FROM nginx:alpine
# Alpine-Pakete des Base-Images auf den Stand des Stable-Repos heben: nginx:alpine
# hinkt Alpine-Security-Fixes teils Wochen hinterher (z.B. util-linux/libuuid
# CVE-2026-53612 ff.), Trivy blockiert den Build sonst mit HIGH-Funden.
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
