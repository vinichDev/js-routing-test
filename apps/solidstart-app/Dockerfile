FROM node:20-alpine

WORKDIR /app

ARG VITE_SUT_ID=solidstart_app
ENV VITE_SUT_ID=$VITE_SUT_ID

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN VITE_SUT_ID=$VITE_SUT_ID npm run build

EXPOSE 3000

CMD ["npm", "start"]
