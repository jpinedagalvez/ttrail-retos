# Validación en navegador

Requiere Node.js, Python 3 y Chromium en `/usr/bin/chromium`.
No hay dependencias de producción que instalar.

Desde la raíz del repositorio, iniciar el servidor:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

En otra terminal:

```sh
npm install --prefix /tmp/ttrail-browser-check --cache /tmp/ttrail-npm-cache --no-package-lock --no-audit --no-fund playwright-core
curl --fail --silent --show-error https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js -o /tmp/ttrail-xlsx.full.min.js
NODE_PATH=/tmp/ttrail-browser-check/node_modules node tests/browser.cjs
```

El navegador usa un contexto nuevo, sin alterar los datos del usuario. Comprueba
los 13 resultados de agosto y los 8 provisionales de octubre, clasificaciones
por sexo, septiembre sin resultados, perfiles, liga, navegación, migración
repetible de localStorage conservando altas y marcas locales, administración,
importación y descarga CSV, anchuras móvil/escritorio y errores JavaScript.

La copia de SheetJS descargada con TLS verificado se sirve al navegador mediante
interceptación de esa URL: permite comprobar la importación incluso cuando
Chromium no tiene instalada la CA del proxy del entorno. Esta prueba no valida
la conexión directa del navegador al CDN. La web sigue utilizando el CDN original.

Identidades confirmadas: «Diana» es Diana Freire y «Diana A.S.» es Diana Alonso.
Conservan sus alias de origen y perfiles separados.
