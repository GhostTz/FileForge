FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    yt-dlp

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p temp && chmod 777 temp

EXPOSE 3010

CMD [ "node", "src/server/server.js" ]