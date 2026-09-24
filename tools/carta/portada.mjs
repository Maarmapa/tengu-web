// Cabecera de sección con la geometría medida en la ficha de Omakase: la celda
// grande mide exactamente el doble de una chica en ancho y alto, todas comparten
// proporción 3:2 y el gap es de 4px. Así las fotos descansan entre sí.
//
// Con fotos verticales esa misma geometría daría 933px de alto a ancho completo;
// por eso las de sección se recortan apaisadas (los archivos s-*).
//
// Solo se arman disposiciones que embaldosan sin dejar huecos: 2, 3 y 5 celdas.
// Una sección con 4 fotos muestra 3 y la cuarta queda en el visor, igual que el
// "Show all photos (6)" de la referencia sobre cinco visibles.
//
// Qué foto va en qué sección se decide a nivel de SECCIÓN, nunca de plato: a
// nivel de plato no se puede afirmar —edamame tiene dos candidatos en la carta,
// gyozas cuatro, las almejas seis— y una foto en el plato equivocado es una
// promesa falsa al comensal.
export const PORTADA = {
  comenzar: [['s-uni-ikura','Erizo de Caldera, ikura y trufa'],['s-tartar','Tartar sobre brioche'],
             ['s-gyozas','Gyozas'],['s-edamame','Edamame']],
  sashimi:  [['s-tiradito','Usuzukuri con pétalos y cítricos'],['s-usuzukuri','Usuzukuri con jalapeño'],
             ['s-almejas-canasto','Mariscos frescos del día'],['s-almejas-hielo','Almejas sobre hielo']],
  nigiris:  [['s-nigiri-trufa','Nigiri omakase con trufa'],['s-nigiris-barra','Nigiris de la barra']],
  caliente: [['s-okonomiyaki','Okonomiyaki'],['s-almejas-grat','Gratinados de la cocina caliente'],
             ['s-donburi','Donburi de pesca del día'],['s-chirashi','Kaisen don'],
             ['s-almejas-limon','Asari al sake']],
};
// cuántas se muestran según cuántas haya: solo 2, 3 y 5 embaldosan sin huecos
const VISIBLES = n => n>=5 ? 5 : n>=3 ? 3 : n;

