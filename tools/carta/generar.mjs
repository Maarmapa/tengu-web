import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const data=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
// anchos reales de cada foto: el descriptor w del srcset debe ser el ancho del archivo,
// no el tamaño al que se pidió reducirlo (una foto vertical de 1600 de alto mide 1200 de ancho).
const FOTOS=JSON.parse(fs.readFileSync(REPO+'fotos/manifest.json','utf8'));
const srcsetDe=(n)=>{const a=FOTOS[n+'-800.jpg'],b=FOTOS[n+'.jpg'],p=[];
  if(a)p.push(`fotos/${n}-800.jpg ${a[0]}w`); if(b&&(!a||b[0]!==a[0]))p.push(`fotos/${n}.jpg ${b[0]}w`); return p.join(', ');};
const index=fs.readFileSync(REPO+'index.html','utf8');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clp=n=>'$'+Number(n).toLocaleString('es-CL');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const precio=it=>it.precio==null?'<div class="menu-item-price consultar">Consultar</div>':`<div class="menu-item-price">${it.desde?'desde ':''}${clp(it.precio)}${it.extra?' · '+clp(it.extra):''}</div>`;
const subTitulo=s=>s.replace(/\(\s*1\s*Unid\s*\)/i,'(1 unid.)').replace(/\s+/g,' ').trim()
  .split(' ').map(w=>w===w.toUpperCase()&&w.length>2?w[0]+w.slice(1).toLowerCase():w).join(' ')
  .replace(/^Almuerzo clasico Japones.*$/,'Almuerzo clásico japonés');

// ---- del sitio: CSS .menu-* (+@media), cabecera de sección, etiquetas por plato ----
const css=(index.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).map(x=>x.replace(/^<style[^>]*>/,'').replace(/<\/style>$/,'')).join('\n');
function extraer(cssText, test){
  const out=[]; let i=0;
  const readBlock=()=>{let depth=0,start=i;while(i<cssText.length){const c=cssText[i];if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0){i++;return cssText.slice(start,i);}}i++;}return cssText.slice(start);};
  while(i<cssText.length){
    const m=cssText.slice(i).match(/^\s*(\/\*[\s\S]*?\*\/\s*)?/); if(m&&m[0].length){i+=m[0].length;if(i>=cssText.length)break;}
    const head=cssText.slice(i).match(/^[^{}]*/)[0]; const sel=head.trim(); if(!sel){i++;continue;}
    if(sel.startsWith('@media')){i+=head.length;const blk=readBlock();const inner=blk.slice(blk.indexOf('{')+1,blk.lastIndexOf('}'));const keep=extraer(inner,test).join('\n');if(keep.trim())out.push(`${sel}{\n${keep}\n}`);continue;}
    i+=head.length; const blk=readBlock(); if(test(sel)) out.push(sel+blk.slice(blk.indexOf('{')));
  }
  return out;
}
const menuCss=extraer(css, s=>/\.menu-(section|header|tabs|tab|cat|grid|item|subcat|note)\b/.test(s) ).join('\n');
const secCss=extraer(css, s=>/^\.(sec-tag|sec-title|gold-line)(\s|$|\{|,)|\.sec-title em/.test(s) && !/#instagram/.test(s)).join('\n');
const vars={}; for(const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)) vars[m[1]]=m[2].trim();
const rootCss=':root{'+Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';')+'}';
const yokai={};
for(const chunk of index.split('<div class="menu-item">').slice(1)){
  const fin=chunk.indexOf('<div class="menu-item"');            // por si acaso
  const c=fin>=0?chunk.slice(0,fin):chunk;
  const n=c.match(/menu-item-name">([^<]+)</); const t=c.match(/menu-item-yokai">([^<]+)</);
  if(n&&t) yokai[norm(n[1])]=t[1];
}
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
const tag=it=>{const k=ALIAS[norm(it.nombre)]||norm(it.nombre);return yokai[k]?`<div class="menu-item-yokai">${esc(yokai[k])}</div>`:'';};

