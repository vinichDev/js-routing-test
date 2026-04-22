FROM node:20-alpine

WORKDIR /app

ARG RR_PUBLIC_SUT_ID
ENV RR_PUBLIC_SUT_ID=$RR_PUBLIC_SUT_ID

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
