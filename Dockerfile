FROM node:20.9.0 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm i 


COPY . .

RUN npm run build
RUN chmod -R 755 /app/build

FROM node:latest

ENV NODE_ENV production

WORKDIR /app

COPY package*.json ./
RUN npm i 

COPY --from=builder /app/build ./build
COPY --from=builder /app/src/data ./build/data


EXPOSE 3000

CMD [ "npm", "start" ]