// ---- pestañas como en el sitio ----
const MAPA=[
  ['comenzar','Para Comenzar',['para comenzar','otsumami','tartaros']],
  ['sashimi','Sashimi',['sashimi','uzuzukuri']],
  ['nigiris','Nigiris',['nigiri tradicional','nigiri omakase']],
  ['makis','Makis',['makis','hosomaki','temaki']],
  ['caliente','Cocina Caliente',['tempuras','ramen','cocina caliente','donburis','mini donburis']],
  ['postres','Postres',['postre']],
];
const NOTAS={sashimi:'Honmaguro · atún bluefin: por temporada y en eventos. Consultar en sala.'};
// Cabecera con foto, solo donde la imagen corresponde a la sección sin ambigüedad.
// Las secciones sin foto van sin cabecera: media cabecera se ve peor que ninguna.
const PORTADA={
  comenzar:['uni-ikura-trufa','Erizo, ikura y trufa','center center'],
  sashimi:['tiradito-petalos','Usuzukuri con pétalos y cítricos','center 46%'],
  nigiris:['nigiri-trufa','Nigiri omakase con trufa','center 42%'],
  caliente:['okonomiyaki','Okonomiyaki de la cocina caliente','center 44%'],
};
const portada=(id,label,n)=>{ const v=PORTADA[id]; if(!v) return '';
  return `<div class="menu-portada">
  <img loading="lazy" src="fotos/${v[0]}.jpg" srcset="${srcsetDe(v[0])}" sizes="(max-width:720px) 40vw, 230px" alt="${esc(v[1])}">
  <div class="mp-txt"><h2>${esc(label)}</h2><p>${n} platos</p></div>
</div>`; };
const grupos=(sec)=>{const g=new Map();for(const it of data[sec].items){if(!g.has(it.sub))g.set(it.sub,[]);g.get(it.sub).push(it);}return g;};
const comida=grupos('comida'); const asignadas=new Set();
const tabs=[]; let total=0; const ld=[];
let primeraDeLaPestana=true;
const bloqueSub=(label, sub, items, bajada)=>{
  const abierta=primeraDeLaPestana; primeraDeLaPestana=false;
  ld.push({'@type':'MenuSection',name:`${label} — ${subTitulo(sub)}`,hasMenuItem:items.map(it=>({'@type':'MenuItem',name:it.nombre,...(it.desc?{description:it.desc}:{}),...(it.precio!=null?{offers:{'@type':'Offer',price:String(it.precio),priceCurrency:'CLP'}}:{})}))});
  total+=items.length;
  return `<div class="menu-subcat${abierta?' open':''}" data-count="${items.length}" onclick="this.classList.toggle('open')">${esc(subTitulo(sub))}</div><div class="subcat-body">${bajada?`<div class="menu-bajada">${esc(bajada)}</div>`:''}`+items.map(it=>`
<div class="menu-item"><div class="menu-item-top"><div><div class="menu-item-name">${esc(it.nombre)}</div>${it.jp?`<div class="menu-item-jp">${esc(it.jp)}</div>`:''}</div>${precio(it)}</div>${it.desc?`<div class="menu-item-desc">${esc(it.desc)}</div>`:''}${tag(it)}</div>`).join('')+'</div>';
};
for(const [id,label,claves] of MAPA){
  let html=''; primeraDeLaPestana=true;
  for(const [sub,items] of comida){ if(claves.some(c=>norm(sub).startsWith(c))){ asignadas.add(sub); html+=bloqueSub(label,sub,items,data.comida.subDesc[sub]); } }
  tabs.push({id,label,html,nota:NOTAS[id]});
}
const sueltas=[...comida.keys()].filter(s=>!asignadas.has(s));
if(sueltas.length){ console.warn('SUBSECCIONES SIN PESTAÑA → van a Cocina Caliente:',sueltas); const t=tabs.find(t=>t.id==='caliente'); for(const s of sueltas) t.html+=bloqueSub('Cocina Caliente',s,comida.get(s),data.comida.subDesc[s]); }
const simple=(id,label,sec,nota)=>{let html=''; primeraDeLaPestana=true;for(const [sub,items] of grupos(sec)) html+=bloqueSub(label,sub,items,data[sec].subDesc[sub]);tabs.push({id,label,html,nota});};
simple('bar','Bar','bar');
{ let html='<div class="menu-divisor">Por copa</div>'; primeraDeLaPestana=true; for(const [sub,items] of grupos('por-copa')) html+=bloqueSub('Vinos por copa',sub,items);
  html+='<div class="menu-divisor">Por botella</div>'; for(const [sub,items] of grupos('vinos')) html+=bloqueSub('Vinos',sub,items,data.vinos.subDesc[sub]);
  tabs.push({id:'vinos',label:'Vinos',html}); }
simple('sake','Sake','sake');
simple('teishoku','Teishoku','teishoku','Martes a jueves, solo almuerzo.');

const tabsHtml=tabs.map((t,i)=>`<button class="menu-tab${i===0?' active':''}" data-cat="${t.id}">${t.label}</button>`).join('');
const catsHtml=tabs.map((t,i)=>`<div class="menu-cat${i===0?' active':''}" id="cat-${t.id}">${portada(t.id,t.label,(t.html.match(/class="menu-item"/g)||[]).length)}${t.nota?`<div class="menu-nota-sec">${esc(t.nota)}</div>`:''}<div class="menu-grid">${t.html}</div></div>`).join('\n');
const jsonld=JSON.stringify({'@context':'https://schema.org','@type':'Menu',name:'Carta de Tengu',url:'https://www.tengu.cl/carta.html',inLanguage:'es-CL',hasMenuSection:ld});

