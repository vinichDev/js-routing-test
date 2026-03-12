# Формирование контейнера коллектора метрик.
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей коллектора.
COPY package.json ./
RUN npm install --omit=dev

# Копирование исходного кода коллектора.
COPY server.js ./

# Декларация порта коллектора.
EXPOSE 8090

# Запуск коллектора метрик.
CMD ["npm", "start"]