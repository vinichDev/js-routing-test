FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/angular-app/server/server.mjs"]
