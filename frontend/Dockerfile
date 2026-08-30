FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
COPY .figma/ /app/.figma/
RUN pnpm build

FROM nginx:1.28-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
