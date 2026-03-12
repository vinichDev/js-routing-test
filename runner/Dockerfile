# Формирование контейнера раннера Playwright.
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

# Инициализация рабочей директории контейнера.
WORKDIR /app

# Копирование файла зависимостей раннера.
COPY package.json ./

# Установка зависимостей раннера.
RUN npm install --omit=dev

# Копирование сценария прогона.
COPY test.js ./

# Запуск сценария прогона.
CMD ["node", "test.js"]