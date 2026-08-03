FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY *.js ./
COPY .env ./

CMD ["node", "index.js"]
