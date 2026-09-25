// Reescribe la carta incrustada en index.html desde el mismo dataset vivo:
// las pestañas de comida, las del bar, la cava de sake y el JSON-LD.
// Sin esto, index.html conservaba la carta del 28-ago (52 platos que la cocina
// ya no hace y 38 que faltaban), y su JSON-LD se lo contaba así a Google.
import fs from 'node:fs';
import { hazPortada, CSS_PORTADA, JS_PORTADA } from './portada.mjs';
import { hazGaleria, CSS_GALERIA } from './galeria.mjs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const data=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clp=n=>'$'+Number(n).toLocaleString('es-CL');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let html=fs.readFileSync(REPO+'index.html','utf8');
const FOTOS=JSON.parse(fs.readFileSync(REPO+'fotos/manifest.json','utf8'));
const srcsetDe=(n)=>{const a=FOTOS[n+'-800.jpg'],b=FOTOS[n+'.jpg'],p=[];
  if(a)p.push(`fotos/${n}-800.jpg ${a[0]}w`); if(b&&(!a||b[0]!==a[0]))p.push(`fotos/${n}.jpg ${b[0]}w`); return p.join(', ');};
// Foto de cabecera solo donde la imagen corresponde a la sección sin ambigüedad.
// A nivel de plato no se puede afirmar: edamame tiene dos candidatos en la carta,
// gyozas cuatro, las almejas seis. A nivel de sección sí.
const portada=(id,label,n)=>hazPortada(id,label,n,FOTOS,esc);

// etiquetas "espíritu"/"chef" del sitio: se conservan para los platos que siguen existiendo
const yokai={};
for(const chunk of html.split('<div class="menu-item">').slice(1)){
  const fin=chunk.indexOf('<div class="menu-item"');            // por si acaso
  const c=fin>=0?chunk.slice(0,fin):chunk;
  const n=c.match(/menu-item-name">([^<]+)</); const t=c.match(/menu-item-yokai">([^<]+)</);
  if(n&&t) yokai[norm(n[1])]=t[1];
}
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
const subTitulo=s=>s.replace(/\(\s*1\s*Unid\s*\)/i,'(1 unid.)').replace(/\s+/g,' ').trim()
  .split(' ').map(w=>w===w.toUpperCase()&&w.length>2?w[0]+w.slice(1).toLowerCase():w).join(' ')
  .replace(/^Almuerzo clasico Japones.*$/,'Almuerzo clásico japonés');

const ld=[];
function item(it){
  const k=ALIAS[norm(it.nombre)]||norm(it.nombre); const tag=yokai[k];
  const precio=it.precio==null?'Consultar':(it.desde?'desde ':'')+clp(it.precio);
  return `    <div class="menu-item"><div class="menu-item-top"><div><div class="menu-item-name">${esc(it.nombre)}</div>`
   +(it.jp?`<div class="menu-item-jp">${esc(it.jp)}</div>`:'')
   +`</div><div class="menu-item-price">${precio}</div></div>`
   +`<div class="menu-item-desc">${esc(it.desc)}</div>`
   +(tag?`<div class="menu-item-yokai">${esc(tag)}</div>`:'')+`</div>`;
}
function grupo(label, pares){   // pares: [tituloSub, items]
  let out='';
  for(const [sub,items] of pares){
    ld.push({'@type':'MenuSection',name:`${label} — ${subTitulo(sub)}`,hasMenuItem:items.map(it=>({'@type':'MenuItem',name:it.nombre,...(it.desc?{description:it.desc}:{}),...(it.precio!=null?{offers:{'@type':'Offer',price:String(it.precio),priceCurrency:'CLP'}}:{})}))});
    out+=`\n    <div class="menu-subcat">${esc(subTitulo(sub))}</div>\n`+items.map(item).join('\n');
  }
  return out+'\n  ';
}
const porSub=(sec,claves)=>{ const g=new Map();
  for(const it of data[sec].items){ if(claves && !claves.some(c=>norm(it.sub).startsWith(c))) continue;
    if(!g.has(it.sub))g.set(it.sub,[]); g.get(it.sub).push(it); } return [...g]; };

// límites exactos de un <div ...> balanceado
function bloque(re){ const m=html.match(re); if(!m) return null; const i=m.index; let d=0,k=i;
  while(k<html.length){ if(html.startsWith('<div',k))d++; else if(html.startsWith('</div>',k)){d--; if(d===0)return[i,k+6];} k++; } return null; }
