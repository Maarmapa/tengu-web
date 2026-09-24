// Reescribe la carta incrustada en index.html desde el mismo dataset vivo:
// las pestañas de comida, las del bar, la cava de sake y el JSON-LD.
// Sin esto, index.html conservaba la carta del 28-ago (52 platos que la cocina
// ya no hace y 38 que faltaban), y su JSON-LD se lo contaba así a Google.
import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const data=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clp=n=>'$'+Number(n).toLocaleString('es-CL');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let html=fs.readFileSync(REPO+'index.html','utf8');

// etiquetas "espíritu"/"chef" del sitio: se conservan para los platos que siguen existiendo
const yokai={}; for(const m of html.matchAll(/menu-item-name">([^<]+)<\/div>[\s\S]{0,700}?menu-item-yokai">([^<]+)</g)) yokai[norm(m[1])]=m[2];
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
function reemplazarGrid(sel, contenido){
  const b=bloque(sel); if(!b){ console.error('no encuentro',sel); process.exit(1); }
  const seg=html.slice(b[0],b[1]);
  const gi=seg.indexOf('<div class="menu-grid">'); if(gi<0){ console.error('sin menu-grid en',sel); process.exit(1); }
  const gAbs=b[0]+gi; const gb=bloque(new RegExp('')); // no usar
  // cerrar el menu-grid por balance
  let d=0,k=gAbs; while(k<html.length){ if(html.startsWith('<div',k))d++; else if(html.startsWith('</div>',k)){d--; if(d===0){k+=6;break;}} k++; }
  html=html.slice(0,gAbs)+'<div class="menu-grid">'+contenido+'</div>'+html.slice(k);
}

const COMIDA=[['comenzar','Para Comenzar',['para comenzar','otsumami','tartaros']],
  ['sashimi','Sashimi',['sashimi','uzuzukuri']],['nigiris','Nigiris',['nigiri tradicional','nigiri omakase']],
  ['makis','Makis',['makis','hosomaki','temaki']],
  ['caliente','Cocina Caliente',['tempuras','ramen','cocina caliente','donburis','mini donburis']],
  ['postres','Postres',['postre']]];
for(const [id,label,claves] of COMIDA) reemplazarGrid(new RegExp(`<div class="menu-cat[^"]*" id="cat-${id}"`), grupo(label,porSub('comida',claves)));

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
{ const pares=porSub('teishoku',null);
  if(pares.length){
    const btn='<button class="menu-tab" onclick="showCat(\'teishoku\',this)" data-en="Teishoku">Teishoku</button>';
    html=html.replace(/(<button class="menu-tab"[^>]*onclick="showCat\('postres',this\)"[^>]*>[^<]*<\/button>)/, '$1\n    '+btn);
    const bp=bloque(/<div class="menu-cat[^"]*" id="cat-postres"/);
    if(!bp){ console.error('no encuentro cat-postres'); process.exit(1); }
    html=html.slice(0,bp[1])+'\n  <div class="menu-cat" id="cat-teishoku"><div class="menu-grid">'+grupo('Teishoku',pares)+'</div></div>'+html.slice(bp[1]);
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

fs.writeFileSync(REPO+'index.html',html);
const n=ld.reduce((a,s)=>a+s.hasMenuItem.length,0);
console.log('index.html: carta regenerada ·',n,'platos ·',ld.length,'subsecciones · pestaña Bluefin eliminada');
