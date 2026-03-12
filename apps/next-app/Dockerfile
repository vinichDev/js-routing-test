# Формирование контейнера Next.js приложения.
FROM node:20-alpine

# Инициализация рабочей директории приложения.
WORKDIR /app

# Объявление build-аргумента публичного идентификатора SUT.
ARG NEXT_PUBLIC_SUT_ID

# Экспорт build-аргумента в переменную окружения сборки.
ENV NEXT_PUBLIC_SUT_ID=$NEXT_PUBLIC_SUT_ID

# Копирование файлов зависимостей приложения.
COPY package.json package-lock.json ./

# Установка зависимостей приложения.
RUN npm ci

# Копирование исходного кода и конфигурационных файлов проекта.
COPY . .

# Выполнение production-сборки приложения.
RUN npm run build

# Декларация сетевого порта приложения.
EXPOSE 3000

# Запуск production-сервера Next.js.
CMD ["npm", "start"]