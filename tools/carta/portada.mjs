// Cabecera de sección: una fila justificada, como las de una galería de fotos.
// Todas las baldosas van al MISMO ALTO y el ancho lo decide la proporción de cada
// foto, así que ninguna se recorta.
//
// Antes acá estaba la geometría de Omakase —celda grande del doble, todas a 3:2—
// copiada de su ficha. Se veía mal por una razón que solo aparece al medirla:
// Omakase dispara apaisado nativo (1042x620) y las fotos de Tengu son verticales
// de teléfono (1200x1600). Para llegar a 3:2 había que botar la mitad de la foto a
// lo alto y encima ampliarla un 33%, y en un plato redondo visto desde arriba esa
// mitad es el plato. Los recortes s-* que hacían falta para eso ya no existen.
//
// La galería de la barra sí mantiene aquella geometría: sus fotos son escenas —la
// barra, la robata, el pescado en el mesón— y una franja horizontal de una escena
// se sigue leyendo. Un plato cortado, no.
//
// Qué foto va en qué sección se decide a nivel de SECCIÓN, nunca de plato: a nivel
// de plato no se puede afirmar —edamame tiene dos candidatos en la carta, gyozas
// cuatro, las almejas seis— y una foto en el plato equivocado es una promesa falsa
// al comensal.
//
// Cada entrada es [foto, alt]. La baldosa usa t-* (~900px) y el visor v-* (~1600px).
export const PORTADA = {
  comenzar: [['uni-ikura-trufa','Erizo de Caldera, ikura y trufa'],['tartar-mora','Tartar sobre brioche'],
             ['gyozas','Gyozas'],['edamame','Edamame']],
  sashimi:  [['tiradito-petalos','Usuzukuri con pétalos y cítricos'],['usuzukuri-jalapeno','Usuzukuri con jalapeño'],
             ['almejas-canasto','Mariscos frescos del día'],['almejas-hielo','Almejas sobre hielo']],
  nigiris:  [['nigiri-trufa','Nigiri omakase con trufa'],['nigiris-barra','Nigiris de la barra'],
             ['nigiris-pase','El itamae montando los nigiris']],
  caliente: [['okonomiyaki','Okonomiyaki'],['almejas-gratinadas','Gratinados de la cocina caliente'],
             ['donburi','Donburi de pesca del día'],['chirashi','Kaisen don'],
             ['almejas-limon','Asari al sake']],
};
// La fila justificada no deja huecos con ninguna cantidad, así que se muestran
// todas. Con más de cinco habría que partirla en dos renglones; hoy no pasa.
const VISIBLES = 5;

// Excepción: la sección que va con el mosaico de la galería —celda grande más cuatro
// chicas— en vez de la fila. El mosaico recorta, así que solo sirve donde el recorte
// no se come el plato, y eso depende de las fotos, no de la sección: hace falta una
// foto apaisada para la celda grande y platos que aguanten el 3:2 en las chicas.
// Cocina Caliente cumple porque el donburi y el chirashi son casi cuadrados.
// El valor es la foto que va de grande; el resto la sigue en orden.
const MOSAICO = { caliente: 'donburi' };

