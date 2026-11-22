FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ libxml2 curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "backend_api.cjs"]
