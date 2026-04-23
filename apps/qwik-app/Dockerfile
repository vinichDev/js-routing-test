FROM node:20-alpine
WORKDIR /app

ARG VITE_SUT_ID=qwik_app
ENV VITE_SUT_ID=$VITE_SUT_ID

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "server/entry.express.js"]
