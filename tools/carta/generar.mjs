import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const data=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
const index=fs.readFileSync(REPO+'index.html','utf8');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clp=n=>'$'+Number(n).toLocaleString('es-CL');
const precio=it=>it.precio==null?'<span class="menu-item-price consultar">Consultar</span>':`<span class="menu-item-price">${it.desde?'desde ':''}${clp(it.precio)}${it.extra?' · '+clp(it.extra):''}</span>`;
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const subTitulo=s=>s.replace(/\(\s*1\s*Unid\s*\)/i,'(1 unid.)').replace(/\s+/g,' ').trim()
  .split(' ').map(w=>w===w.toUpperCase()&&w.length>2?w[0]+w.slice(1).toLowerCase():w).join(' ')
  .replace(/^Almuerzo clasico Japones.*$/,'Almuerzo clásico japonés');

// ---- CSS .menu-* con sus @media, extraído de index.html ----
const css=(index.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).map(x=>x.replace(/^<style[^>]*>/,'').replace(/<\/style>$/,'')).join('\n');
function extraer(cssText){
  const out=[]; let i=0;
  const readBlock=()=>{ let depth=0,start=i; while(i<cssText.length){ const c=cssText[i]; if(c==='{')depth++; else if(c==='}'){depth--; if(depth===0){i++; return cssText.slice(start,i);} } i++; } return cssText.slice(start); };
  while(i<cssText.length){
    const rest=cssText.slice(i); const m=rest.match(/^\s*(\/\*[\s\S]*?\*\/\s*)?/); if(m&&m[0].length){i+=m[0].length; if(i>=cssText.length)break;}
    const head=cssText.slice(i).match(/^[^{}]*/)[0]; const sel=head.trim();
    if(!sel){i++;continue;}
    if(sel.startsWith('@media')){ i+=head.length; const blk=readBlock(); const inner=blk.slice(blk.indexOf('{')+1,blk.lastIndexOf('}'));
      const keep=extraer(inner).join('\n'); if(keep.trim()) out.push(`${sel}{\n${keep}\n}`); continue; }
    i+=head.length; const blk=readBlock();
    if(/\.menu-|\.subcat-body/.test(sel)) out.push(sel+blk.slice(blk.indexOf('{')));
  }
  return out;
}
const menuCss=extraer(css).join('\n');
const vars={}; for(const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)) vars[m[1]]=m[2].trim();
const rootCss=':root{'+Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';')+'}';

// ---- secciones ----
const SEC=[['comida','Comida'],['bar','Bar'],['vinos','Vinos'],['por-copa','Por copa'],['sake','Sake'],['teishoku','Teishoku']];
const NOTA={ comida:'Honmaguro · atún bluefin: por temporada y en eventos. Consultar en sala.',
             teishoku:'Martes a jueves, solo almuerzo.' };
let totalItems=0; const ld=[];
const secHtml=SEC.map(([k,label],idx)=>{
  const s=data[k]; const bySub=new Map(); for(const it of s.items){ if(!bySub.has(it.sub)) bySub.set(it.sub,[]); bySub.get(it.sub).push(it); }
  const subsHtml=[...bySub.entries()].map(([sub,items],j)=>{
    const open=j===0?' open':''; const bajada=s.subDesc[sub]?`<div class="menu-bajada">${esc(s.subDesc[sub])}</div>`:'';
    ld.push({'@type':'MenuSection',name:`${label} — ${subTitulo(sub)}`,hasMenuItem:items.map(it=>({'@type':'MenuItem',name:it.nombre,...(it.desc?{description:it.desc}:{}),...(it.precio!=null?{offers:{'@type':'Offer',price:String(it.precio),priceCurrency:'CLP'}}:{})}))});
    totalItems+=items.length;
    return `<div class="menu-subcat${open}" data-count="${items.length}" onclick="this.classList.toggle('open')">${esc(subTitulo(sub))}</div>
<div class="subcat-body">${bajada}${items.map(it=>`
<div class="menu-item"><div class="menu-item-top"><div><div class="menu-item-name">${esc(it.nombre)}</div>${it.jp?`<div class="menu-item-jp">${esc(it.jp)}</div>`:''}</div>${precio(it)}</div>${it.desc?`<div class="menu-item-desc">${esc(it.desc)}</div>`:''}</div>`).join('')}
</div>`; }).join('\n');
  return `<div class="menu-cat${idx===0?' active':''}" id="cat-${k}">${NOTA[k]?`<div class="menu-nota-sec">${esc(NOTA[k])}</div>`:''}<div class="menu-grid">${subsHtml}</div></div>`;
}).join('\n');
const tabs=SEC.map(([k,label],i)=>`<button class="menu-tab${i===0?' active':''}" data-cat="${k}">${label}</button>`).join('');
const jsonld=JSON.stringify({'@context':'https://schema.org','@type':'Menu',name:'Carta de Tengu',url:'https://www.tengu.cl/carta.html',inLanguage:'es-CL',hasMenuSection:ld});
const hoy='2026-09-23';

