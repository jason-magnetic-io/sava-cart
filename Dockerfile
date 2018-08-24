FROM node:latest

WORKDIR /nodejs-shopping-cart

COPY bin/ bin/
COPY data/ data/
COPY models/ models/
COPY public/ public/
COPY routes/ routes/
COPY views/ views/
COPY LICENSE .
COPy README.MD .
COPY app.js .
COPY package.json .

RUN npm install

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/npm", "start"]
CMD []
