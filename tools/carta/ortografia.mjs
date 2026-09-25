// Corrige la ortografía de la carta de Gourmedia del lado nuestro.
//
// La carta la escribe la cocina y no es nuestra para reescribirla. Por eso acá NO
// hay corrector general ni criterio de estilo: solo entran dos clases de arreglo,
// las dos comprobables contra el propio dataset.
//
//   A. El documento se contradice: la misma palabra aparece escrita bien en otra
//      parte de la misma carta. Corregir no impone nada, alinea con la propia fuente.
//   B. La palabra no existe: "Ptagonicos", "Centollla", "torrtilla", "toping". No hay
//      criterio en juego, está mal tipeada.
//
// Lo que se escribe consistentemente de una forma es decisión de la cocina y NO se
// toca, aunque a uno le pique: "Tiramisu" sin tilde, "Aburi" sin tilde, los nombres
// japoneses sin castellanizar. Si algo de eso hay que cambiar, se le pide a la cocina.
//
// Cada línea del grupo A lleva cuántas veces aparece de cada forma en la carta, que
// es la evidencia de por qué la corrección es esa y no otra.

// A) el documento se contradice consigo mismo
const CONTRADICE = [
  ['salmon',      'salmón',      'salmon 10 · salmón 6'],
  ['camaron',     'camarón',     'camaron 4 · camarón 2'],
  ['cebollin',    'cebollín',    'cebollin 8 · cebollín 1'],
  ['limon',       'limón',       'limon 3 · limón 6'],
  ['citrico',     'cítrico',     'citrico 2 · cítrico 1'],
  ['citrica',     'cítrica',     'citrica 2 · cítrica 1'],
  ['clasica',     'clásica',     'clasica 1 · clásica 2'],
  ['eleccion',    'elección',    'eleccion 1 · elección 3'],
  ['seleccion',   'selección',   'seleccion 1 · selección 1'],
  ['patagonicos', 'patagónicos', 'patagonicos 1 · patagónicos 1'],
  ['dia',         'día',         'dia 1 · día 1'],
  ['osono',       'Osorno',      'Osono 1 · Osorno 3 — la carne es de Osorno'],
  ['garces',      'Garcés',      'Garces 1 · Garcés 2 — la viña es Garcés Silva'],
  ['limari',      'Limarí',      'Limari 1 · Limarí 3 — el valle'],
  ['unagui',      'unagi',       'unagui 1 · Unagi 2 — anguila'],
  // al revés: acá la tilde es la que sobra
  ['aburí',       'aburi',       'aburi 7 · aburí 1 — es romanización japonesa, no lleva tilde'],
  ['terroír',     'terroir',     'terroir 1 · terroír 1 — es francés, no lleva tilde'],
  ['yogurth',     'yogurt',      'Yogurth 1 · yogurt 1'],
];

// B) no son palabras
const TIPEO = [
  ['ptagonicos', 'patagónicos', 'falta la "a"'],
  ['centollla',  'centolla',    'tres eles'],
  ['torrtilla',  'tortilla',    'tortilla 2 bien escrita en la misma carta'],
  ['toping',     'topping',     'topping 3 bien escrita en la misma carta'],
  ['aji',        'ají',         'sin tilde no existe; 4 veces, siempre "aji verde"'],
  ['atun',       'atún',        'sin tilde no existe'],
  ['acido',      'ácido',       'sin tilde no existe'],
  ['frio',       'frío',        'sin tilde no existe'],
  ['linea',      'línea',       'sin tilde no existe'],
  ['categoria',  'categoría',   'sin tilde no existe'],
  ['lactico',    'láctico',     'sin tilde no existe'],
  ['magnifica',  'magnífica',   'adjetivo: "una magnifica salsa ponzu"'],
  // títulos y bajadas de subsección, que también los escribe la cocina
  ['uzuzukuri',  'usuzukuri',   'el título dice Uzuzukuri y los platos de adentro Usuzukuri'],
  ['japones',    'japonés',     'japonés 6 veces bien escrito en las descripciones'],
  ['clasico',    'clásico',     'clásica 2 veces bien escrita'],
  ['proteina',   'proteína',    'proteína 1 vez bien escrita'],
  ['proteinas',  'proteínas',   'ídem, en plural'],
  ['carmenere',  'Carménère',   'Carménère 4 veces bien escrito en las descripciones'],
  ['cocteleria', 'coctelería',  'sin tilde no existe; el propio título dice COCTELERIA CLÁSICA'],
  ['cafeteria',  'cafetería',   'sin tilde no existe'],
];

export const REGLAS = [...CONTRADICE, ...TIPEO];

// C) arreglos que dependen del contexto: la palabra existe, pero ahí no va esa.
// Van como frase exacta justamente para no tocarla en ningún otro lugar.
export const FRASES = [
  ['hecha por capaz', 'hecha por capas', '"capaz" existe, pero la tortilla se hace por capas'],
  ['MIni cuenco',     'Mini cuenco',     'la i quedó en mayúscula'],
  ['Sweet Chily Oil', 'Sweet Chili Oil', 'chili'],
  ['lactofemento',    'lactofermento',   'le falta la "r"'],
];

// NO se tocan, y conviene preguntarle a la cocina qué quiso decir:
//   "ceste de naranja" / "ceste de limón" (2 veces) — ¿zeste, la cáscara rallada?
//   "env en arroz" (3 veces) — abreviatura de "envuelto", pero en otras fichas va entera.
//   "ROSE" (título de sección de vinos) — ¿rosé? La carta no lo escribe en ningún otro
//   lado, así que no hay con qué contrastarlo, y "rose" también es una palabra.
// Adivinar acá sería inventarle un plato a la cocina.

// Corrige un título de subsección. Va aparte porque los ítems apuntan a su
// subsección POR EL TEXTO: si se corrige el título y no el del ítem —o al revés—
// se corta el vínculo y la subsección aparece vacía o duplicada.
export const corregirSub = corregir;

// Respeta cómo venía escrita: salmon→salmón, Salmon→Salmón, SALMON→SALMÓN.
const comoVenia = (orig, corr) => {
  if (orig === orig.toUpperCase() && orig !== orig.toLowerCase()) return corr.toUpperCase();
  if (orig[0] === orig[0].toUpperCase()) return corr[0].toUpperCase() + corr.slice(1);
  return corr[0].toLowerCase() + corr.slice(1);
};

// Frontera de palabra propia: \b no sirve con acentos, y sin ella "limon" se comería
// el "limon" de "limoncello".
const LETRA = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const RE = REGLAS.map(([mal, bien]) =>
  [new RegExp(`(?<![${LETRA}])(${mal})(?![${LETRA}])`, 'gi'), bien]);

export function corregir(texto) {
  if (!texto) return texto;
  let t = texto;
  for (const [mal, bien] of FRASES) t = t.split(mal).join(bien);
  for (const [re, bien] of RE) t = t.replace(re, m => comoVenia(m, bien));
  // Coma pegada a la palabra siguiente: "camarón,salmón" → "camarón, salmón".
  // Solo entre letras, para no tocar los precios ("$10.900") ni "2022,2023".
  t = t.replace(new RegExp(`([${LETRA}]),(?=[${LETRA}])`, 'g'), '$1, ');
  // Y el espacio sobrante antes de la coma: "una proteína , gohan".
  t = t.replace(/\s+,/g, ',');
  return t.replace(/\s+/g, ' ').trim();
}