const html=`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carta — Tengu</title>
<meta name="description" content="La carta de Tengu, cocina japonesa kappo en Isidora Goyenechea 3000, Las Condes: comida, bar, vinos, por copa, sake y teishoku. Precios en pesos chilenos.">
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
/* ── cabecera de la carta ── */
.carta-head{display:flex;align-items:center;justify-content:space-between;padding:22px 48px;border-bottom:1px solid rgba(200,146,26,.12)}
.carta-brand{display:flex;align-items:center;gap:14px;text-decoration:none}
.carta-brand img{width:38px;height:auto;display:block}
.carta-brand span{font-size:20px;font-weight:300;letter-spacing:.32em;margin-left:.32em}
.carta-links{display:flex;gap:22px}
.carta-links a{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--cream2);text-decoration:none;border-bottom:1px solid rgba(200,146,26,.3);padding-bottom:4px;transition:.3s}
.carta-links a:hover{color:var(--gold);border-color:var(--gold)}
.menu-header h1{font-size:clamp(30px,5vw,46px);font-weight:300;letter-spacing:.06em}
.menu-header .menu-label{font-family:var(--font-m);font-size:9px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;display:block}
.menu-nota-sec{font-family:var(--font-m);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(200,146,26,.6);padding:10px 2px 6px;border-bottom:1px solid rgba(200,146,26,.12)}
.menu-bajada{font-size:13px;font-style:italic;color:var(--cream2);padding:12px 4px 4px;line-height:1.5}
.menu-item-price.consultar{color:rgba(200,146,26,.55)}
.subcat-body{display:none}
.menu-subcat.open+.subcat-body{display:block}
/* ── estilos de la carta, copiados de index.html ── */
${menuCss}
@media (max-width:720px){.carta-head{padding:16px 18px}.carta-brand span{font-size:16px}.carta-links{gap:14px}.carta-links a{font-size:8px}}
</style></head>
<body>
<header class="carta-head">
  <a class="carta-brand" href="/"><img src="/tengu-marca.png" alt="" width="600" height="594"><span>TENGU</span></a>
  <nav class="carta-links"><a href="/#reserve">Reservas</a><a href="/api/wa">WhatsApp</a></nav>
</header>
<section class="menu-section" id="menu">
  <div class="menu-header"><span class="menu-label">Tengu · Isidora Goyenechea 3000</span><h1>Carta</h1></div>
  <div class="menu-tabs">${tabs}</div>
${secHtml}
  <p class="menu-note">Precios en pesos chilenos, IVA incluido · Carta sujeta a cambios y disponibilidad · Actualizada ${hoy}</p>
</section>
<script>
(function(){
  var tabs=document.querySelectorAll('.menu-tab'),cats=document.querySelectorAll('.menu-cat');
  function show(k){tabs.forEach(function(t){t.classList.toggle('active',t.dataset.cat===k)});cats.forEach(function(c){c.classList.toggle('active',c.id==='cat-'+k)});}
  tabs.forEach(function(t){t.addEventListener('click',function(){show(t.dataset.cat);history.replaceState(null,'','#'+t.dataset.cat)})});
  function fromHash(){var h=location.hash.slice(1); if(h&&document.getElementById('cat-'+h)) show(h);}
  fromHash(); window.addEventListener('hashchange',fromHash);
})();
</script>
</body></html>`;
fs.writeFileSync(REPO+'carta.html',html);
console.log('carta.html:',(Buffer.byteLength(html)/1024).toFixed(1),'KB ·',totalItems,'platos ·',ld.length,'subsecciones · reglas CSS copiadas:',(menuCss.match(/\{/g)||[]).length);
