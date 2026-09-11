// Panel de sala v0 — API protegida con clave (env TENGU_PANEL_PASS).
// GET ?fecha=YYYY-MM-DD → reservas del día · POST {codigo, estado} → actualizar.
// La clave nunca viaja en el HTML: el panel la pide una vez y la manda en header.
const SB = process.env.TENGU_SB_URL && process.env.TENGU_SB_KEY && process.env.TENGU_SB_SECRET
  ? { url: process.env.TENGU_SB_URL, key: process.env.TENGU_SB_KEY, secret: process.env.TENGU_SB_SECRET }
  : null;
const PASS = process.env.TENGU_PANEL_PASS;

async function rpc(fn, args) {
  const r = await fetch(`${SB.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB.key, Authorization: `Bearer ${SB.key}` },
    body: JSON.stringify({ p_secret: SB.secret, ...args }),
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status}`);
  return r.json();
}

function hoyChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!SB || !PASS) return res.status(503).json({ error: 'Panel no configurado.' });

  const auth = req.headers.authorization || '';
  const hayCredencial = auth.startsWith('Basic ');
  const ok = hayCredencial &&
    Buffer.from(auth.slice(6), 'base64').toString() === `tengu:${PASS}`;
  if (!ok) {
    // Sin header Authorization no hay nada que adivinar: es el navegador antes
    // de que le pidamos la clave, un escaner, o el preview de un link. Antes
    // eso tambien contaba como intento fallido, y como /panel.html es publico
    // y descubrible, el ruido de internet podia gastar la cuota del dia y
    // dejar sin panel al restaurante. Solo cuenta una credencial EQUIVOCADA.
    if (hayCredencial) try {
      const tr = await fetch(`${SB.url}/rest/v1/rpc/tengu_tick_panel_fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB.key, Authorization: `Bearer ${SB.key}` },
        body: JSON.stringify({ p_secret: SB.secret }),
      });
      const tj = await tr.json();
      if (tj && tj.permitido === false) return res.status(429).json({ error: 'Panel bloqueado por hoy (demasiados intentos fallidos).' });
    } catch (e) {}
    await new Promise((r2) => setTimeout(r2, 900));
    // SIN WWW-Authenticate. Esa cabecera es una invitación formal al navegador
    // para que tome el control de la autenticación y muestre SU diálogo de
    // usuario+contraseña. Acá no hace falta —panel.html manda la credencial él
    // mismo desde JavaScript— y hacía que los dos diálogos pelearan: el nativo
    // pedía dos campos, el del panel uno, y la página quedaba inusable.
    return res.status(401).json({ error: 'Clave incorrecta.' });
  }

  try {
    if (req.method === 'GET') {
      if (req.query && req.query.vista === 'eventos') {
        const eventos = await rpc('tengu_eventos_admin', {});
        return res.status(200).json({ eventos });
      }
      const fecha = (req.query && req.query.fecha) || hoyChile();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: 'fecha inválida' });
      const reservas = await rpc('tengu_listar_dia', { p_fecha: fecha });
      return res.status(200).json({ fecha, reservas });
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.evento && b.estado) {
        const r = await rpc('tengu_evento_estado', { p_slug: String(b.evento), p_estado: String(b.estado) });
        return res.status(200).json(r);
      }
      if (b.accion === 'guardar_evento') {
        const r = await rpc('tengu_evento_guardar', {
          p_slug: String(b.slug || ''), p_nombre: String(b.nombre || ''),
          p_subtitulo: b.subtitulo || null, p_descripcion: b.descripcion || null,
          p_fecha: String(b.fecha || ''), p_hora: String(b.hora || ''),
        });
        return res.status(200).json(r);
      }
      if (b.accion === 'guardar_zona') {
        const r = await rpc('tengu_zona_guardar', {
          p_zona: String(b.zona || ''), p_nombre: String(b.nombre || ''),
          p_descripcion: b.descripcion || null,
          p_precio: parseInt(b.precio, 10), p_cupos: parseInt(b.cupos, 10),
        });
        return res.status(200).json(r);
      }
      if (b.accion === 'crear_evento') {
        const r = await rpc('tengu_evento_crear', {
          p_slug: String(b.slug || ''), p_nombre: String(b.nombre || ''),
          p_fecha: String(b.fecha || ''), p_hora: String(b.hora || ''),
        });
        return res.status(200).json(r);
      }
      if (b.ticket && b.estado) {
        const r = await rpc('tengu_ticket_estado_set', { p_codigo: String(b.ticket), p_estado: String(b.estado) });
        return res.status(200).json(r);
      }
      const { codigo, estado } = b;
      if (!codigo || !estado) return res.status(400).json({ error: 'faltan codigo y estado' });
      const r = await rpc('tengu_actualizar_estado', { p_codigo: String(codigo), p_estado: String(estado) });
      return res.status(200).json(r);
    }
    return res.status(405).json({ error: 'GET o POST' });
  } catch (e) {
    // 502 y no 200: un 200 con {error} adentro hace que el panel, cualquier
    // monitor y cualquier agente lean una caida como si fuera una respuesta
    // buena. El texto sigue sin filtrar detalles del backend.
    return res.status(502).json({ error: 'No pudimos consultar el sistema. Intenta de nuevo.' });
  }
};
