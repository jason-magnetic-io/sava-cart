const express = require('express');
const router = express.Router();

console.log('--- index.js --');

// get locale
var locale = process.env.LOCALE;
console.log('LOCALE: ' + process.env.LOCALE);
if (locale === undefined) {
  locale = 'en';
}
locale = String(locale).toLowerCase();
console.log('locale: ' + locale);

// set currency and icon based on the locale
let currency;
let displayCurrency;
let displayCurrencyIcon;
switch (locale) {
  case 'en':
    currency = 'GBP';
    displayCurrency = '';
    displayCurrencyIcon = 'glyphicon-gbp';
    break;
  case 'us':
    currency = 'USD';
    displayCurrency = '';
    displayCurrencyIcon = 'glyphicon-usd';
    break;
  default:
    currency = 'EUR';
    displayCurrency = '';
    displayCurrencyIcon = 'glyphicon-eur';
}

// show ratings?
var showRatings = process.env.SHOW_RATINGS;
console.log('SHOW_RATINGS: ' + showRatings);
if (showRatings === undefined) {
  showRatings = true;
}

const applyLocaleAndRatings = (products, ratings) => {
  products.forEach((product) => {
    if (showRatings) {
      product = Object.assign(product, ratings.find(rating => rating.id === product.id));
    }
    product.currency = currency;
    product.displayCurrency = displayCurrency;
    product.displayCurrencyIcon = displayCurrencyIcon;
  });

  return products;
};

// product service
console.log('PRODUCT_SERVICE_ADDR: ' + process.env.PRODUCT_SERVICE_ADDR);
var productServiceAddr = process.env.PRODUCT_SERVICE_ADDR;
if (productServiceAddr === undefined) {
  // kubernetes
  var port = process.env.SAVA_PRODUCT_SERVICE_PORT;
  if (port === undefined) {
    port = 9070;
  }

  productServiceAddr = 'http://sava-product:' + port;
}
console.log('productServiceAddr: ' + productServiceAddr);

const productServiceVersion = 2;
console.log('productServiceVersion: ' + productServiceVersion);

const productServiceURL = productServiceAddr + '/products/' + locale;
console.log('productServiceURL: ' + productServiceURL);

const productServiceRequestHeaders = {
  Accept: 'application/vnd.sava.v' + productServiceVersion + '+json'
};
console.log('productServiceRequestHeaders: ' + JSON.stringify(productServiceRequestHeaders));

// ratings service
console.log('RATINGS_SERVICE_ADDR: ' + process.env.RATINGS_SERVICE_ADDR);
var ratingsServiceAddr = process.env.RATINGS_SERVICE_ADDR;
if (ratingsServiceAddr === undefined) {
  // kubernetes
  var port = process.env.SAVA_RATINGS_SERVICE_PORT;
  if (port === undefined) {
    port = 9085;
  }

  ratingsServiceAddr = 'http://sava-ratings:' + port;
}
console.log('ratingsServiceAddr: ' + ratingsServiceAddr);

const ratingsServiceURL = ratingsServiceAddr + '/ratings/' + locale;
console.log('ratingsServiceURL: ' + ratingsServiceURL);

const ratingsServiceRequestHeaders = {
  Accept: 'application/json'
};
console.log('ratingsServiceRequestHeaders: ' + JSON.stringify(ratingsServiceRequestHeaders));

const fs = require('fs');
const axios = require('axios');
const getProducts = async () => {
  try {
    const prodServResponse = await axios.get(productServiceURL, { headers: productServiceRequestHeaders });
    const rateServResponse = await axios.get(ratingsServiceURL, { headers: ratingsServiceRequestHeaders });
    return applyLocaleAndRatings(prodServResponse.data, rateServResponse.data);
  } catch (err) {
    console.error(err);
    return applyLocaleAndRatings(
      JSON.parse(fs.readFileSync('./data/products.json', 'utf8')),
      JSON.parse(fs.readFileSync('./data/ratings.json', 'utf8'))
    );
  }
};

// get base path
var basePath = process.env.BASE_PATH;
console.log('BASE_PATH: ' + process.env.BASE_PATH);
if (basePath === undefined) {
  // use locale
  basePath = '/' + locale;
} else {
  // remove any leading/trainling whitespace and trailing slashes
  basePath = basePath.trim().replace(/\/+$/, '');
}
basePath = basePath + '/';
console.log('basePath: ' + basePath);

const BASE_PATH = basePath;

const Cart = require('../models/cart');

const title = 'Vamp Shopping Cart';

router.get(BASE_PATH, async (req, res, next) => {
  res.render('index', {
    basePath: BASE_PATH,
    title: title,
    locale: locale.toLocaleUpperCase(),
    displayCurrency: displayCurrency,
    displayCurrencyIcon: displayCurrencyIcon,
    products: await getProducts()
  });
});

router.get(BASE_PATH + 'add/:id', async (req, res, next) => {
  const products = await getProducts();
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  const product = products.filter(item => {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect(BASE_PATH);
});

router.get(BASE_PATH + 'cart', (req, res, next) => {
  if (!req.session.cart) {
    return res.render('cart', {
      products: null
    });
  }
  const cart = new Cart(req.session.cart);
  res.render('cart', {
    basePath: BASE_PATH,
    title: title,
    locale: locale.toLocaleUpperCase(),
    displayCurrency: displayCurrency,
    displayCurrencyIcon: displayCurrencyIcon,
    products: cart.getItems(),
    totalPrice: cart.totalPrice
  });
});

router.get(BASE_PATH + 'remove/:id', (req, res, next) => {
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  cart.remove(productId);
  req.session.cart = cart;
  res.redirect(BASE_PATH + 'cart');
});

module.exports = {
  BASE_PATH,
  router
};
