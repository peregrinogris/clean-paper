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
    .catch((e) => {
      res.setHeader(
        "Cache-Control",
        `max-age=0, s-maxage=${CACHE_DURATION_ERROR}`
      );

      console.log({
        type: "error",
        module: "fetching",
        location: url,
        error: e.message,
      });
      return Promise.reject();
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
  return Promise.all(onDemand).catch((e) => {
    console.log({ type: "error", module: "onDemand", error: e.message });

    return [];
  });
};

const parseHome = (res, withImages) => {
  res.setHeader("Cache-Control", `max-age=0, s-maxage=${CACHE_DURATION}`);

  return fetchContent(PAPER_URL, res)
    .then((body) => {
      if (!res.headersSent) {
        return Promise.resolve(body);
      }
      return Promise.reject();
    })
    .then((body) => {
      const $ = cheerio.load(body);

      return getOndemand($).then((values) => {
        values.forEach((onDemandContent) => {
          $("body").append(onDemandContent);
        });

        $("header").remove();
        $("footer").remove();
        $("script").remove();
        $(".on-demand").remove();
        $("article.visual").remove();

        // Eliminar clickbait CX Sense
        $("#containder_cxense").remove(); // Sí, hay un typo en el ID

        if (!withImages) {
          $("img").remove();
        } else {
          $(".img-responsive").each((idx, node) => {
            const elem = $(node);
            elem.attr("src", elem.data("small"));
          });
          $("img").removeAttr("alt");
        }

        // Cambiar los swiper slides a articles para En Foco
        $("#enFoco .swiper-slide").each((i, elem) => {
          const article = $("<article></article>").html($(elem).html());
          $(elem).after(article);
        });
        $(".swiper-slide").remove();

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
            $(elem).addClass("remove");
          }

          // Definición de clickbait
          if (title.text().indexOf("CLICK") !== -1) {
            $(elem).addClass("remove");
          }

          // Sacamos links a Elle
          if (url.indexOf("elle.") !== -1) {
            $(elem).addClass("remove");
          }
        });
        $(".remove").remove();

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
    })
    .catch((e) => {
      console.log({
        type: "error",
        module: "parsing",
        location: "/",
        error: e.message,
      });
      return Promise.reject();
    });
};

const parseArticle = (res, url, withImages) => {
  res.setHeader(
    "Cache-Control",
    `max-age=0, s-maxage=${CACHE_DURATION_ARTICLE}`
  );

  return fetchContent(`${PAPER_URL}/${url}`, res)
    .then((body) => {
      if (!res.headersSent) {
        return Promise.resolve(body);
      }
      return Promise.reject();
    })
    .then((body) => {
      const $ = cheerio.load(body);

      $("header").remove();
      $("footer").remove();
      $(".latest-news").remove();
      $(".most-viewed").remove();

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

      // Parsear mvHero
      const mvHero = $("#mnhead");
      if (mvHero) {
        try {
          const script = mvHero.find("script").html();
          const title = script
            .replace(/\n/g, "")
            .match(/title: +["']([^"']+)["'],/)[1];
          const divTitle = $("<div></div>")
            .addClass("title")
            .append($(`<h1>${title}</h1>`))
            .append($(".bajada"));
          $(".nota-unica").prepend(divTitle);
        } catch (e) {
          // Ignore error
        }
      }

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

      $("p a").each((i, elem) => {
        const url = $(elem).attr("href");
        if (url.indexOf("/tema/") !== -1) {
          // Esto es más clickbait basicamente
          $(elem).replaceWith($(elem).text());
        } else {
          // Si no es clickbait, hacer los links relativos
          $(elem).attr("href", url.replace(/http(s)?:\/\/.+\//i, "/"));
        }
      });

      // Reemplazar los mark por strong
      $("mark").each((i, elem) => {
        $(elem).replaceWith(`<strong>${$(elem).text()}</strong>`);
      });

      content.append($(".nota-unica .title, .nota-unica .notas-content"));
      const miraTambien = $("<ul></ul>");
      outlinks.find("a").each((i, elem) => {
        const $elem = $(elem);
        const url = $elem.attr("href").replace(/http(s)?:\/\/.+\//i, "/");
        if ($elem.text().trim().length > 1 && url.indexOf("/tema/") === -1) {
          const link = $("<a></a>")
            .text($elem.text().replace(/Mir[áa] (tambi[ée]n: )?/i, ""))
            .attr("href", url);
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
        .find(".pull-right, .entry-head, .body-nota > div, #comments, script")
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
    })
    .catch((e) => {
      console.log({
        type: "error",
        module: "parsing",
        location: url,
        error: e ? e.message : "",
      });
      return Promise.reject();
    });
};

module.exports = (req, res) => {
  let timeout = -1;
  new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      console.log({
        type: "error",
        module: "main",
        location: url,
        error: "Timeout.",
      });
      reject();
    }, 9500);

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
      resolve();
    } else {
      let images = false;

      if (url.indexOf("img") === 0) {
        // Con imágenes
        url = url.replace(/img\/?/, "");
        images = true;
      }

      if (url.length > 1) {
        // Es un artículo
        parseArticle(res, url, images).then(resolve).catch(reject);
      } else {
        // Es la home
        parseHome(res, images).then(resolve).catch(reject);
      }
    }
  })
    .then(() => {
      clearTimeout(timeout);
    })
    .catch(() => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.removeHeader("Cache-Control");
        const timeClarin = moment().utcOffset(-180);

        let date = `${timeClarin.format("dddd DD MMMM")} de `;
        date += `${timeClarin.format("YYYY")}`;
        date = `${date[0].toUpperCase()}${date.substr(1)}`;
        const time = timeClarin.format("HH:mm");

        const htmlContent = template
          .replace("{{body}}", "<p>Ha ocurrido un error.</p>")
          .replace("{{title}}", "Error")
          .replace("{{date}}", date)
          .replace("{{time}}", time);

        res.send(htmlContent);
      }
    });
};
