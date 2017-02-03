const express = require('express');
const favicon = require('serve-favicon');
const http = require('http');
const mcache = require('memory-cache');
const path = require('path');
const parseArticle = require('./parser.js').parseArticle;

const app = express();


app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use((req, res, next) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  if (req.url.indexOf('.js') >= 0 || req.url.indexOf('.css') >= 0) {
    res.write('');
    res.end();
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const body = mcache.get(req.url);
  if (body) {
    res.write(body);
    res.end();
  } else {
    next();
  }
});

app.get('/img*', (req, res) => {
  parseArticle(res, req.url.substring(4), true);
});

app.get('/*', (req, res) => {
  parseArticle(res, req.url, false);
});

const PORT = 5050;
http.createServer(app).listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`App listening on port ${PORT}`);
});
