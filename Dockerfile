FROM node:latest AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN chmod -R 755 /app/build

FROM node:latest

ENV NODE_ENV production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD [ "npm", "start" ]