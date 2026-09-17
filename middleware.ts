// Candado de la versión privada de tengu.cl.
//
// QUÉ HACE. Sin cookie válida, cualquier ruta devuelve la portada de
// "próximamente". Con ?pase=<secreto> se deja la cookie y se navega el sitio
// completo, en el mismo dominio.
//
// POR QUÉ ESTO Y NO DEPLOYMENT PROTECTION DE VERCEL. Esa opción es de proyecto
// entero: prenderla haría que tengu.cl mostrara el muro de login de Vercel en
// vez de la portada. Se cambia una protección más fuerte —la aplica el borde
// antes de que corra una línea nuestra— por una portada con la marca. Para
// "todavía no lanzamos" alcanza; para "esto no lo puede ver nadie", no.
//
// POR QUÉ .ts Y NO middleware.js. La convención de archivo obliga, en
// proyectos sin framework, a poner "type":"module" en package.json — y eso
// rompería las diez funciones api/*.js, que son CommonJS. Por eso el
// entrypoint se declara en vercel.json apuntando acá.
//   El primer intento fue .mjs y el build falló: el esquema de vercel.json
//   sólo acepta entrypoints .js, .ts o .py. .ts resuelve las dos cosas —
//   lo acepta el esquema y es ESM sin ambigüedad. Adentro es JavaScript
//   liso, sin una sola anotación de tipo.
//
// Se enciende con la env TENGU_PASE. Sin esa variable el candado no existe y
// el sitio se sirve normal: un candado que se activa solo, a medio configurar,
// deja el sitio caído sin que nadie entienda por qué.

const PASE = process.env.TENGU_PASE;
const COOKIE = 'tengu_pase';
const TREINTA_DIAS = 60 * 60 * 24 * 30;

// Rutas que pasan aunque no haya cookie: el ícono para que la portada se vea
// entera, robots.txt para no devolverle HTML a un crawler, y el redirector de
// WhatsApp para que quien caiga en la portada pueda escribirle al restaurante.
const LIBRES = new Set([
  '/favicon.svg', '/favicon-64.png', '/apple-touch-icon.png', '/api/wa',
  '/tengu-marca.png',
]);

async function sha256(txt) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// La cookie guarda el HASH del secreto, no el secreto. No se puede falsificar
// sin conocerlo, y si alguien lee la cookie no se lleva la llave.
let huellaCache = null;
async function huella() {
  if (!huellaCache) huellaCache = await sha256(PASE);
  return huellaCache;
}

function cookie(request, nombre) {
  const crudo = request.headers.get('cookie');
  if (!crudo) return null;
  for (const parte of crudo.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}

// La portada se arma por petición para poder poner la canónica apuntando a la
// raíz del host que se pidió. Sin eso, como CUALQUIER ruta devuelve esta misma
// página con 200, Google puede indexar tengu.cl/carta, tengu.cl/lo-que-sea y
// cien más como páginas distintas de contenido idéntico — justo mientras le
// estamos construyendo historia al dominio.
const portada = (origen) => `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tengu — Próximamente</title>
<meta name="description" content="Tengu, cocina japonesa kappo en Isidora Goyenechea 3000, Santiago de Chile. Muy pronto.">
<link rel="canonical" href="${origen}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060503;color:#e8e0d0;font-family:'Cormorant Garamond',Georgia,serif;
       min-height:100vh;display:flex;align-items:center;justify-content:center;
       text-align:center;padding:32px;overflow:hidden}
  .marca{width:min(46vw,300px);height:auto;display:block;margin:0 auto;
         opacity:0;animation:entra 2.4s ease forwards}
  .nombre{font-size:clamp(28px,7vw,44px);font-weight:300;letter-spacing:.32em;
          margin:26px 0 0 .32em;opacity:0;animation:entra 2.4s .5s ease forwards}
  .pronto{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.42em;
          text-transform:uppercase;color:#c8921a;margin-top:34px;
          opacity:0;animation:entra 2.4s 1.1s ease forwards}
  .donde{font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.2em;
         color:#7a7266;margin-top:14px;opacity:0;animation:entra 2.4s 1.5s ease forwards}
  .links{margin-top:40px;display:flex;gap:26px;justify-content:center;
         opacity:0;animation:entra 2.4s 1.9s ease forwards}
  .links a{font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.24em;
           text-transform:uppercase;color:#b8ae9e;text-decoration:none;
           border-bottom:1px solid rgba(200,146,26,.3);padding-bottom:5px;transition:.3s}
  .links a:hover{color:#c8921a;border-color:#c8921a}
  @keyframes entra{to{opacity:1}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important}}
</style></head>
<body><main>
  <img class="marca" src="/tengu-marca.png" alt="Tengu" width="600" height="594">
  <h1 class="nombre">TENGU</h1>
  <p class="pronto">Próximamente</p>
  <p class="donde">Isidora Goyenechea 3000 · Santiago</p>
  <div class="links">
    <a href="/api/wa">WhatsApp</a>
    <a href="https://www.instagram.com/tengu_restaurant/" rel="noopener">Instagram</a>
  </div>
</main></body></html>`;

const ROBOTS_CERRADO = `# Tengu — el sitio todavía no abre.
User-agent: *
Allow: /$
Disallow: /
`;

export default async function middleware(request) {
  if (!PASE) return; // candado apagado: el sitio se sirve normal

  const url = new URL(request.url);

  // 1) Entrada por link. Se valida contra el hash y se redirige limpio, para
  //    que el secreto no quede en la barra del navegador ni en el historial.
  const dado = url.searchParams.get('pase');
  if (dado) {
    const ok = (await sha256(dado)) === (await huella());
    if (ok) {
      url.searchParams.delete('pase');
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.pathname + (url.searchParams.size ? '?' + url.searchParams : '') + url.hash,
          'Set-Cookie': `${COOKIE}=${await huella()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TREINTA_DIAS}`,
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  // 2) Ya entró antes.
  if (cookie(request, COOKIE) === (await huella())) return;

  // 3) Excepciones que no revelan nada.
  if (LIBRES.has(url.pathname)) return;
  if (url.pathname === '/robots.txt') {
    return new Response(ROBOTS_CERRADO, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // 4) Todo lo demás ve la portada. Status 200 y no 404: no es un error, es
  //    que el sitio todavía no abre.
  return new Response(portada(url.origin + '/'), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
