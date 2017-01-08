<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{title}}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Quattrocento">
    <style>
      figure {
        margin: 0;
      }
      img {
        max-width: 100%;
      }
      .content-new {
        text-align: left;
      }
      .title .breadcrumb {
        display: inline-block;
      }
      .title .breadcrumb > span:first-of-type {
        float: left;
      }
      .title .breadcrumb ul {
        float: left;
        margin: 0;
        padding-left: 15px;
      }
      .title .breadcrumb ul li {
          display: inline-block;
          line-height: 1.5em;
          font-weight: 300;
          font-size: 0.8em;
          padding: 5px 0;
      }
      .title .breadcrumb ul li::before {
          content: "\0399";
          padding: 0 10px;
      }
      article {
        padding-bottom: 10px;
        position: relative;
      }
      article::after {
        content: "";
        position: absolute;
        left: 25%;
        bottom: 0;
        height: 1px;
        width: 50%;
        margin: auto;
        border-bottom: 3px solid #ccc;
      }
      /*! HTML5 Boilerplate v5.0 | MIT License | http://h5bp.com/ */

      /* Color Swatch
      Maroon | #eaeaea | rgb(234, 234, 234);
      Pink   | #2f3c4f | rgb(47, 60, 79);
      Blue   | #b756a4 | rgb(183, 86, 164);
      Gray   | #6b1f0c | rgb(107, 31, 12);
      */

      html {
          color: #222;
          font-size: 1em;
          line-height: 1.4;
      }

      ::-moz-selection {
          background: rgba(183, 86, 164, 0.5);
          text-shadow: none;
      }

      ::selection {
          background: rgba(183, 86, 164, 0.5);
          text-shadow: none;
      }

      hr {
          display: block;
          height: 1px;
          border: 0;
          border-top: 1px solid #ccc;
          margin: 1em 0;
          padding: 0;
      }

      audio,
      canvas,
      iframe,
      img,
      svg,
      video {
          vertical-align: middle;
      }

      /* ==========================================================================
         Author's custom styles
         ========================================================================== */

      body {
        font-family: 'Quattrocento', arial, serif;
        background-color: #eaeaea;
        color: #000;
        font-size: 1.3em;
      }

      h1 {
        text-align: left;
        line-height: 1.2;
      }

      a, a:active, a:hover, a:visited {
        color: #6b1f0c;
        font-weight: 700;
        text-decoration: none;
        letter-spacing: -1px;
        display: inline-block;
      }

      a:hover, a:active, a:focus {
        background-color: rgba(183, 86, 164, 0.2);
        outline: none;
      }

      html, body {
        height: 100%;
      }

      .container {
        height: 100%;
        text-align: justify;
        padding: 10px;
        max-width: 800px;
        margin: auto;
      }

      /* ==========================================================================
         Media Queries
         ========================================================================== */
      @media only screen and (max-width: 460px),
                  screen and (max-height: 460px) {
        h1 {
          margin-top: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      {{body}}
    </div>
  </body>
</html>
