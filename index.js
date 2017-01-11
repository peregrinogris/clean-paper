const cheerio = require('cheerio');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
let template = '';
fs.readFile(path.resolve(__dirname, 'template.tpl'), 'utf8', (err, data) => {
  if (err) throw err; // we'll not consider error handling for now
  template = data;
});

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
          $('.mam').remove();


          if (!images) {
            // Las imágenes suelen venir adentro de un link en los articulos
            $('article > a').remove();
            $('img').remove();
            $('#galeria-trigger, .image-trigger').remove();
            // Eliminar todos los embeds que no sean tweets
            $('[class^=embed-]').each((i, elem) => {
              if (!$(elem).find('.twitter-tweet').length) {
                $(elem).remove();
              }
            });
          } else {
            $('.img-responsive').each((idx, node) => {
              const elem = $(node);
              elem.attr('src', elem.data('small'));
            });

            $('article').each((i, elem) => {
              if ($(elem).find('img').length > 0) {
                $(elem).prepend($(elem).find('.txt').first().remove());
              }
            });
          }

          // Limpio el markup de los artículos
          $('article').each((i, elem) => {
            const title = $(elem).find('.txt a').remove();
            const image = $(elem).find(images ? 'figure' : '').remove();
            const text = $(elem).find('p').remove();
            // El orden siempre va a ser titulo - imagen - bajada
            $(elem).empty().append(title, image, text);
          });

          // Sacarle las clases a los artículos y títulos, no quieren decir nada
          $('article, h5').removeAttr('class').removeAttr('id');

          const content = $('<body>');
          let title = 'Clarin Limpio';
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

            // Outlinks
            const outlinks = $('<div class="outlinks"></div>');
            outlinks.append($('.box-content-new, .content-new').remove());
            outlinks.find('span').remove();
            // Heurística, a veces los outlinks estan en medio del txto y tienen
            // la pinta de "Mirá también: ..."
            $('a').each((i, elem) => {
              if ($(elem).text().toLowerCase().indexOf('mir') === 0) {
                outlinks.append($(elem).remove());
              }
            });

            content.append($('.nota-unica .title, .nota-unica .notas-content'));

            const miraTambien = $('<ul></ul>');
            outlinks.find('a').each(
              (i, elem) => {
                const $elem = $(elem);
                const link = $('<a></a>').text(
                  $elem.text().replace(/Mir[áa] (tambi[ée]n: )?/i, '')
                ).attr(
                  'href', $elem.attr('href')
                );
                miraTambien.append($('<li></li>').append(
                  link
                ));
              }
            );

            if (miraTambien.find('li').length) {
              content.append($('<h4>Mirá también</h4>'));
              content.append(miraTambien);
            }

            title = $('title').text();
          }

          const htmlContent = template.replace('{{body}}', content.html())
                                      .replace('{{title}}', title);
          res.write(htmlContent);
          res.end();
        });
      });
    } else {
      res.write('');
      res.end();
    }
  });
};

app.use('/static', express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  if (req.url.indexOf('.js') >= 0 || req.url.indexOf('.css') >= 0) {
    res.write('');
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
  console.log(`App listening on port ${PORT}`);
});
