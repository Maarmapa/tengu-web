import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const SECS=['comida','bar','sake','vinos','por-copa','teishoku'];
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['unid','unidad','unidades','de','del','la','el','y','con','ml','cortes','piezas','mix','the']);
const toks=s=>new Set(norm(s).split(' ').filter(t=>t.length>2&&!STOP.has(t)));
const sim=(a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(A.size,B.size);};
const live=JSON.parse(fs.readFileSync(`${D}/carta-viva.json`,'utf8'));
const html=fs.readFileSync(REPO+'index.html','utf8');
const jpMap={};for(const m of html.matchAll(/menu-item-name">([^<]+)<\/div><div class="menu-item-jp">([^<]*)</g))jpMap[norm(m[1])]=m[2];
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
    if(seen.has(key)){ dups++; const prev=items[seen.get(key)]; if(it.desc.length>prev.desc.length){ prev.desc=it.desc.replace(/\s+,/g,',').replace(/\s+/g,' ').trim(); } dupList.push(sec+': '+it.nombre); continue; }
    seen.set(key, items.length);
    const nb=ALIAS[norm(it.nombre)]||norm(it.nombre);
    let jp=jpMap[nb]||'';
    if(!jp){ let best='',bs=0; for(const [k,v] of Object.entries(jpMap)){const s_=sim(k,nb); if(s_>bs){bs=s_;best=v;}} if(bs>=0.67) jp=best; }
    if(!jp) sinJp++; total++;
    const desde=/desde:?\s*$/i.test(it.desc.trim()); it.desc=it.desc.replace(/\s*desde:?\s*$/i,'');
    items.push({sub:it.sub, nombre:titulo(it.nombre), desde, desc:it.desc.replace(/\s+,/g,',').replace(/\s+/g,' ').replace(/\s*\*?\s*(acompañar con:?|ver variedad|revisar variedad)\s*\*?\s*$/i,'').replace(/\*\s*$/,'').trim(), precio:it.precio, extra:it.extra||null, jp});
  }
  out[sec]={subs:live[sec].subs, subDesc:live[sec].subDesc, items};
}
fs.writeFileSync(`${D}/carta-final.json`,JSON.stringify(out,null,1));
console.log('duplicados:', dupList.join(' · '));
console.log(`dataset final: ${total} platos · duplicados quitados: ${dups} · sin japonés (nuevos, no se inventa): ${sinJp}`);
console.log('muestra de títulos normalizados:');
['CAVIAR URAQI','NIGIRI Ebi Miso y Umeboshi ( 1 Unid )','GUNKAN ERIZO(1unid)','SALMÓN TERIYAKI TEISHOKU','DOMAINE PELLÉ AOC SANCERRE 🇫🇷'].forEach(s=>console.log('  '+s.padEnd(40)+'→ '+titulo(s)));
console.log('Fujin/Isa JP ahora:', out.comida.items.filter(x=>/^(fujin|isa) maki/i.test(x.nombre)).map(x=>x.nombre+':'+(x.jp||'(sin)')).join(' | '));
