# Формирование контейнера сервиса данных.
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей сервиса.
COPY package.json ./
RUN npm install --omit=dev

# Копирование исходного кода сервиса.
COPY server.js ./

# Декларация порта сервиса.
EXPOSE 8080

# Запуск сервиса данных.
CMD ["npm", "start"]