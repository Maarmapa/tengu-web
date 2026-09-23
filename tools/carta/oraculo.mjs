// Genera api/_carta.js (lo que el Oráculo recibe como contexto) desde el dataset vivo.
import fs from 'node:fs';
const D=process.argv[2]; const REPO=new URL('../../',import.meta.url).pathname;
const data=JSON.parse(fs.readFileSync(`${D}/carta-final.json`,'utf8'));
const index=fs.readFileSync(REPO+'index.html','utf8');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const chefSet=new Set(); for(const m of index.matchAll(/menu-item-name">([^<]+)<\/div>[\s\S]{0,700}?menu-item-yokai">Recomendación del chef</g)) chefSet.add(norm(m[1]));
const ALIAS={'nigiri hirame omakase':'nigiri pez de isla','usuzukuri hirame':'usuzukuri pescado de isla','usuzukuri sakana uni':'usuzukuri awabi uni'};
const subTitulo=s=>s.replace(/\(\s*1\s*Unid\s*\)/i,'(1 unid.)').replace(/\s+/g,' ').trim().split(' ').map(w=>w===w.toUpperCase()&&w.length>2?w[0]+w.slice(1).toLowerCase():w).join(' ').replace(/^Almuerzo clasico Japones.*$/,'Almuerzo clásico japonés (mar-jue, solo almuerzo)');
const SEC=[['comida','Comida'],['bar','Barra'],['por-copa','Vinos por copa'],['sake','Sake'],['vinos','Vinos'],['teishoku','Teishoku']];
const out=[]; const hoy=new Date().toISOString().slice(0,10);
for(const [k,label] of SEC) for(const it of data[k].items){
  const chef=chefSet.has(ALIAS[norm(it.nombre)]||norm(it.nombre));
  out.push({n:it.nombre,c:subTitulo(it.sub),s:label,p:it.precio==null?'Consultar':(it.desde?'desde ':'')+'$'+it.precio.toLocaleString('es-CL'),d:it.desc||'',...(chef?{chef:true}:{})});
}
fs.writeFileSync(REPO+'api/_carta.js',`// Carta oficial de Tengu — sincronizada desde Gourmedia el ${hoy}.\n// Generado por tools/carta/oraculo.mjs; no editar a mano.\nmodule.exports = ${JSON.stringify(out)};\n`);
console.log('api/_carta.js:',out.length,'platos ·',[...new Set(out.map(x=>x.s))].join(' | '),'· chef★:',out.filter(x=>x.chef).length);
