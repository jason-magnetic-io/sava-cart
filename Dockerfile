FROM node:lts-alpine

WORKDIR /nodejs-shopping-cart

COPY bin/www bin/
COPY data/products.json data/
COPY data/ratings.json data/
COPY models/ models/
COPY public/ public/
COPY routes/ routes/
COPY views/ views/
COPY LICENSE .
COPY app.js .
COPY package.json .
COPY package-lock.json .

RUN npm install

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/npm", "start"]
CMD []