export function hazPortada(id, label, n, FOTOS, esc){
  const lista = PORTADA[id]; if(!lista) return '';
  const todas = lista.filter(([f]) => FOTOS['t-'+f+'.jpg']);
  if(!todas.length) return '';
  let vis = todas.slice(0, VISIBLES);
  // Mosaico: la foto elegida va primera, en la celda grande.
  const mosaico = MOSAICO[id] && vis.length === 5 && vis.some(([f])=>f===MOSAICO[id]);
  if(mosaico){
    const g = vis.find(([f])=>f===MOSAICO[id]);
    vis = [g, ...vis.filter(x=>x!==g)];
  }
  // Con dos fotos verticales la fila no llena el ancho ni estirándola (necesitaría
  // 874px de alto), y queda medio renglón de negro que se lee como que faltan fotos.
  // Ahí el título se corre al lado y las baldosas van a su proporción exacta.
  const duo = !mosaico && vis.length <= 2;
  // Fila: flex-grow proporcional a la proporción de cada foto. Con flex-basis 0 el
  // ancho termina siendo exactamente alto × proporción, así la fila cierra justa y
  // ninguna foto necesita recorte.
  const celdas = vis.map(([f,alt],i)=>{
    const [w,h] = FOTOS['t-'+f+'.jpg'];
    const ar = (w/h).toFixed(3);
    const caja = mosaico ? '' : (duo ? `flex:0 0 auto;aspect-ratio:${ar}` : `flex:${ar} 1 0`);
    const clase = 'mz-celda' + (mosaico && i===0 ? ' mz-grande' : '');
    return `<button class="${clase}" type="button" data-i="${i}"${caja?` style="${caja}"`:''} aria-label="Ver ${esc(alt)}">`
      + `<img loading="lazy" src="fotos/t-${f}.jpg" width="${w}" height="${h}" alt="${esc(alt)}">`
      + (i===vis.length-1 && todas.length>vis.length ? `<span class="mz-todas">Ver las ${todas.length}</span>` : '')
      + `</button>`;
  }).join('');
  const datos = JSON.stringify(todas.map(([f,alt])=>{
    const o = {s:`fotos/t-${f}.jpg`, a:alt};
    if(FOTOS['v-'+f+'.jpg']) o.f = `fotos/v-${f}.jpg`;   // el visor abre la grande
    return o;
  })).replace(/'/g,'&#39;');
  // La proporción de la fila entera es la SUMA de las proporciones. Puesta como
  // aspect-ratio en el contenedor, el alto sale del ancho disponible y cada baldosa
  // queda exactamente en su propia proporción a cualquier tamaño de pantalla.
  // Con un alto fijo en CSS las dos restricciones se peleaban —la fila medía 378px
  // pero los anchos correspondían a 396— y esa diferencia se la comía el recorte.
  const suma = vis.reduce((a,[f])=>{const [w,h]=FOTOS['t-'+f+'.jpg']; return a+w/h;},0);
  const caja = (mosaico || duo) ? '' : ` style="aspect-ratio:${suma.toFixed(3)}"`;
  return `<div class="menu-portada${duo?' mp-duo':''}">
  <div class="mp-txt"><h2>${esc(label)}</h2><p>${n} platos</p></div>
  <div class="mz${mosaico?' mz-mosaico':''}"${caja} data-fotos='${datos}'>${celdas}</div>
</div>`;
}

export const CSS_PORTADA = `
/*MZ-INI*/
.menu-portada{padding:2px 2px 22px;border-bottom:1px solid rgba(200,146,26,.12);margin-bottom:8px}
.mp-txt h2{font-family:var(--font-d);font-size:clamp(26px,5vw,44px);font-weight:300;color:var(--cream);line-height:1;margin:0}
.mp-txt p{font-family:var(--font-m);font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(200,146,26,.75);margin:10px 0 16px}
/* Fila justificada. El aspect-ratio del contenedor y el flex-grow de cada baldosa
   se calculan al generar, a partir de las proporciones reales de las fotos, y entre
   los dos hacen que ninguna se recorte a ningún ancho de pantalla. El max-height
   es para que en una pantalla angosta la fila no se coma la vista. */
.mz{display:flex;gap:4px;justify-content:center;max-height:74vh}
/* Mosaico: la misma geometría que la galería de la barra —celda grande del doble en
   ancho y alto, todas a 3:2—. Recorta, así que va solo donde el recorte no se come
   el plato; lo decide MOSAICO en este archivo, no el CSS. */
.mz-mosaico{display:grid;gap:4px;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:3;max-height:none}
.mz-mosaico .mz-grande{grid-row:1/3}
/* Dos fotos verticales no llenan el ancho ni estirándolas: la fila necesitaría 874px
   de alto. Ahí el título se corre al lado y las baldosas van a su proporción exacta. */
.mp-duo{display:flex;gap:34px;align-items:flex-end}
.mp-duo .mp-txt{flex:1 1 auto;padding-bottom:6px}
.mp-duo .mz{flex:0 0 auto;justify-content:flex-end;height:clamp(200px,30vw,430px)}

.mz-celda{position:relative;overflow:hidden;padding:0;border:0;background:var(--dark2);cursor:pointer;display:block;min-width:0}
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
/* En el teléfono la fila justificada dejaría baldosas de 60px de ancho, así que
   pasa a dos columnas verticales: la proporción 3/4 es la de casi todas las fotos,
   o sea que ahí tampoco se recorta casi nada. */
@media(max-width:900px){
  .mp-duo{display:block}
  .mp-duo .mz{justify-content:center;height:auto}
  .mz{flex-wrap:wrap;max-height:none;aspect-ratio:auto!important}
  .mz-mosaico{display:flex}
  .mz-celda{flex:0 0 calc(50% - 2px)!important;aspect-ratio:3/4!important}
  .mz-mosaico .mz-grande{grid-row:auto;flex-basis:100%!important;aspect-ratio:3/2!important}
}
/*MZ-FIN*/`;

export const JS_PORTADA = `
/*MZJS-INI*/
(function(){
  var v=document.createElement('div'); v.className='mz-visor';
  v.innerHTML='<button class="mz-prev" aria-label="Anterior">&#8249;</button><img alt=""><button class="mz-next" aria-label="Siguiente">&#8250;</button><button class="mz-cerrar" aria-label="Cerrar">&#10005;</button><div class="mz-pie"></div>';
  document.body.appendChild(v);
  var img=v.querySelector('img'), pie=v.querySelector('.mz-pie'), lista=[], i=0;
  function pinta(){ var f=lista[i]; if(!f) return; img.src=f.f||f.s; img.alt=f.a; pie.textContent=(i+1)+' / '+lista.length+'  ·  '+f.a; }
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