function reemplazarGrid(sel, contenido, id, label, n){
  const b=bloque(sel); if(!b){ console.error('no encuentro',sel); process.exit(1); }
  const seg=html.slice(b[0],b[1]);
  const gi=seg.indexOf('<div class="menu-grid">'); if(gi<0){ console.error('sin menu-grid en',sel); process.exit(1); }
  const gAbs=b[0]+gi; const gb=bloque(new RegExp('')); // no usar
  // cerrar el menu-grid por balance
  let d=0,k=gAbs; while(k<html.length){ if(html.startsWith('<div',k))d++; else if(html.startsWith('</div>',k)){d--; if(d===0){k+=6;break;}} k++; }
  const cab = id ? portada(id,label,n) : '';
  // Borrar una portada previa para que correr esto dos veces no la duplique. Se busca
  // por prefijo de clase, no por la etiqueta exacta: la cabecera lleva una clase extra
  // (mp-duo) cuando la sección tiene dos fotos, y buscando el string exacto no calzaba,
  // así que en vez de reemplazarla agregaba otra en cada corrida.
  let ini=gAbs; const antes=html.slice(b[0],gAbs);
  const pi=antes.search(/<div class="menu-portada[ "]/);
  if(pi>=0){ let dd=0,q=b[0]+pi; while(q<html.length){ if(html.startsWith('<div',q))dd++; else if(html.startsWith('</div>',q)){dd--; if(dd===0){q+=6;break;}} q++; }
    html=html.slice(0,b[0]+pi)+html.slice(q); const delta=q-(b[0]+pi); ini=gAbs-delta; k-=delta; }
  html=html.slice(0,ini)+cab+'<div class="menu-grid">'+contenido+'</div>'+html.slice(k);
}

const COMIDA=[['comenzar','Para Comenzar',['para comenzar','otsumami','tartaros']],
  ['sashimi','Sashimi',['sashimi','usuzukuri','uzuzukuri']],['nigiris','Nigiris',['nigiri tradicional','nigiri omakase']],
  ['makis','Makis',['makis','hosomaki','temaki']],
  ['caliente','Cocina Caliente',['tempuras','ramen','cocina caliente','donburis','mini donburis']],
  ['postres','Postres',['postre']]];
// Una subsección nueva de Gourmedia que no calce con ninguna pestaña se caía del
// sitio sin decir nada: index.html quedaba con menos platos que carta.html y nadie
// se enteraba. Ahora se avisa y cae en Cocina Caliente, igual que en generar.mjs.
const asignadasC=new Set(COMIDA.flatMap(([,,cl])=>porSub('comida',cl).map(([s])=>s)));
const sueltasC=data.comida.subs.filter(s=>!asignadasC.has(s)&&data.comida.items.some(i=>i.sub===s));
if(sueltasC.length) console.error('⚠️  SUBSECCIONES SIN PESTAÑA → van a Cocina Caliente:',sueltasC);
for(const [id,label,claves] of COMIDA){ let pares=porSub('comida',claves);
  if(id==='caliente'&&sueltasC.length) pares=pares.concat(sueltasC.map(s=>[s,data.comida.items.filter(i=>i.sub===s)]));
  const n=pares.reduce((a,[,it])=>a+it.length,0);
  reemplazarGrid(new RegExp(`<div class="menu-cat[^"]*" id="cat-${id}"`), grupo(label,pares), id, label, n); }

const BAR=[['cocteles','Coctelería',['cocteleria','mocktail']],['destilados','Destilados',['gin','vodka','whisky','tequila','pisco','ron']],
  ['cervezas','Cervezas',['cervezas']],['aguas','Aguas y bebidas',['aguas']],['cafe','Cafetería',['cafeteria']]];
for(const [id,label,claves] of BAR) reemplazarGrid(new RegExp(`<div class="bar-cat[^"]*" id="bar-${id}"`), grupo(label,porSub('bar',claves)));
reemplazarGrid(/<div class="bar-cat[^"]*" id="bar-vinos"/, grupo('Vinos',porSub('vinos',null)));
reemplazarGrid(/<div class="bar-cat[^"]*" id="bar-copa"/, grupo('Vinos por copa',porSub('por-copa',null)));

// sake: su menu-grid vive suelto dentro de la sección
{ const i=html.indexOf('id="sake"'); const gi=html.indexOf('<div class="menu-grid">',i);
  let d=0,k=gi; while(k<html.length){ if(html.startsWith('<div',k))d++; else if(html.startsWith('</div>',k)){d--; if(d===0){k+=6;break;}} k++; }
  const pares=porSub('sake',null).map(([s,it])=>['La cava — '+s,it]);
  html=html.slice(0,gi)+'<div class="menu-grid">'+grupo('Sake',pares)+'</div>'+html.slice(k); }

