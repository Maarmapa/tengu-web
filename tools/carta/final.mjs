import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const SECS=['comida','bar','sake','vinos','por-copa','teishoku'];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas','mix','the']);
const toks=s=>new Set(norm(s).split(' ').filter(t=>t.length>2&&!STOP.has(t)));
const sim=(a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};
const live=JSON.parse(fs.readFileSync(`${D}/carta-viva.json`,'utf8'));
// Los nombres en japonés salen del sitio anterior Y del dataset anterior. Depender de
// uno solo es frágil: index.html lo reescribe el propio pipeline, y prev-final.json no
// existe en la primera corrida. La unión sobrevive a las dos situaciones.
const html=fs.readFileSync(REPO+'index.html','utf8');
const jpMap={};for(const m of html.matchAll(/menu-item-name">([^<]+)<\/div><div class="menu-item-jp">([^<]*)</g))jpMap[norm(m[1])]=m[2];
try{ const prev=JSON.parse(fs.readFileSync(`${D}/prev-final.json`,'utf8'));
     for(const s of SECS) for(const it of (prev[s]&&prev[s].items)||[]) if(it.jp&&!jpMap[norm(it.nombre)]) jpMap[norm(it.nombre)]=it.jp;
}catch(e){}
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
// título legible: la fuente viene en MAYÚSCULAS irregulares → Title Case suave, respetando siglas cortas
const titulo=s=>s.replace(/\s*\(\s*/g,' (').replace(/\s*\)/g,')').replace(/\s+/g,' ').trim()
  .split(' ').map((w,wi)=>{ const lw=w.toLowerCase(); if(wi>0&&['al','el','la','de','en','y','o','a','lo','del','con','los','las'].includes(lw)) return lw; if(/^\(?\d/.test(w)||w.length<=2) return w; 
    const core=w.replace(/[()]/g,''); if(core===core.toUpperCase()||core===core.toLowerCase()) return w[0]==='('?'('+core[0].toUpperCase()+core.slice(1).toLowerCase()+(w.endsWith(')')?')':''):core[0].toUpperCase()+core.slice(1).toLowerCase()+(w.endsWith(')')?')':''); return w; }).join(' ')
  .replace(/\(\s*(\d+)\s*unid[^)]*\)/gi,'($1 unid.)').replace(/\b(Aoc|Doc|Ipa|Xo|Vsop|Igp)\b/g,m=>m.toUpperCase());
let dups=0, sinJp=0, total=0; const out={}; const dupList=[];
for(const sec of SECS){
  const seen=new Map(); const items=[];
  for(const it of live[sec].items){
    const key=norm(it.sub)+'|'+norm(it.nombre)+'|'+it.precio;
    // Gana la PRIMERA ficha, no la de descripción más larga. Gourmedia renderiza
    // primero la ficha vigente y después la vieja abandonada, y la vieja suele ser
    // la más larga: quedarse con la larga publicaba "camarón tempura y palta" en el
    // Hotate Maki (la cocina hoy lo hace con nori y ostión) y borraba el masago del
    // Naruto Maki. Una descripción de plato que no es la del plato es un problema
    // de alérgenos, no de estilo.
    if(seen.has(key)){ dups++; dupList.push(sec+': '+it.nombre); continue; }
    seen.set(key, items.length);
    // El nombre propio manda; el alias es solo la red para un renombre recién hecho.
    // Al revés se pierde el japonés apenas el renombre ya se publicó: el alias apunta
    // al nombre viejo, que para entonces no existe ni en index.html ni en el dataset.
    const nb=norm(it.nombre);
    let jp=jpMap[nb]||jpMap[ALIAS[nb]]||'';
    if(!jp){ let best='',bs=0; for(const [k,v] of Object.entries(jpMap)){const s_=sim(k,nb); if(s_>bs){bs=s_;best=v;}} if(bs>=0.67) jp=best; }
    if(!jp) sinJp++; total++;
    const desde=/desde:?\s*$/i.test(it.desc.trim()); it.desc=it.desc.replace(/\s*desde:?\s*$/i,'');
    items.push({sub:it.sub, nombre:titulo(it.nombre), desde, desc:it.desc.replace(/\s+,/g,',').replace(/\s+/g,' ').replace(/\s*\*?\s*(acompañar con:?|ver variedad|revisar variedad)\s*\*?\s*$/i,'').replace(/\*\s*$/,'').trim(), precio:it.precio, extra:it.extra||null, jp});
  }
  out[sec]={subs:live[sec].subs, subDesc:live[sec].subDesc, items};
}

// ---- freno: lo que tenía platos no vuelve vacío ----
// Gourmedia publica cada plato con su propia ventana horaria. Los donburis y el
// teishoku llevan enable_timer:true, 13:00–16:00, martes a jueves: un sync corrido
// a las 18:42 recibe la página SIN ellos, legítimamente. Sin este freno, sincronizar
// después de almuerzo borraba del sitio la sección Donburis entera y los 4 teishoku.
// El freno es conservador a propósito: ante una sección o subsección que se vacía,
// preferimos publicar lo de ayer y avisar fuerte antes que borrar por horario.
// Si la cocina de verdad dio de baja algo, hay que confirmarlo y sacarlo a mano.
//
// Límite conocido: si en Gourmedia RENOMBRAN una subsección, el freno ve la vieja
// vacía y la revive al lado de la nueva, y los platos quedan duplicados bajo los dos
// títulos. Se nota en el aviso y en el diff (los mismos platos salen como nuevos);
// se arregla a mano. No vale la pena detectar renombres hasta que pase una vez.
const rescatados=[];
let prev=null; try{ prev=JSON.parse(fs.readFileSync(`${D}/prev-final.json`,'utf8')); }catch(e){}
if(prev) for(const sec of SECS){
  const antes=prev[sec], ahora=out[sec];
  if(!antes||!antes.items.length) continue;
  if(!ahora.items.length){                        // la sección entera se vació
    out[sec]={subs:antes.subs, subDesc:antes.subDesc, items:antes.items};
    rescatados.push(`${sec}: la sección completa, ${antes.items.length} platos`);
    continue;
  }
  const vivos=new Set(ahora.items.map(i=>i.sub));
  const idos=[...new Set(antes.items.map(i=>i.sub))].filter(s=>!vivos.has(s));
  if(!idos.length) continue;
  // cada subsección perdida vuelve justo detrás del vecino que sí sobrevivió
  const subs=ahora.subs.slice();
  for(const sub of idos){
    let ancla=-1;
    for(let k=antes.subs.indexOf(sub)-1;k>=0;k--){ const p=subs.indexOf(antes.subs[k]); if(p>=0){ancla=p;break;} }
    subs.splice(ancla+1,0,sub);
    if(antes.subDesc[sub]!=null) ahora.subDesc[sub]=antes.subDesc[sub];
  }
  const orden=new Map(subs.map((s,i)=>[s,i]));
  const items=ahora.items.concat(antes.items.filter(i=>idos.includes(i.sub)));
  items.sort((a,b)=>(orden.has(a.sub)?orden.get(a.sub):999)-(orden.has(b.sub)?orden.get(b.sub):999));
  out[sec]={subs, subDesc:ahora.subDesc, items};
  for(const sub of idos) rescatados.push(`${sec} / ${sub}: ${antes.items.filter(i=>i.sub===sub).length} platos`);
}
if(rescatados.length){
  // stderr a propósito: sync.sh filtra el stdout de este script con sed y el aviso se perdería
  console.error('\n⚠️  FRENO: esto volvió VACÍO de Gourmedia y se conservó lo anterior:');
  rescatados.forEach(r=>console.error('    · '+r));
  console.error('    Suele ser la ventana horaria (13:00–16:00). Para confirmar una baja real,');
  console.error('    volvé a correr el sync dentro de esa franja y recién ahí sacalo a mano.\n');
}

fs.writeFileSync(`${D}/carta-final.json`,JSON.stringify(out,null,1));
total=SECS.reduce((n,s)=>n+out[s].items.length,0);   // después del freno, que puede devolver platos
console.log('duplicados:', dupList.join(' · '));
console.log(`dataset final: ${total} platos · duplicados quitados: ${dups} · sin japonés (nuevos, no se inventa): ${sinJp}`);
console.log('muestra de títulos normalizados:');
['CAVIAR URAQI','NIGIRI Ebi Miso y Umeboshi ( 1 Unid )','GUNKAN ERIZO(1unid)','SALMÓN TERIYAKI TEISHOKU','DOMAINE PELLÉ AOC SANCERRE 🇫🇷'].forEach(s=>console.log('  '+s.padEnd(40)+'→ '+titulo(s)));
console.log('Fujin/Isa JP ahora:', out.comida.items.filter(x=>/^(fujin|isa) maki/i.test(x.nombre)).map(x=>x.nombre+':'+(x.jp||'(sin)')).join(' | '));
