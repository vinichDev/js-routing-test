FROM node:20-alpine

# Docker CLI нужен чтобы скрипты могли вызывать docker compose внутри контейнера
RUN apk add --no-cache docker-cli docker-compose bash curl

WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./

EXPOSE 4000
CMD ["node", "server.js"]
