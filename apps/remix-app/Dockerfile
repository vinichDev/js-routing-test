# Формирование контейнера Remix приложения.
FROM node:20-alpine

# Инициализация рабочей директории приложения.
WORKDIR /app

# Объявление build-аргумента публичного идентификатора SUT.
ARG REMIX_PUBLIC_SUT_ID
# Для совместимости с логикой телеметрии
ENV REMIX_PUBLIC_SUT_ID=$REMIX_PUBLIC_SUT_ID

# Копирование файлов зависимостей приложения.
COPY package.json package-lock.json ./

# Установка зависимостей приложения.
RUN npm install

# Копирование исходного кода и конфигурационных файлов проекта.
COPY . .

# Выполнение production-сборки приложения.
RUN npm run build

# Декларация сетевого порта приложения.
EXPOSE 3000

# Запуск production-сервера Remix.
CMD ["npm", "start"]
