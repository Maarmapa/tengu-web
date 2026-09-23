import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const SECS=['comida','bar','sake','vinos','por-copa','teishoku'];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas','mix','the']);
const toks=s=>new Set(norm(s).split(' ').filter(t=>t.length>2&&!STOP.has(t)));
const sim=(a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};
const live=JSON.parse(fs.readFileSync(`${D}/carta-viva.json`,'utf8'));
const html=fs.readFileSync(REPO+'index.html','utf8');
const jp={};for(const m of html.matchAll(/menu-item-name">([^<]+)<\/div><div class="menu-item-jp">([^<]*)</g))jp[norm(m[1])]=m[2];
const ldm=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)||[];let menu=null;
for(const b of ldm){const j=JSON.parse(b.replace(/^<[^>]+>/,'').replace(/<\/script>$/,''));if(j.hasMenu)menu=j.hasMenu;}
const FAM=[['Comida — ','comida'],['Barra — ','bar'],['Vinos por copa — ','por-copa'],['Sake — ','sake'],['Vinos — ','vinos']];
const ours={comida:[],bar:[],'por-copa':[],sake:[],vinos:[],teishoku:[]};
for(const s of menu.hasMenuSection){const f=FAM.find(([p])=>s.name.startsWith(p));if(!f)continue;
  for(const it of s.hasMenuItem||[])ours[f[1]].push({sub:s.name.slice(f[0].length),nombre:it.name,precio:it.offers?+it.offers.price:null,jp:jp[norm(it.name)]||''});}
// alias conocidos (renombres que el difuso no ve)
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
let tot={add:0,del:0,chg:0}; const out={};
for(const sec of SECS){
  const A=ours[sec], B=live[sec].items; const pair=new Map(); const usedA=new Set();
  // pasada 1: exacto (o alias)
  B.forEach((b,bi)=>{const nb=ALIAS[norm(b.nombre)]||norm(b.nombre);const ai=A.findIndex((a,i)=>!usedA.has(i)&&norm(a.nombre)===nb);if(ai>=0){pair.set(bi,ai);usedA.add(ai);}});
  // pasada 2: difuso global (mejor similitud primero), umbral 0.67
  const cands=[];B.forEach((b,bi)=>{if(pair.has(bi))return;A.forEach((a,ai)=>{if(usedA.has(ai))return;const s_=sim(a.nombre,b.nombre);if(s_>=0.67)cands.push([s_,bi,ai]);});});
  cands.sort((x,y)=>y[0]-x[0]);for(const [s_,bi,ai] of cands){if(pair.has(bi)||usedA.has(ai))continue;pair.set(bi,ai);usedA.add(ai);}
  const add=[],chg=[];B.forEach((b,bi)=>{const ai=pair.get(bi);if(ai==null){add.push(b);return;}const a=A[ai];b.jp=b.jp||a.jp;b.antes=a.nombre;
    if(b.precio!=null&&a.precio!=null&&b.precio!==a.precio)chg.push(`${b.nombre}  $${a.precio.toLocaleString('es-CL')} → $${b.precio.toLocaleString('es-CL')}`);});
  const del=A.filter((a,i)=>!usedA.has(i));
  tot.add+=add.length;tot.del+=del.length;tot.chg+=chg.length;
  out[sec]={add:add.map(b=>b.nombre+(b.precio!=null?' $'+b.precio.toLocaleString('es-CL'):'')),del:del.map(a=>a.nombre+' $'+(a.precio||0).toLocaleString('es-CL')),chg};
  console.log(`\n--- ${sec}: viva=${B.length} nuestra=${A.length} | nuevos=${add.length} desaparecidos=${del.length} precio=${chg.length} ---`);
  out[sec].add.forEach(x=>console.log('  + '+x));out[sec].del.forEach(x=>console.log('  − '+x));chg.forEach(x=>console.log('  ± '+x));
}
console.log(`\nTOTAL: +${tot.add} nuevos · −${tot.del} desaparecidos · ±${tot.chg} precios`);
fs.writeFileSync(`${D}/carta-viva.json`,JSON.stringify(live,null,1));
fs.writeFileSync(`${D}/diff-28ago-vs-23sep.json`,JSON.stringify(out,null,1));
const conJp=SECS.reduce((n,s)=>n+live[s].items.filter(x=>x.jp).length,0), total=SECS.reduce((n,s)=>n+live[s].items.length,0);
console.log(`JP recuperados: ${conJp}/${total}`);
