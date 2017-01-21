<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{title}}</title>
    <link href="https://fonts.googleapis.com/css?family=Libre+Baskerville:400,400i|Lora:700" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="icon" href="/static/favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="/static/favicon.png">
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