// Teishoku no tenía pestaña en index.html; la cocina la publicó después.
// Si ya existe se regenera como cualquier otra: saltarla dejaba el markup viejo.
{ const pares=porSub('teishoku',null);
  if(pares.length){
    const n=pares.reduce((a,[,it])=>a+it.length,0);
    if(html.includes('id="cat-teishoku"')){
      reemplazarGrid(/<div class="menu-cat[^"]*" id="cat-teishoku"/, grupo('Teishoku',pares), 'teishoku', 'Teishoku', n);
    } else {
      const btn='<button class="menu-tab" onclick="showCat(\'teishoku\',this)" data-en="Teishoku">Teishoku</button>';
      html=html.replace(/(<button class="menu-tab"[^>]*onclick="showCat\('postres',this\)"[^>]*>[^<]*<\/button>)/, '$1\n    '+btn);
      const bp=bloque(/<div class="menu-cat[^"]*" id="cat-postres"/);
      if(!bp){ console.error('no encuentro cat-postres'); process.exit(1); }
      html=html.slice(0,bp[1])+'\n  <div class="menu-cat" id="cat-teishoku"><div class="menu-grid">'+grupo('Teishoku',pares)+'</div></div>'+html.slice(bp[1]);
    }
  } }

// la pestaña Atún Bluefin y su bloque se van: la cocina sacó esa sección
html=html.replace(/\s*<button class="menu-tab"[^>]*onclick="showCat\('bluefin',this\)"[^>]*>[^<]*<\/button>/,'');
{ const b=bloque(/<div class="menu-cat[^"]*" id="cat-bluefin"/); if(b) html=html.slice(0,b[0])+html.slice(b[1]); }

// JSON-LD: el menú que lee Google. Se parsea y reescribe el bloque entero;
// con regex fallaba porque hasMenu es la última clave del objeto.
{ const re=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g; let m, hecho=false;
  while((m=re.exec(html))){ let j; try{ j=JSON.parse(m[1]); }catch(e){ continue; }
    if(!j.hasMenu) continue;
    j.hasMenu={'@type':'Menu',name:'Carta oficial de Tengu',inLanguage:'es-CL',hasMenuSection:ld};
    html=html.slice(0,m.index)+'<script type="application/ld+json">'+JSON.stringify(j)+'</script>'+html.slice(m.index+m[0].length);
    hecho=true; break; }
  if(!hecho){ console.error('no pude reescribir el JSON-LD'); process.exit(1); } }

// Reemplazar entre marcas, no solo insertar: si no, una segunda corrida
// dejaba el CSS viejo y el HTML nuevo sin estilo.
{ const bloque=CSS_PORTADA;
  const re=/\/\*MZ-INI\*\/[\s\S]*?\/\*MZ-FIN\*\//;
  if(re.test(html)) html=html.replace(re, bloque.trim());
  else { const i=html.lastIndexOf('</style>'); if(i<0){ console.error('no encuentro </style>'); process.exit(1); }
         html=html.slice(0,i)+bloque+html.slice(i); } }
{ const re=/\/\*MZJS-INI\*\/[\s\S]*?\/\*MZJS-FIN\*\//;
  if(re.test(html)) html=html.replace(re, JS_PORTADA.trim());
  else { const j=html.lastIndexOf('</body>'); if(j<0){ console.error('no encuentro </body>'); process.exit(1); }
         html=html.slice(0,j)+'<script>'+JS_PORTADA+'</script>\n'+html.slice(j); } }
// galería de la barra, entre Historia y la Carta — reemplaza entre marcas
{ const sec=hazGaleria(FOTOS,esc);
  const re=/<!--GAL-INI-->[\s\S]*?<!--GAL-FIN-->/;
  if(re.test(html)) html=html.replace(re, sec);
  else { const i=html.indexOf('<section class="menu-section" id="menu">');
         if(i<0){ console.error('no encuentro #menu'); process.exit(1); }
         html=html.slice(0,i)+sec+'\n'+html.slice(i); }
  const reC=/\/\*GAL-CSS-INI\*\/[\s\S]*?\/\*GAL-CSS-FIN\*\//;
  if(reC.test(html)) html=html.replace(reC, CSS_GALERIA.trim());
  else { const j=html.lastIndexOf('</style>'); html=html.slice(0,j)+CSS_GALERIA+html.slice(j); } }

fs.writeFileSync(REPO+'index.html',html);
const n=ld.reduce((a,s)=>a+s.hasMenuItem.length,0);
console.log('index.html: carta regenerada ·',n,'platos ·',ld.length,'subsecciones · pestaña Bluefin eliminada');
