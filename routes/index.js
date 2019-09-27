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

// show ratings?
console.log('SHOW_RATINGS: ' + process.env.SHOW_RATINGS);
var showRatings = false;
if (process.env.SHOW_RATINGS === 1 ||
    (typeof process.env.SHOW_RATINGS === 'string' && process.env.SHOW_RATINGS.toLocaleLowerCase() === 'true')) {
  showRatings = true;
}
console.log('showRatings: ' + showRatings);

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
let ratingsServiceURL;
let ratingsServiceRequestHeaders;
if (showRatings) {
  console.log('RATINGS_SERVICE_ADDR: ' + process.env.RATINGS_SERVICE_ADDR);
  var ratingsServiceAddr = process.env.RATINGS_SERVICE_ADDR;
  if (ratingsServiceAddr === undefined) {
    // kubernetes
    var port = process.env.SAVA_RATINGS_SERVICE_PORT;
    if (port === undefined) {
      port = 9080;
    }

    ratingsServiceAddr = 'http://sava-ratings:' + port;
  }
  console.log('ratingsServiceAddr: ' + ratingsServiceAddr);

  ratingsServiceURL = ratingsServiceAddr + '/ratings/' + locale;
  console.log('ratingsServiceURL: ' + ratingsServiceURL);

  ratingsServiceRequestHeaders = {
    Accept: 'application/json'
  };
  console.log('ratingsServiceRequestHeaders: ' + JSON.stringify(ratingsServiceRequestHeaders));
}

const axios = require('axios');
const getProducts = async () => {
  try {
    const prodServResponse = await axios.get(productServiceURL, { headers: productServiceRequestHeaders });
    if (showRatings) {
      const rateServResponse = await axios.get(ratingsServiceURL, { headers: ratingsServiceRequestHeaders });
      return applyLocaleAndRatings(prodServResponse.data, rateServResponse.data);
    } else {
      return applyLocaleAndRatings(prodServResponse.data, {});
    }
  } catch (err) {
    console.error(err);
    return applyLocaleAndRatings({}, {});
  }
};

// order service
console.log('ORDER_SERVICE_ADDR: ' + process.env.ORDER_SERVICE_ADDR);
var orderServiceAddr = process.env.ORDER_SERVICE_ADDR;
if (orderServiceAddr === undefined) {
  // default to "sidecar"
  orderServiceAddr = 'http://127.0.0.1:9090';
}
console.log('orderServiceAddr: ' + orderServiceAddr);

const orderServiceURL = orderServiceAddr + '/basket';
console.log('orderServiceURL: ' + orderServiceURL);

const orderServiceRequestHeaders = {
  'Content-type': 'application/json'
};
console.log('orderServiceRequestHeaders: ' + JSON.stringify(orderServiceRequestHeaders));

const postBasket = async (basket) => {
  try {
    const response = await axios.post(orderServiceURL, basket, { headers: orderServiceRequestHeaders });
    return response.data;
  } catch (err) {
    console.error(err);
    return {'message': 'failed'}; 
  }
}

// UA based device type lookup
const uaParser = require('ua-parser-js');
const getDeviceType = (ua) => {
  console.log('user-agent: ' + ua);
  var result = uaParser(ua);
  if (typeof result !== 'undefined' && Object.keys(result).length > 0) {
    if (typeof result.device.type !== 'undefined') {
      return result.device.type;
    }
  }
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

router.get(BASE_PATH + 'cart/checkout', (req, res, next) => {
  const ua = req.header('User-Agent');
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  const basket = {
    locale: locale,
    currency: currency,
    itemIds: cart.getItemIds(),
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    requestUserAgent: ua,
    deviceType: getDeviceType(ua)
  };
  console.log('basket: ' + JSON.stringify(basket));
  postBasket(basket);

  req.session.cart = {};
  res.redirect(BASE_PATH);
});

router.post(BASE_PATH + 'mobile', (req, res, next) => {
  console.log('/mobile: ' + JSON.stringify(req.body));
  var basket = req.body;
  if (typeof basket.requestUserAgent !== 'undefined') {
    var deviceType = getDeviceType(basket.requestUserAgent);
    if (deviceType) {
      basket['deviceType'] = deviceType;
    }
  }
  res.json(postBasket(basket));
});

module.exports = {
  BASE_PATH,
  router
};
