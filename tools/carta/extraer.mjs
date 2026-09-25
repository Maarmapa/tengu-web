import fs from 'node:fs';
const D = process.argv[2]; const REPO = new URL('../../',import.meta.url).pathname;
const SECS = ['comida','bar','sake','vinos','por-copa','teishoku'];
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const toks = s => new Set(norm(s).split(' ').filter(t=>t.length>2 && !['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas'].includes(t)));
const sim = (a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};

// ---- nuestra carta anterior, solo para recuperar los nombres en japonés ----
// Sale de prev-final.json (la copia que sync.sh guarda antes de correr). Antes se
// reconstruía leyendo el JSON-LD de index.html con una tabla de prefijos que ya no
// calza con lo que escribe index-carta.mjs, así que 'ours' quedaba casi vacío y el
// japonés se perdía en silencio. El diff vive en diff.mjs; acá solo se extrae.
const html = fs.readFileSync(REPO+'index.html','utf8');
const jp = {}; for (const m of html.matchAll(/menu-item-name">([^<]+)<\/div><div class="menu-item-jp">([^<]*)</g)) jp[norm(m[1])] = m[2];
let ours;
try { const prev = JSON.parse(fs.readFileSync(`${D}/prev-final.json`,'utf8'));
      ours = Object.fromEntries(SECS.map(s=>[s,(prev[s]&&prev[s].items)||[]]));
} catch(e) { ours = Object.fromEntries(SECS.map(s=>[s,[]])); }

// ---- extracción viva ----
function limpiar(h){const j=h.lastIndexOf('</nav>');let b=h.slice(j>0?j:0);const d=b.indexOf('id="drawer"');if(d>0)b=b.slice(0,d);
  return b.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,'\n')
   .replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,9});/g,entidad)
   .split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);}
// Decodificación genérica en vez de tres replace sueltos (&amp;, &#8217;, &nbsp;). Con
// los tres, "Villard &#8211; Arganat" llegaba así a la carta publicada, al JSON-LD que
// lee Google y al Oráculo. El guion medio no es un caso raro: Gourmedia lo usa para
// separar productor y etiqueta, así que iba a volver a pasar con cada vino nuevo.
const NOMBRADAS={amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—',hellip:'…',
  rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',deg:'°',eacute:'é',aacute:'á',iacute:'í',oacute:'ó',
  uacute:'ú',ntilde:'ñ',Ntilde:'Ñ',uuml:'ü',middot:'·',bull:'·',laquo:'«',raquo:'»',shy:''};
function entidad(m,cuerpo){
  if(cuerpo[0]==='#'){ const n=cuerpo[1]==='x'||cuerpo[1]==='X' ? parseInt(cuerpo.slice(2),16) : parseInt(cuerpo.slice(1),10);
    return Number.isFinite(n)&&n>0&&n<=0x10FFFF ? String.fromCodePoint(n) : m; }
  return cuerpo in NOMBRADAS ? NOMBRADAS[cuerpo] : m;   // desconocida: se deja cruda, se ve y se reporta
}
const esPrecio = l => /^[0-9]{1,3}(\.[0-9]{3})+$|^[0-9]{3,6}$/.test(l);
const SIN_PRECIO = /^(acompañar con:?|ver variedad|revisar variedad)/i;
const nameLike = l => { const let_=l.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,''); if(!let_.length) return false;
  const up=(let_.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).length/let_.length; return up>=0.6 || l.split(' ').length<=5; };
const sentenceLike = l => l.split(' ').length>=4 && !nameLike(l);

const live = {};
for (const sec of SECS) {
  let L = limpiar(fs.readFileSync(`${D}/raw-${sec}.html`,'utf8'));
  const iJA=L.indexOf('JA'), iArrow=L.findIndex((l,i)=>i>iJA&&l==='-->');
  const subs=L.slice(iJA+1,iArrow>0?iArrow:iJA+1), subSet=new Set(subs.map(norm));
  const start=L.lastIndexOf('Tus favoritos')+1;
  // cortar navegación final POR POSICIÓN: último "Home" después del último precio
  let lastPrice=-1; for(let i=L.length-1;i>=start;i--){ if(esPrecio(L[i])&&L[i-1]==='$'){lastPrice=i;break;} }
  let end=L.length; for(let i=lastPrice+1;i<L.length;i++){ if(L[i]==='Home'){end=i;break;} }
  L = L.slice(0,end);
  const items=[]; let sub=subs[0]||'', subDesc={}, bloque=[], justHeader=false;
  const cerrar=(precio,extra)=>{ if(!bloque.length)return; const [nombre,...desc]=bloque;
    items.push({sub,nombre,desc:desc.join(' '),precio,extra}); bloque=[]; };
  for (let i=start;i<L.length;i++){ const l=L[i];
    if (l==='-->'||/^\+\d+$/.test(l)) continue;
    if (subSet.has(norm(l)) && !bloque.length) { sub=l; justHeader=true; continue; }
    if (justHeader) { justHeader=false; if (sentenceLike(l) && nameLike(L[i+1]||'')) { subDesc[sub]=l; continue; } }
    if (SIN_PRECIO.test(l)) { bloque.push(l); cerrar(null,null); continue; }
    if (l==='$'){ const p=L[i+1]; if(!esPrecio(p)) continue; const precio=parseInt(p.replace(/\./g,''),10); i++;
      let extra=null; if(L[i+1]==='$'&&esPrecio(L[i+2]||'')){extra=parseInt(L[i+2].replace(/\./g,''),10);i+=2;}
      cerrar(precio,extra); continue; }
    bloque.push(l);
  }
  // JP: exacto, luego difuso contra nuestra misma sección
  for (const it of items){ it.jp = jp[norm(it.nombre)]||'';
    if(!it.jp){ let best=null,bs=0; for(const o of ours[sec]){const s_=sim(it.nombre,o.nombre); if(s_>bs){bs=s_;best=o;}} if(best&&bs>=0.5){it.jp=best.jp; it.match=best.nombre;} }
  }
  live[sec]={subs,subDesc,items};
}
fs.writeFileSync(`${D}/carta-viva.json`, JSON.stringify(live,null,1));

// La hora del render manda sobre la de la descarga: Gourmedia sirve de caché y cada
// plato puede tener ventana horaria, así que lo que importa es a qué hora se armó la
// página, no a qué hora la bajamos. Ese dato viene en el pie del propio HTML.
console.log('=== EXTRACCIÓN ===');
for (const sec of SECS){
  const h = fs.readFileSync(`${D}/raw-${sec}.html`,'utf8');
  const m = h.match(/Cached by gour\.media on ([\d-]+ [\d:]+)/);
  console.log(`  ${sec.padEnd(9)} ${String(live[sec].items.length).padStart(3)} platos   render ${m?m[1]:'(sin dato)'}`);
}
console.log('\n=== sanity: nombres corregidos ===');
['comida','teishoku'].forEach(s=>live[s].items.filter(x=>/hosomaki|teishoku|otsumami|donburis/i.test(x.sub)).slice(0,9).forEach(x=>console.log(`  [${x.sub.slice(0,18)}] ${x.nombre} $${x.precio}`)));
console.log('bajadas:', JSON.stringify(Object.assign({},...SECS.map(s=>live[s].subDesc))).slice(0,300));