export function hazPortada(id, label, n, FOTOS, esc){
  const lista = PORTADA[id]; if(!lista) return '';
  const ss = f => { const a=FOTOS[f+'-800.jpg'], b=FOTOS[f+'.jpg'], o=[];
    if(a) o.push(`fotos/${f}-800.jpg ${a[0]}w`);
    if(b && (!a||b[0]!==a[0])) o.push(`fotos/${f}.jpg ${b[0]}w`);
    return o.join(', '); };
  const todas = lista.filter(([f]) => FOTOS[f+'.jpg']);
  if(!todas.length) return '';
  const vis = todas.slice(0, VISIBLES(todas.length));
  const celdas = vis.map(([f,alt],i)=>{
    const grande = vis.length>2 && i===0;
    const sizes = grande ? '(max-width:900px) 100vw, 50vw' : '(max-width:900px) 50vw, 25vw';
    return `<button class="mz-celda${grande?' mz-grande':''}" type="button" data-i="${i}" aria-label="Ver ${esc(alt)}">`
      + `<img loading="lazy" src="fotos/${f}.jpg" srcset="${ss(f)}" sizes="${sizes}" alt="${esc(alt)}">`
      + (i===vis.length-1 && todas.length>vis.length ? `<span class="mz-todas">Ver las ${todas.length}</span>` : '')
      + `</button>`;
  }).join('');
  const datos = JSON.stringify(todas.map(([f,alt])=>({s:`fotos/${f}.jpg`,a:alt}))).replace(/'/g,'&#39;');
  return `<div class="menu-portada">
  <div class="mp-txt"><h2>${esc(label)}</h2><p>${n} platos</p></div>
  <div class="mz mz-n${vis.length}" data-fotos='${datos}'>${celdas}</div>
</div>`;
}

export const CSS_PORTADA = `
/*MZ-INI*/
.menu-portada{padding:2px 2px 22px;border-bottom:1px solid rgba(200,146,26,.12);margin-bottom:8px}
.mp-txt h2{font-family:var(--font-d);font-size:clamp(26px,5vw,44px);font-weight:300;color:var(--cream);line-height:1;margin:0}
.mp-txt p{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(200,146,26,.75);margin:10px 0 16px}
.mz{display:grid;gap:4px}
.mz-n2{grid-template-columns:1fr 1fr;aspect-ratio:3/1}
.mz-n3{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:2.25/1}
.mz-n5{grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:3/1}
.mz-grande{grid-row:1/3}
.mz-celda{position:relative;overflow:hidden;padding:0;border:0;background:var(--dark2);cursor:pointer;display:block}
.mz-celda img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.9);transition:filter .4s,transform .6s}
.mz-celda:hover img{filter:brightness(1);transform:scale(1.03)}
.mz-todas{position:absolute;right:8px;bottom:8px;background:rgba(6,5,3,.78);color:var(--cream);
          font-family:var(--font-m);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;padding:7px 11px}
.mz-visor{position:fixed;inset:0;background:rgba(6,5,3,.96);z-index:9999;display:none;align-items:center;justify-content:center}
.mz-visor.abierto{display:flex}
.mz-visor img{max-width:92vw;max-height:84vh;object-fit:contain}
.mz-visor button{position:absolute;background:none;border:0;color:var(--cream);font-size:30px;cursor:pointer;padding:16px;line-height:1}
.mz-prev{left:2vw}.mz-next{right:2vw}.mz-cerrar{top:1vw;right:2vw;font-size:24px}
.mz-pie{position:absolute;bottom:4vh;left:0;right:0;text-align:center;color:var(--cream2);
        font-family:var(--font-m);font-size:9px;letter-spacing:.18em}
@media(max-width:900px){
  .mz-n2,.mz-n3,.mz-n5{grid-template-columns:1fr 1fr;grid-template-rows:auto;aspect-ratio:auto}
  .mz-grande{grid-column:1/3;grid-row:auto;aspect-ratio:3/2}
  .mz-celda:not(.mz-grande){aspect-ratio:3/2}
}
/*MZ-FIN*/`;

export const JS_PORTADA = `
/*MZJS-INI*/
(function(){
  var v=document.createElement('div'); v.className='mz-visor';
  v.innerHTML='<button class="mz-prev" aria-label="Anterior">&#8249;</button><img alt=""><button class="mz-next" aria-label="Siguiente">&#8250;</button><button class="mz-cerrar" aria-label="Cerrar">&#10005;</button><div class="mz-pie"></div>';
  document.body.appendChild(v);
  var img=v.querySelector('img'), pie=v.querySelector('.mz-pie'), lista=[], i=0;
  function pinta(){ var f=lista[i]; if(!f) return; img.src=f.s; img.alt=f.a; pie.textContent=(i+1)+' / '+lista.length+'  ·  '+f.a; }
  function abre(fs,n){ lista=fs; i=n; pinta(); v.classList.add('abierto'); document.body.style.overflow='hidden'; }
  function cierra(){ v.classList.remove('abierto'); document.body.style.overflow=''; }
  function mueve(d){ i=(i+d+lista.length)%lista.length; pinta(); }
  document.querySelectorAll('.mz').forEach(function(m){
    var fs; try{ fs=JSON.parse(m.dataset.fotos); }catch(e){ return; }
    m.querySelectorAll('.mz-celda,.gal-celda').forEach(function(c){
      c.addEventListener('click', function(){ abre(fs, +c.dataset.i || 0); });
    });
  });
  v.querySelector('.mz-prev').addEventListener('click', function(e){ e.stopPropagation(); mueve(-1); });
  v.querySelector('.mz-next').addEventListener('click', function(e){ e.stopPropagation(); mueve(1); });
  v.querySelector('.mz-cerrar').addEventListener('click', cierra);
  v.addEventListener('click', function(e){ if(e.target===v) cierra(); });
  document.addEventListener('keydown', function(e){
    if(!v.classList.contains('abierto')) return;
    if(e.key==='Escape') cierra(); else if(e.key==='ArrowLeft') mueve(-1); else if(e.key==='ArrowRight') mueve(1);
  });
})();
/*MZJS-FIN*/`;
