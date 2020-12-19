const cheerio = require("cheerio");
const express = require("express");
const favicon = require("serve-favicon");
const fs = require("fs");
const http = require("http");
const mcache = require("memory-cache");
const moment = require("moment");
const path = require("path");
const axios = require("axios");

const app = express();

const MINUTE = 60; // Seconds
const CACHE_DURATION = 10 * MINUTE;
const CACHE_DURATION_ARTICLE = 30 * MINUTE;
const CACHE_DURATION_ERROR = 60 * MINUTE;

const PAPER_URL = "https://www.clarin.com";

moment.locale("es");

let template = "";
fs.readFile(path.resolve(__dirname, "template.tpl"), "utf8", (err, data) => {
  if (err) throw err; // we'll not consider error handling for now
  template = data;
});

const fetchWithCache = (url, cacheID, res) =>
  axios(url)
    .then(({ data, headers }) => {
      if (headers["content-type"].indexOf("text/html") !== 0) {
        throw Error();
      }
      return data;
    })
    .catch(() => {
      mcache.put(cacheID, "", CACHE_DURATION_ERROR * 1000);
      res.write("");
      res.end();
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
  const cacheID = `/${withImages ? "img/" : ""}`;

  fetchWithCache(PAPER_URL, cacheID, res).then((body) => {
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

      mcache.put(cacheID, htmlContent, CACHE_DURATION * 1000);

      res.write(htmlContent);
      res.end();
    });
  });
};

const parseArticle = (res, url, withImages) => {
  fetchWithCache(`${PAPER_URL}${url}`, url, res).then((body) => {
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
    $(".breadcrumb li:first-of-type a").attr("href", "/");
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
      const link = $("<a></a>")
        .text($elem.text().replace(/Mir[áa] (tambi[ée]n: )?/i, ""))
        .attr("href", $elem.attr("href"));
      miraTambien.append($("<li></li>").append(link));
    });

    if (miraTambien.find("li").length) {
      content.append($("<h4>Mirá también</h4>"));
      content.append(miraTambien);
    }

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

    mcache.put(url, htmlContent, CACHE_DURATION_ARTICLE * 1000);

    res.write(htmlContent);
    res.end();
  });
};

app.use("/static", express.static(path.join(__dirname, "/../public")));
app.use(favicon(path.join(__dirname, "/../public", "favicon.ico")));

// No pedir los JS ni CSS externos
app.use((req, res, next) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  if (req.url.indexOf(".js") >= 0 || req.url.indexOf(".css") >= 0) {
    res.write("");
    res.end();
  } else {
    next();
  }
});

// Primero tratar de usar el cache
// app.use((req, res, next) => {
//   const body = mcache.get(req.url);
//   if (body) {
//     res.write(body);
//     res.end();
//   } else {
//     next();
//   }
// });

app.get("/", (req, res) => {
  parseHome(res, false);
});

app.get("/img", (req, res) => {
  parseHome(res, true);
});

app.get("/img*", (req, res) => {
  parseArticle(res, req.url.substring(4), true);
});

app.get("/*", (req, res) => {
  parseArticle(res, req.url, false);
});

const PORT = 5050;
http.createServer(app).listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
