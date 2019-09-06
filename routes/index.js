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
let currency;
let displayCurrency;
let displayCurrencyIcon;
switch (locale) {
  case 'br':
    currency = 'BRL';
    displayCurrency = 'R$';
    displayCurrencyIcon = '';
    break;
  case 'cl':
    currency = 'CLP';
    displayCurrency = '';
    displayCurrencyIcon = 'glyphicon-usd';
    break;
  case 'in':
    currency = 'INR';
    displayCurrency = 'Rs.';
    displayCurrencyLeft = true;
    displayCurrencyIcon = '';
    break;
  case 'pe':
      currency = 'PEN';
      displayCurrency = 'S/';
      displayCurrencyLeft = true;
      displayCurrencyIcon = '';
      break;
  case 'se':
    currency = 'SEK';
    displayCurrency = 'kr';
    displayCurrencyIcon = '';
    break;
  case 'uk':
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

const productServiceVersion = 2;
console.log('productServiceVersion: ' + productServiceVersion);

const productServiceURL = productServiceAddr + '/products/' + locale;
console.log('productServiceURL: ' + productServiceURL);

const productServiceRequestHeaders = {
  Accept: 'application/vnd.sava.v' + productServiceVersion + '+json'
};
console.log('productServiceRequestHeaders: ' + JSON.stringify(productServiceRequestHeaders));

const fs = require('fs');
const axios = require('axios');
const getProducts = async () => {
  try {
    const response = await axios.get(productServiceURL, { headers: productServiceRequestHeaders });
    return applyLocale(response.data);
  } catch (err) {
    console.error(err);
    return applyLocale(JSON.parse({})); 
  }
}

// payment service
console.log('PAYMENT_SERVICE_ADDR: ' + process.env.PAYMENT_SERVICE_ADDR);
var paymentServiceAddr = process.env.PAYMENT_SERVICE_ADDR;
if (paymentServiceAddr === undefined) {
  // default to "sidecar"
  paymentServiceAddr = 'http://127.0.0.1:9090';
}
console.log('paymentServiceAddr: ' + paymentServiceAddr);

const paymentServiceURL = paymentServiceAddr + '/basket';
console.log('paymentServiceURL: ' + paymentServiceURL);

const paymentServiceRequestHeaders = {
  'Content-type': 'application/json'
};
console.log('paymentServiceRequestHeaders: ' + JSON.stringify(paymentServiceRequestHeaders));

const postBasket = async (basket) => {
  try {
    const response = await axios.post(paymentServiceURL, basket, { headers: paymentServiceRequestHeaders });
    return response.data;
  } catch (err) {
    console.error(err);
    return {'message': 'failed'}; 
  }
}

// voucher
var vouchers = process.env.VOUCHERS;
console.log('VOUCHERS: ' + process.env.VOUCHERS);
if (vouchers) {
  vouchers = JSON.parse(vouchers);
}
console.log('vouchers: ' + vouchers);

const uaParser = require('ua-parser-js');
const getVoucher = (ua) => {
  console.log('user-agent: ' + ua);
  var result = uaParser(ua);
  console.log('result: ' + JSON.stringify(result));
  return null;
}

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

// title
var title = process.env.TITLE;
if (title === undefined) {
  title = 'Vamp Shopping Cart';
}

const Cart = require('../models/cart');
router.get(BASE_PATH, async (req, res, next) => {
  res.render('index', 
  {
    basePath: BASE_PATH,
    title: title,
    locale: locale.toLocaleUpperCase(),
    displayCurrency: displayCurrency,
    displayCurrencyIcon: displayCurrencyIcon,
    products: await getProducts()
  }
  );
});

router.get(BASE_PATH + 'add/:id', async (req, res, next) => {
  const products = await getProducts();
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  
  // voucher
  if (cart.totalItems == 0) {
    var voucher = getVoucher(req.header('User-Agent'));
    if (voucher) {
      const product = products.filter((item) => {
        return item.id == voucher;
      });
      cart.add(product[0], voucher);
    }
  }
  
  const product = products.filter((item) => {
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

  // voucher
  if (cart.totalItems == 1) {
    var voucher = getVoucher(req.header('User-Agent'));
    if (voucher) {
      cart.remove(voucher);
    }
  }
  
  req.session.cart = cart;
  res.redirect(BASE_PATH + 'cart');
});

router.get(BASE_PATH + 'cart/checkout', (req, res, next) => {
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  const basket = {
    locale: locale,
    currency: currency,
    itemsIds: cart.getItemIds(),
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    requestUserAgent: req.header('User-Agent')
  };
  console.log('basket: ' + JSON.stringify(basket));
  postBasket(basket);

  req.session.cart = {};
  res.redirect(BASE_PATH);
});

router.post(BASE_PATH + 'mobile', (req, res, next) => {
  console.log('/mobile: ' + JSON.stringify(req.body));
  res.json(postBasket(req.body));
});

module.exports = {
  BASE_PATH,
  router
};
