FROM node:lts-alpine

WORKDIR /nodejs-shopping-cart

COPY bin/ bin/
COPY models/ models/
COPY public/ public/
COPY routes/ routes/
COPY views/ views/
COPY LICENSE .
COPY app.js .
COPY package.json .

RUN npm install --production

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/npm", "start"]
CMD []
