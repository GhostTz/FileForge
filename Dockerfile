FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3010

# Temp Ordner erstellen
RUN mkdir -p temp

CMD [ "node", "src/server/server.js" ]