FROM node:24-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tsconfig*.json ./
RUN npm ci
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV PUBLIC_DIR=/app/apps/client/dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/tsconfig*.json ./
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["npx", "tsx", "apps/server/src/index.ts"]
