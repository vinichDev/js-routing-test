# Формирование контейнера SvelteKit приложения.
FROM node:20-alpine

# Инициализация рабочей директории приложения.
WORKDIR /app

# Объявление build-аргумента публичного идентификатора SUT.
ARG SUT_ID=svelte_app

# Экспорт в переменную окружения для server-side кода.
ENV SUT_ID=$SUT_ID

# Копирование файлов зависимостей приложения.
COPY package.json package-lock.json* ./

# Установка зависимостей приложения.
RUN npm install

# Копирование исходного кода и конфигурационных файлов проекта.
COPY . .

# Выполнение production-сборки приложения.
RUN npm run build

# Декларация сетевого порта приложения.
EXPOSE 3000

# Запуск production-сервера SvelteKit (adapter-node).
CMD ["node", "build/index.js"]
