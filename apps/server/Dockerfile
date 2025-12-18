FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY apps/server/package.json ./apps/server/
COPY libs/ui/package.json ./libs/ui/

RUN npm ci

# Copy NX configuration
COPY nx.json tsconfig*.json ./

EXPOSE 3000

CMD ["nx", "serve", "server"]
