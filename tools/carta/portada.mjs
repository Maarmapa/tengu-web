// Mosaico de fotos por sección: una grande que fija la altura y hasta cuatro
// chicas al costado, a ras, como las fichas de restaurante de Omakase/Airbnb.
// Se adapta a cuántas fotos tenga la sección — no todas tienen cinco.
//
// Qué foto va en qué sección se decide a nivel de SECCIÓN, nunca de plato:
// a nivel de plato no se puede afirmar (edamame tiene dos candidatos en la
// carta, gyozas cuatro, las almejas seis), y una foto pegada al plato
// equivocado es una promesa falsa al comensal.
export const PORTADA = {
  comenzar: { titulo:'Para Comenzar', fotos:[
    ['uni-ikura-trufa','Erizo de Caldera, ikura y trufa'],
    ['tartar-mora','Tartar sobre brioche'],
    ['gyozas','Gyozas'],
    ['edamame','Edamame'],
  ]},
  sashimi: { titulo:'Sashimi', fotos:[
    ['tiradito-petalos','Usuzukuri con pétalos y cítricos'],
    ['usuzukuri-jalapeno','Usuzukuri de pescado blanco con jalapeño'],
    ['almejas-canasto','Mariscos frescos del día'],
    ['almejas-hielo','Almejas sobre hielo'],
  ]},
  nigiris: { titulo:'Nigiris', fotos:[
    ['nigiri-trufa','Nigiri omakase con trufa'],
    ['nigiris-barra','Nigiris de la barra'],
  ]},
  caliente: { titulo:'Cocina Caliente', fotos:[
    ['okonomiyaki','Okonomiyaki'],
    ['almejas-gratinadas','Gratinados de la cocina caliente'],
    ['donburi','Donburi de pesca del día'],
    ['chirashi','Kaisen don'],
    ['almejas-limon','Asari al sake'],
  ]},
};

export function hazPortada(id, label, n, FOTOS, esc){
  const p = PORTADA[id]; if(!p) return '';
  const srcset = f => { const a=FOTOS[f+'-800.jpg'], b=FOTOS[f+'.jpg'], out=[];
    if(a) out.push(`fotos/${f}-800.jpg ${a[0]}w`);
    if(b && (!a || b[0]!==a[0])) out.push(`fotos/${f}.jpg ${b[0]}w`);
    return out.join(', '); };
  const fotos = p.fotos.filter(([f]) => FOTOS[f+'.jpg']).slice(0,5);
  if(!fotos.length) return '';
  const celda = ([f,alt], i) => {
    const grande = i===0;
    const sizes = grande ? '(max-width:720px) 100vw, 46vw' : '(max-width:720px) 50vw, 23vw';
    const ultima = i===fotos.length-1 && fotos.length>1;
    return `<button class="mz-celda${grande?' mz-grande':''}" type="button" data-i="${i}" aria-label="Ver ${esc(alt)}">`
      + `<img loading="lazy" src="fotos/${f}.jpg" srcset="${srcset(f)}" sizes="${sizes}" alt="${esc(alt)}">`
      + (ultima ? `<span class="mz-todas">Ver las ${fotos.length}</span>` : '') + `</button>`;
  };
  const datos = JSON.stringify(fotos.map(([f,alt])=>({s:`fotos/${f}.jpg`,a:alt})));
  return `<div class="menu-portada">
  <div class="mp-txt"><h2>${esc(label)}</h2><p>${n} platos</p></div>
  <div class="mz mz-n${fotos.length}" data-fotos='${datos.replace(/'/g,"&#39;")}'>${fotos.map(celda).join('')}</div>
</div>`;
}

export const CSS_PORTADA = `
/*MZ-INI*/
.menu-portada{padding:2px 2px 22px;border-bottom:1px solid rgba(200,146,26,.12);margin-bottom:8px}
.mp-txt h2{font-family:var(--font-d);font-size:clamp(26px,5vw,44px);font-weight:300;color:var(--cream);line-height:1;margin:0}
.mp-txt p{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(200,146,26,.75);margin:10px 0 16px}
/* Todas las fotos de Allan son verticales. Un mosaico ancho tipo Airbnb las
   recortaría a una franja, y con 4 dejaba un hueco en la grilla de 3x2. Van en
   tiras verticales parejas: misma proporción que la foto, cero recorte, sin huecos.
   El ancho se limita para que con 2 fotos no queden gigantes. */
.mz{display:grid;gap:5px;grid-template-columns:repeat(var(--n),1fr);max-width:min(100%,calc(var(--n) * 310px))}
.mz-n1{--n:1}.mz-n2{--n:2}.mz-n3{--n:3}.mz-n4{--n:4}.mz-n5{--n:5}
.mz-celda{position:relative;overflow:hidden;padding:0;border:0;background:var(--dark2);cursor:pointer;display:block;aspect-ratio:3/4}
.mz-celda img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.88);transition:filter .4s,transform .6s}
.mz-celda:hover img{filter:brightness(1);transform:scale(1.04)}
.mz-todas{position:absolute;right:8px;bottom:8px;background:rgba(6,5,3,.78);color:var(--cream);
          font-family:var(--font-m);font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;padding:7px 11px}
/* visor */
.mz-visor{position:fixed;inset:0;background:rgba(6,5,3,.96);z-index:9999;display:none;align-items:center;justify-content:center}
.mz-visor.abierto{display:flex}
.mz-visor img{max-width:92vw;max-height:84vh;object-fit:contain}
.mz-visor button{position:absolute;background:none;border:0;color:var(--cream);font-size:30px;cursor:pointer;padding:16px;line-height:1}
.mz-prev{left:2vw}.mz-next{right:2vw}.mz-cerrar{top:1vw;right:2vw;font-size:24px}
.mz-pie{position:absolute;bottom:4vh;left:0;right:0;text-align:center;color:var(--cream2);
        font-family:var(--font-m);font-size:9px;letter-spacing:.18em}
@media(max-width:720px){
  .mz{grid-template-columns:1fr 1fr;max-width:100%}
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
    m.querySelectorAll('.mz-celda').forEach(function(c){
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
