// Motor de reservas SANDBOX de Tengu — determinístico y sin persistencia.
// Comparte lógica entre el prototipo Reserve with Google (/api/rwg) y el MCP
// de reservas (/api/reservas-mcp). NO crea reservas reales: es la maqueta del
// futuro motor de Tengu OS.
const HORARIOS = {
  // 0=dom … 6=sáb
  0: [['13:00', '13:30', '14:00', '14:30', '15:00']],
  2: [['13:00', '13:30', '14:00'], ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']],
  3: [['13:00', '13:30', '14:00'], ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']],
  4: [['13:00', '13:30', '14:00'], ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']],
  5: [['13:00', '13:30', '14:00'], ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']],
  6: [['13:00', '13:30', '14:00'], ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']],
};

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function slotsDelDia(fecha) {
  const d = new Date(fecha + 'T12:00:00-04:00');
  if (isNaN(d)) return null;
  const turnos = HORARIOS[d.getUTCDay()];
  return turnos ? turnos.flat() : [];
}

// Disponibilidad determinística: 0-8 mesas libres según fecha+hora.
function mesasLibres(fecha, hora) {
  return hash(fecha + hora) % 9;
}

function disponibilidad(fecha, personas) {
  const slots = slotsDelDia(fecha);
  if (slots === null) return { error: 'Fecha inválida (usar YYYY-MM-DD).' };
  if (!slots.length) return { fecha, abierto: false, nota: 'Lunes cerrado.', slots: [] };
  const p = parseInt(personas || 2, 10);
  if (p < 1 || p > 12) return { error: 'Entre 1 y 12 personas (grupos mayores: por WhatsApp).' };
  return {
    fecha, abierto: true, personas: p,
    slots: slots.map((h) => ({ hora: h, disponible: mesasLibres(fecha, h) > (p > 6 ? 2 : 0) })),
  };
}

function crearReserva({ nombre, telefono, fecha, hora, personas, notas }) {
  if (!nombre || !fecha || !hora || !personas)
    return { error: 'Faltan campos: nombre, fecha (YYYY-MM-DD), hora (HH:MM), personas.' };
  const disp = disponibilidad(fecha, personas);
  if (disp.error) return disp;
  const slot = (disp.slots || []).find((s) => s.hora === hora);
  if (!slot) return { error: `Hora fuera de horario. Slots del día: ${(disp.slots || []).map((s) => s.hora).join(', ') || 'cerrado'}.` };
  if (!slot.disponible) return { error: `Sin mesa a las ${hora} (sandbox). Alternativas: ${disp.slots.filter((s) => s.disponible).map((s) => s.hora).join(', ')}.` };
  const codigo = 'SANDBOX-' + hash([nombre, fecha, hora, personas].join('|')).toString(36).toUpperCase();
  return {
    codigo, estado: 'confirmada (SANDBOX — no es una reserva real)',
    nombre, telefono: telefono || null, fecha, hora, personas: parseInt(personas, 10), notas: notas || null,
    aviso: 'Entorno de demostración: esta reserva NO existe en el restaurante. Para reservar de verdad: https://tengu-deploy.vercel.app/#reserve',
  };
}

function estadoReserva(codigo) {
  if (!/^SANDBOX-[0-9A-Z]+$/.test(codigo || '')) return { error: 'Código inválido. Formato: SANDBOX-XXXXXX.' };
  return { codigo, estado: 'confirmada (SANDBOX — no es una reserva real)', aviso: 'Entorno de demostración.' };
}

module.exports = { disponibilidad, crearReserva, estadoReserva, slotsDelDia };
