import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const SECS=['comida','bar','sake','vinos','por-copa','teishoku'];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas','mix','the']);
const toks=s=>new Set(norm(s).split(' ').filter(t=>t.length>2&&!STOP.has(t)));
const sim=(a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};
// Dataset nuevo contra dataset anterior: carta-final.json (lo que se va a publicar)
// vs prev-final.json (la copia que sync.sh guarda antes de correr). Los dos pasaron
// por la misma normalización y la misma deduplicación, así que la comparación es
// pareja y el informe responde la pregunta que importa: qué cambia en el sitio.
//
// Antes se reconstruía "lo nuestro" leyendo el JSON-LD de index.html, con dos fallas
// que hacían el informe inútil: index-carta.mjs reescribe index.html dos pasos antes
// de llegar acá, así que el diff se comparaba contra sí mismo; y la tabla de prefijos
// ('Comida — ', 'Barra — '…) ya no calza con los nombres que index-carta.mjs escribe
// hoy ('Para Comenzar — …', 'Sashimi — …'), así que 29 de 50 secciones se descartaban
// y comida salía con 0 platos. De ahí el "nuestra=0" y el "+176 nuevos" de cada
// corrida. Este informe es el único control humano antes de publicar la carta: si
// grita siempre, no avisa nunca.
//
// Lo que Gourmedia dejó de servir por horario no sale acá, porque el freno de
// final.mjs ya lo conservó: eso lo reporta el aviso ⚠️ FRENO, que es su propio canal.
const live=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
let ours=null;
try{ const prev=JSON.parse(fs.readFileSync(`${D}/prev-final.json`,'utf8'));
     ours={}; for(const s of SECS) ours[s]=(prev[s]&&prev[s].items)||[];
}catch(e){
  console.log('(sin prev-final.json: primera corrida, no hay contra qué comparar)');
  ours=Object.fromEntries(SECS.map(s=>[s,[]]));
}
// alias conocidos (renombres que el difuso no ve)
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
let tot={add:0,del:0,chg:0,txt:0}; const out={};
for(const sec of SECS){
  const A=ours[sec], B=live[sec].items; const pair=new Map(); const usedA=new Set();
  // pasada 1: exacto (o alias)
  B.forEach((b,bi)=>{const nb=ALIAS[norm(b.nombre)]||norm(b.nombre);const ai=A.findIndex((a,i)=>!usedA.has(i)&&norm(a.nombre)===nb);if(ai>=0){pair.set(bi,ai);usedA.add(ai);}});
  // pasada 2: difuso global (mejor similitud primero), umbral 0.67
  const cands=[];B.forEach((b,bi)=>{if(pair.has(bi))return;A.forEach((a,ai)=>{if(usedA.has(ai))return;const s_=sim(a.nombre,b.nombre);if(s_>=0.67)cands.push([s_,bi,ai]);});});
  cands.sort((x,y)=>y[0]-x[0]);for(const [s_,bi,ai] of cands){if(pair.has(bi)||usedA.has(ai))continue;pair.set(bi,ai);usedA.add(ai);}
  // Ojo: no se muta `b`. Antes se le colgaban jp/antes y se reescribía el JSON de
  // entrada; ahora la entrada es el dataset que se publica y no se toca.
  const add=[],chg=[],txt=[];B.forEach((b,bi)=>{const ai=pair.get(bi);if(ai==null){add.push(b);return;}const a=A[ai];
    if(b.precio!=null&&a.precio!=null&&b.precio!==a.precio)chg.push(`${b.nombre}  $${a.precio.toLocaleString('es-CL')} → $${b.precio.toLocaleString('es-CL')}`);
    if((a.desc||'')!==(b.desc||''))txt.push(`${b.nombre}\n      antes: ${a.desc||'(sin descripción)'}\n      ahora: ${b.desc||'(sin descripción)'}`);});
  const del=A.filter((a,i)=>!usedA.has(i));
  tot.add+=add.length;tot.del+=del.length;tot.chg+=chg.length;tot.txt+=txt.length;
  out[sec]={add:add.map(b=>b.nombre+(b.precio!=null?' $'+b.precio.toLocaleString('es-CL'):'')),del:del.map(a=>a.nombre+' $'+(a.precio||0).toLocaleString('es-CL')),chg,txt};
  console.log(`\n--- ${sec}: ahora=${B.length} antes=${A.length} | nuevos=${add.length} dados de baja=${del.length} precio=${chg.length} texto=${txt.length} ---`);
  out[sec].add.forEach(x=>console.log('  + '+x));out[sec].del.forEach(x=>console.log('  − '+x));
  chg.forEach(x=>console.log('  ± '+x));txt.forEach(x=>console.log('  ✎ '+x));
}
console.log(`\nTOTAL: +${tot.add} nuevos · −${tot.del} dados de baja · ±${tot.chg} precios · ✎${tot.txt} descripciones`);
fs.writeFileSync(`${D}/diff-ultima-corrida.json`,JSON.stringify(out,null,1));
const conJp=SECS.reduce((n,s)=>n+live[s].items.filter(x=>x.jp).length,0), total=SECS.reduce((n,s)=>n+live[s].items.length,0);
console.log(`JP recuperados: ${conJp}/${total}`);
