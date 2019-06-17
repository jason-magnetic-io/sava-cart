const express = require('express');
const router = express.Router();

console.log('--- index.js --');

// get locale
var locale = process.env.LOCALE;
console.log('LOCALE: ' + process.env.LOCALE);
if (locale === undefined) {
  process.exit(1);
}
locale = String(locale).toLowerCase();
console.log('locale: ' + locale);

// set currency and icon based on the locale
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

const applyLocale = (products) => {
  products.forEach(function(obj) {
    obj.currency = currency;
    obj.displayCurrency = displayCurrency;
    obj.displayCurrencyIcon = displayCurrencyIcon;
  });

  return products;
}

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

const productServiceVersion = 1;
console.log("productServiceVersion: " + productServiceVersion);

const productServiceURL = productServiceAddr + '/products/' + locale;
console.log("productServiceURL: " + productServiceURL);

const productServiceRequestHeaders = {
  'Accept': 'application/vnd.sava.v' + productServiceVersion +'+json'
};
console.log("productServiceRequestHeaders: " + JSON.stringify(productServiceRequestHeaders));

const fs = require('fs');
const axios = require('axios');
const getProducts = async () => {
  try {
    const response = await axios.get(productServiceURL, { headers: productServiceRequestHeaders });
    return applyLocale(response.data);
  } catch (err) {
    console.error(err);
    return applyLocale(JSON.parse(fs.readFileSync('./data/products.json', 'utf8')));
  }
}

// title
var title = process.env.TITLE;
if (title === undefined) {
  title = 'Vamp Shopping Cart';
}

const Cart = require('../models/cart');

router.get('/', async (req, res, next) => {
  res.render('index', 
  { 
    title: title,
    locale: locale.toLocaleUpperCase(),
    displayCurrency: displayCurrency,
    displayCurrencyIcon: displayCurrencyIcon,
    products: await getProducts()
  }
  );
});

router.get('/add/:id', async (req, res, next) => {
  const products = await getProducts();
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  const product = products.filter((item) => {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect('/');
});

router.get('/cart', (req, res, next) => {
  if (!req.session.cart) {
    return res.render('cart', {
      products: null
    });
  }
  const cart = new Cart(req.session.cart);
  res.render('cart', {
    title: title,
    locale: locale.toLocaleUpperCase(),
    displayCurrency: displayCurrency,
    displayCurrencyIcon: displayCurrencyIcon,
    products: cart.getItems(),
    totalPrice: cart.totalPrice
  });
});

router.get('/remove/:id', (req, res, next) => {
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  cart.remove(productId);
  req.session.cart = cart;
  res.redirect('/cart');
});

module.exports = router;
