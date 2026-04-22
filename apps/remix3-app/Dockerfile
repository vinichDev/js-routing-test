# Формирование контейнера Remix v3 приложения.
FROM node:20-alpine

# Инициализация рабочей директории приложения.
WORKDIR /app

# Объявление build-аргумента публичного идентификатора SUT.
ARG SUT_ID=remix3_app

# Экспорт build-аргумента в переменную окружения.
ENV SUT_ID=$SUT_ID

# Копирование файлов зависимостей приложения.
COPY package.json package-lock.json* ./

# Установка зависимостей приложения.
RUN npm install

# Копируем исходный код и ассетов приложения.
COPY ./src ./src

# Компиляция JSX/TSX
RUN npm run build

# Декларация сетевого порта приложения.
EXPOSE 3000

# Запуск сервера Remix v3.
CMD ["npm", "start"]
