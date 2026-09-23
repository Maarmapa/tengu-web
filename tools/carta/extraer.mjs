import fs from 'node:fs';
const D = process.argv[2]; const REPO = new URL('../../',import.meta.url).pathname;
const SECS = ['comida','bar','sake','vinos','por-copa','teishoku'];
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const toks = s => new Set(norm(s).split(' ').filter(t=>t.length>2 && !['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas'].includes(t)));
const sim = (a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};

// ---- nuestra carta (28-ago, con los 3 precios ya corregidos) ----
const html = fs.readFileSync(REPO+'index.html','utf8');
const jp = {}; for (const m of html.matchAll(/menu-item-name">([^<]+)<\/div><div class="menu-item-jp">([^<]*)</g)) jp[norm(m[1])] = m[2];
const ldm = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)||[]; let menu=null;
for (const b of ldm){const j=JSON.parse(b.replace(/^<[^>]+>/,'').replace(/<\/script>$/,''));if(j.hasMenu)menu=j.hasMenu;}
const FAM = [['Comida — ','comida'],['Barra — ','bar'],['Vinos por copa — ','por-copa'],['Sake — ','sake'],['Vinos — ','vinos']];
const ours = {comida:[],bar:[],'por-copa':[],sake:[],vinos:[],teishoku:[]};
for (const s of menu.hasMenuSection){const f=FAM.find(([p])=>s.name.startsWith(p));if(!f)continue;
  for (const it of s.hasMenuItem||[]) ours[f[1]].push({sub:s.name.slice(f[0].length),nombre:it.name,desc:it.description||'',precio:it.offers?+it.offers.price:null,jp:jp[norm(it.name)]||''});}

// ---- extracción viva ----
function limpiar(h){const j=h.lastIndexOf('</nav>');let b=h.slice(j>0?j:0);const d=b.indexOf('id="drawer"');if(d>0)b=b.slice(0,d);
  return b.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,'\n').replace(/&amp;/g,'&').replace(/&#8217;/g,'’').replace(/&nbsp;/g,' ')
   .split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);}
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

// ---- diff vs 28-ago ----
console.log('=== DIFF: carta viva (23-sep) vs nuestra (28-ago) ===');
let tot={add:0,del:0,chg:0};
for (const sec of SECS){
  const A=ours[sec], B=live[sec].items;
  const usedA=new Set(); const add=[], chg=[];
  for (const b of B){ let best=null,bs=0,bi=-1; A.forEach((a,i)=>{ if(usedA.has(i))return; const s_=Math.max(norm(a.nombre)===norm(b.nombre)?1:0, sim(a.nombre,b.nombre)); if(s_>bs){bs=s_;best=a;bi=i;} });
    if(best&&bs>=0.5){ usedA.add(bi); if(b.precio!=null&&best.precio!=null&&b.precio!==best.precio) chg.push(`${b.nombre}: $${best.precio}→$${b.precio}`); }
    else add.push(`${b.nombre}${b.precio!=null?' $'+b.precio:''}`); }
  const del=A.filter((a,i)=>!usedA.has(i)).map(a=>`${a.nombre} $${a.precio}`);
  tot.add+=add.length; tot.del+=del.length; tot.chg+=chg.length;
  console.log(`\n--- ${sec}: viva=${B.length} nuestra=${A.length} | nuevos=${add.length} desaparecidos=${del.length} precio=${chg.length} ---`);
  add.forEach(x=>console.log('  + '+x)); del.forEach(x=>console.log('  − '+x)); chg.forEach(x=>console.log('  ± '+x));
}
console.log(`\nTOTAL: +${tot.add} nuevos, −${tot.del} desaparecidos, ±${tot.chg} precios`);
console.log('\n=== sanity: nombres corregidos ===');
['comida','teishoku'].forEach(s=>live[s].items.filter(x=>/hosomaki|teishoku|otsumami|donburis/i.test(x.sub)).slice(0,9).forEach(x=>console.log(`  [${x.sub.slice(0,18)}] ${x.nombre} $${x.precio}`)));
console.log('bajadas:', JSON.stringify(Object.assign({},...SECS.map(s=>live[s].subDesc))).slice(0,300));
