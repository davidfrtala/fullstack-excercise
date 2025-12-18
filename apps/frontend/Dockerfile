FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY libs/ui/package.json ./libs/ui/

RUN npm ci

# Copy NX configuration
COPY nx.json tsconfig*.json ./

EXPOSE 8000

CMD ["nx", "serve", "frontend"]