const html=`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carta — Tengu</title>
<meta name="description" content="La carta oficial de Tengu, cocina japonesa kappo en Isidora Goyenechea 3000, Las Condes: para comenzar, sashimi, nigiris, makis, cocina caliente, postres, bar, vinos, sake y teishoku.">
<link rel="canonical" href="https://www.tengu.cl/carta.html">
<link rel="icon" type="image/svg+xml" href="favicon.svg"><link rel="icon" type="image/png" sizes="64x64" href="favicon-64.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Noto+Serif+JP:wght@300;400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">${jsonld}</script>
<style>
${rootCss}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--black);color:var(--cream);font-family:var(--font-d);overflow-x:hidden}
a{color:inherit}
.carta-head{display:flex;align-items:center;justify-content:space-between;padding:22px 48px;border-bottom:1px solid rgba(200,146,26,.12)}
.carta-brand{display:flex;align-items:center;gap:14px;text-decoration:none}
.carta-brand img{width:38px;height:auto;display:block}
.carta-brand span{font-size:20px;font-weight:300;letter-spacing:.32em;margin-left:.32em}
.carta-links{display:flex;gap:22px}
.carta-links a{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--cream2);text-decoration:none;border-bottom:1px solid rgba(200,146,26,.3);padding-bottom:4px;transition:.3s}
.carta-links a:hover{color:var(--gold);border-color:var(--gold)}
/* cabecera y estilos de la carta, copiados del sitio */
${secCss}
${menuCss}
.menu-portada{display:flex;gap:clamp(16px,3vw,30px);align-items:flex-start;padding:2px 2px 20px;
              border-bottom:1px solid rgba(200,146,26,.12);margin-bottom:8px}
.menu-portada .mp-txt{padding-top:2px}
.menu-portada img{width:clamp(115px,23vw,230px);aspect-ratio:3/4;object-fit:cover;
                  filter:brightness(.88);flex:0 0 auto;display:block}
.mp-txt h2{font-family:var(--font-d);font-size:clamp(26px,5vw,44px);font-weight:300;color:var(--cream);line-height:1}
.mp-txt p{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;
          color:rgba(200,146,26,.75);margin-top:10px}
/* Subcategorías plegables: la primera de cada pestaña abierta, el resto cerradas.
   Con 236 platos, mostrarlo todo de una es un muro; y una sola subsección
   también se pliega, para que el gesto sea el mismo en toda la carta. */
.subcat-body{display:none}
.menu-subcat.open+.subcat-body{display:block}
.menu-divisor{font-family:var(--font-d);font-size:22px;font-weight:300;font-style:italic;color:var(--gold);margin:34px 0 4px;padding:0 2px}
.menu-nota-sec{font-family:var(--font-m);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(200,146,26,.6);padding:10px 2px 6px;border-bottom:1px solid rgba(200,146,26,.12)}
.menu-bajada{font-size:13px;font-style:italic;color:var(--cream2);padding:12px 4px 4px;line-height:1.5}
.menu-item-price.consultar{color:rgba(200,146,26,.55)}
@media (max-width:720px){.carta-head{padding:16px 18px}.carta-brand span{font-size:16px}.carta-links{gap:14px}.carta-links a{font-size:8px}}
</style></head>
<body>
<header class="carta-head">
  <a class="carta-brand" href="/"><img src="/tengu-marca.png" alt="" width="600" height="594"><span>TENGU</span></a>
  <nav class="carta-links"><a href="/#reserve">Reservas</a><a href="/api/wa">WhatsApp</a></nav>
</header>
<section class="menu-section" id="menu">
  <div class="menu-header">
    <p class="sec-tag">La carta oficial</p>
    <h2 class="sec-title" style="text-align:center">Cada plato, un <em>espíritu</em></h2>
    <div class="gold-line"></div>
  </div>
  <div class="menu-tabs">${tabsHtml}</div>
${catsHtml}
  <p class="menu-note">Precios en pesos chilenos, IVA incluido · Carta sujeta a cambios y disponibilidad · Actualizada 2026-09-23</p>
</section>
<script>
(function(){
  var tabs=document.querySelectorAll('.menu-tab'),cats=document.querySelectorAll('.menu-cat');
  function show(k){tabs.forEach(function(t){t.classList.toggle('active',t.dataset.cat===k)});cats.forEach(function(c){c.classList.toggle('active',c.id==='cat-'+k)});}
  tabs.forEach(function(t){t.addEventListener('click',function(){show(t.dataset.cat);history.replaceState(null,'','#'+t.dataset.cat);window.scrollTo({top:document.querySelector('.menu-tabs').offsetTop-8,behavior:'smooth'})})});
  function fromHash(){var h=location.hash.slice(1); if(h&&document.getElementById('cat-'+h)) show(h);}
  fromHash(); window.addEventListener('hashchange',fromHash);
})();
</script>
</body></html>`;
fs.writeFileSync(REPO+'carta.html',html);
console.log('carta.html:',(Buffer.byteLength(html)/1024).toFixed(1),'KB ·',total,'platos ·',tabs.length,'pestañas ·',ld.length,'subsecciones · sueltas:',sueltas.length);
