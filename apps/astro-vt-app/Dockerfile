FROM node:22-alpine
WORKDIR /app

ARG SUT_ID=astro_vt_app
ENV SUT_ID=$SUT_ID

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "./dist/server/entry.mjs"]
