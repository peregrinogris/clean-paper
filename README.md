# Clean Paper

Las noticias, pero sin los extras que consumen todos tus dátos móviles.

## Correr Local

    $ npm install
    $ npm start

Eso deja andando el servidor en `http://localhost:5050`

## Estructura

- `index.js`

Este es un mock que levanta la unica serverless function de `/api`, por si no se
quiere usar `vercel dev`.

- `/api/parse.js`:

Es una serverless function pensada para funcionar desde `vercel`, que se encarga
de procesar las páginas para luego ser servidas con sólo lo esencial.
