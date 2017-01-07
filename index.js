const http = require('http');
const connect = require('connect');
const cheerio = require('cheerio');

const app = connect();

app.use((req, res, next) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  if (req.url.indexOf('.js') >= 0 || req.url.indexOf('.css') >= 0) {
    res.write('');
    res.end();
  } else {
    next();
  }
});

app.use((req, res) => {
  http.get({
    host: 'www.clarin.com',
    path: req.url,
  }, (response) => {
    const contentType = response.headers['content-type'];
    if (
      (typeof contentType !== 'undefined') &&
      (contentType.indexOf('text/html') === 0)
    ) {
      let body = '';
      response.on('data', (d) => {
        body += d;
      });
      response.on('end', () => {
        const $ = cheerio.load(body);
        $('.share-bar').remove();
        $('.share').remove();
        $('.tags').remove();
        $('.banner').remove();
        $('.relacionadas').remove();
        $('.colDerecha').remove();
        $('.cxense-content').remove();
        $('#comments').remove();
        $('footer').remove();
        $('script').remove();

        $('.img-responsive').each((idx, node) => {
          const elem = $(node);
          elem.attr('src', elem.data('small'));
        });

        let output = $('.content.home');
        if (!output.length) {
          output = $('.container');
        }

        const outlinks = $('.box-content-new, .content-new').remove();
        outlinks.find('span').remove();
        output.append(outlinks);

        res.write(output.html());
        res.end();
      });
    } else {
      res.write('');
      res.end();
    }
  });
});

http.createServer(app).listen(5050);
