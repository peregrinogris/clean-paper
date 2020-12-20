const cheerio = require("cheerio");
const moment = require("moment/min/moment-with-locales");
const axios = require("axios");

const PAPER_URL = "https://www.clarin.com";

const MINUTE = 60; // Seconds
const CACHE_DURATION = 10 * MINUTE;
const CACHE_DURATION_ARTICLE = 30 * MINUTE;
const CACHE_DURATION_ERROR = 60 * MINUTE;

moment.locale("es");

let template = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{title}}</title>
    <link href="https://fonts.googleapis.com/css?family=Libre+Baskerville:400,400i,700|Lora:700" rel="stylesheet">
    <link rel="stylesheet" href="/css/main.css">
    <link rel="icon" href="/favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="/favicon.png">
    <link rel="shortcut" href="/favicon.ico" type="image/x-icon">
  </head>
  <body>
    <header>
      <h1><a href="/">Clean Paper</a></h1>
      <p>{{date}} · {{time}} hs</p>
    </header>
    <div class="container">
      {{body}}
    </div>
  </body>
</html>
`;

const fetchContent = (url, res) =>
  axios(url)
    .then(({ data, headers }) => {
      // Solo parsear html
      if (headers["content-type"].indexOf("text/html") !== 0) {
        throw Error();
      }

      return data;
    })
    .catch(() => {
      res.setHeader(
        "Cache-Control",
        `max-age=0, s-maxage=${CACHE_DURATION_ERROR}`
      );
      res.send("");
    });

const getOndemand = ($) => {
  const onDemand = [];
  $(".on-demand").each((i, e) => {
    onDemand.push(
      axios(`${PAPER_URL}${$(e).data("src")}`).then(
        // Eliminar los parentesis del "JSON"
        ({ data }) => JSON.parse(data.slice(1, -1)).data
      )
    );
  });
  return Promise.all(onDemand);
};

const parseHome = (res, withImages) => {
  res.setHeader("Cache-Control", `max-age=0, s-maxage=${CACHE_DURATION}`);

  fetchContent(PAPER_URL, res).then((body) => {
    const $ = cheerio.load(body);

    getOndemand($).then((values) => {
      values.forEach((onDemandContent) => {
        $("body").append(onDemandContent);
      });

      $("header").remove();
      $("footer").remove();
      $("script").remove();
      $(".on-demand").remove();
      $(".carcasaSkin").remove();

      if (!withImages) {
        $("img").remove();
      } else {
        $(".img-responsive").each((idx, node) => {
          const elem = $(node);
          elem.attr("src", elem.data("small"));
        });
        $("img").removeAttr("alt");
      }

      // Limpio el markup de los artículos
      $("article").each((i, elem) => {
        let volanta = $(elem).find("p.volanta").first().remove();
        const title = $(elem).find("h1,h2,h3").remove();
        const url = $(elem).find("a").first().attr("href");
        const link = $("<a>").append(title).attr("href", url);

        const image = $(elem)
          .find(withImages ? "figure" : "")
          .remove();

        const text = $(elem).find("p.summary").remove();

        // El orden siempre va a ser titulo - imagen - bajada
        $(elem).empty().append(volanta, link, image, text);
        $(elem).removeAttr("style");
        $(elem).removeAttr("class");

        // Los articulos de BrandStudio son contenido patrocinado
        if (url.indexOf("brandstudio") !== -1) {
          $(elem).addClass("ads");
        }
      });
      $(".ads").remove();

      const content = $("<div>");
      content.append($("article"));

      const timeClarin = moment().utcOffset(-180);
      let date = `${timeClarin.format("dddd DD MMMM")} de `;
      date += `${timeClarin.format("YYYY")}`;
      date = `${date[0].toUpperCase()}${date.substr(1)}`;
      const time = timeClarin.format("HH:mm");

      const htmlContent = template
        .replace("{{body}}", content.html())
        .replace("{{title}}", "Clarin Limpio")
        .replace("{{date}}", date)
        .replace("{{time}}", time);

      res.send(htmlContent);
    });
  });
};

const parseArticle = (res, url, withImages) => {
  res.setHeader(
    "Cache-Control",
    `max-age=0, s-maxage=${CACHE_DURATION_ARTICLE}`
  );

  fetchContent(`${PAPER_URL}/${url}`, res).then((body) => {
    const $ = cheerio.load(body);

    $("header").remove();
    $("footer").remove();
    $("script").remove();

    if (!withImages) {
      // Las imágenes suelen venir adentro de un link en los articulos
      $("article > a").has("img").remove();
      $("img").remove();
      $("#galeria-trigger, .image-trigger").remove();
      // Eliminar todos los embeds que no sean tweets
      $("[class^=embed-]").each((i, elem) => {
        if (!$(elem).find(".twitter-tweet").length) {
          $(elem).remove();
        }
      });
    } else {
      $(".img-responsive").each((idx, node) => {
        const elem = $(node);
        elem.attr("src", elem.data("small"));
      });

      $("article").each((i, elem) => {
        if ($(elem).find("img").length > 0) {
          $(elem).prepend($(elem).find(".txt").first().remove());
        }
      });
    }

    const content = $("<div>");

    $("[id^=bannerId_]").remove();
    $("[id^=sas_]").remove();
    $('[itemprop="video"]').remove();

    // Outlinks
    const outlinks = $('<div class="outlinks"></div>');
    outlinks.append($(".box-content-new, .content-new").remove());
    outlinks.find("span").remove();

    // Heurísticas:
    // A veces los outlinks estan en medio del texto y tienen la pinta
    // de "Mirá también: <noticia>"
    $("a").each((i, elem) => {
      if ($(elem).text().toLowerCase().indexOf("mir") === 0) {
        outlinks.append($(elem).remove());
      }
    });

    // Otras veces hay párrafos enteros que sólo son clickbait+link
    const clickbaits = ["leé", "lee", "te puede interesar", "te puede"];
    $("p").each((i, elem) => {
      const p = $(elem);
      if (p.find("a").length === 1) {
        const link = p.find("a").text();
        const clickbait = p.text().replace(link, "").trim().toLowerCase();
        if (clickbaits.indexOf(clickbait) > -1) {
          outlinks.append(p.find("a").remove());
          p.remove();
        }
      }
    });

    content.append($(".nota-unica .title, .nota-unica .notas-content"));
    const miraTambien = $("<ul></ul>");
    outlinks.find("a").each((i, elem) => {
      const $elem = $(elem);
      if ($elem.text().trim().length > 1) {
        const link = $("<a></a>")
          .text($elem.text().replace(/Mir[áa] (tambi[ée]n: )?/i, ""))
          .attr("href", $elem.attr("href"));
        miraTambien.append($("<li></li>").append(link));
      }
    });

    if (miraTambien.find("li").length) {
      content.append($("<h4>Mirá también</h4>"));
      content.append(miraTambien);
    }

    const publishedDate = content
      .find(".breadcrumb .publishedDate")
      .text()
      .trim();
    const modifiedDate = content
      .find(".breadcrumb .modificatedDate")
      .text()
      .trim();

    content
      .find(".bajada")
      .append($(`<p>${publishedDate} - ${modifiedDate}</p>`));

    // Eliminar cosas de más
    content
      .find(".pull-right, .entry-head, .body-nota > div, #comments")
      .remove();

    title = $("title").text();

    const timeClarin = moment().utcOffset(-180);

    let date = `${timeClarin.format("dddd DD MMMM")} de `;
    date += `${timeClarin.format("YYYY")}`;
    date = `${date[0].toUpperCase()}${date.substr(1)}`;
    const time = timeClarin.format("HH:mm");

    const htmlContent = template
      .replace("{{body}}", content.html())
      .replace("{{title}}", title)
      .replace("{{date}}", date)
      .replace("{{time}}", time);

    res.send(htmlContent);
  });
};

module.exports = (req, res) => {
  let url = req.query.url || "/";

  res.setHeader("Cache-Control", `max-age=0, s-maxage=${CACHE_DURATION}`);
  res.status(200);

  if (url.indexOf(".js") >= 0 || url.indexOf(".css") >= 0) {
    // No pedir los JS ni CSS externos
    res.setHeader(
      "Cache-Control",
      `max-age=0, s-maxage=${CACHE_DURATION_ERROR}`
    );
    res.send("");
  } else {
    let images = false;

    if (url.indexOf("img") === 0) {
      // Con imágenes
      url = url.replace(/img\/?/, "");
      images = true;
    }

    if (url.length > 1) {
      // Es un artículo
      parseArticle(res, url, images);
    } else {
      // Es la home
      parseHome(res, images);
    }
  }
};
