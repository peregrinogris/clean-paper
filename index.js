const http = require('http');
const connect = require('connect');
const cheerio = require('cheerio');

const app = connect();

const parseArticle = (res, url, images) => {
  http.get({
    host: 'www.clarin.com',
    path: url,
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
        body = body.replace(/"!=""\u00b7trueValue=/g, '')
                   .replace(/\}\}/g, '');
        const $ = cheerio.load(body);
        const onDemand = [];

        $('.on-demand').each((i, e) => {
          onDemand.push(new Promise((resolve) => {
            http.get({
              host: 'www.clarin.com',
              path: $(e).data('src'),
            }, (onDemandResp) => {
              let onDemandBody = '';
              onDemandResp.on('data', (d) => {
                onDemandBody += d;
              });
              onDemandResp.on('end', () => {
                resolve(
                  JSON.parse(
                    onDemandBody.substr(1, onDemandBody.length - 2)
                  ).data.replace(/"!=""\u00b7trueValue=/g, '')
                        .replace(/\}\}/g, '')
                );
              });
            });
          }));
        });

        Promise.all(onDemand).then((values) => {
          values.forEach((onDemandContent) => {
            $('body').append(onDemandContent);
          });

          $('header').remove();
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
          $('.sticky-spacer:last-of-type').remove();
          $('.on-demand').remove();


          if (!images) {
            // Las imágenes suelen venir adentro de un link en los articulos
            $('article > a').remove();
            $('img').remove();
          } else {
            $('.img-responsive').each((idx, node) => {
              const elem = $(node);
              elem.attr('src', elem.data('small'));
            });

            $('article').each((i, elem) => {
              if ($(elem).find('img').length > 0) {
                $(elem).append($(elem).find('a').first().remove());
              }
            });

            $('a').each((i, elem) => {
              $(elem).attr('href', `${$(elem).attr('href')}?img`);
            });
          }

          // Sacarle las clases a los artículos, que no quieren decir nada
          $('article, h5').removeAttr('class').removeAttr('id');

          const content = $('<body>');
          let title = '';
          if ($('.content.home').length > 0) {
            // Home
            const columnistas = $('.mod-columnistas-horizontal')
                                .find('h5, ul').remove();
            content.append($('article, h5').remove());
            content.append(columnistas);
          } else {
            // Artículo específico
            $('[id^=bannerId_]').remove();
            $('[id^=sas_]').remove();
            $('.breadcrumb li:first-of-type a').attr('href', '/');
            const outlinks = $('.box-content-new, .content-new').remove();
            // outlinks.find('span').remove();

            content.append($('.nota-unica .title, .nota-unica .notas-content'));
            content.append(outlinks);

            title += ` - ${$('title').text()}`;
          }

          const head = '<!DOCTYPE html>' +
                       '<head>' +
                       '<meta charset="utf-8">' +
                       `<title>Clarin Limpio${title}</title>` +
                       '<style>' +
                       'figure{margin:0;}' +
                       'img{max-width:100%;}' +
                       '</style></head>';
          res.write(head + content.html());
          res.end();
        });
      });
    } else {
      res.write('');
      res.end();
    }
  });
};

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
  const images = req.url.indexOf('?img') >= 0;
  const url = (images) ? req.url.replace('?img', '') : req.url;
  parseArticle(res, url, images);
});

http.createServer(app).listen(5050);
