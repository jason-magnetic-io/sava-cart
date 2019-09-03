var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var hbs = require('hbs');
var session = require('express-session');

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(__dirname + '/views/partials');
hbs.registerHelper('formatNum', function(locale, num) {
  if (typeof num !== 'number' || isNaN(num)) {
    return num;
  }

  switch (locale) {
    case 'cl':
      return num.toFixed().replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    case 'in':
      return num.toFixed();
    case 'ie':
    case 'pe':
    case 'uk':
    case 'us':
      return num.toFixed(2);
    default:
      return num.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  }
});
app.set('view engine', 'hbs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}))
app.use(index.BASE_PATH, express.static(path.join(__dirname, 'public')));

// res.locals is an object passed to hbs engine
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});

app.use('/', index.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
