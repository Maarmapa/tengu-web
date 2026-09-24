// Galería de la barra, con la geometría medida en la ficha de Omakase:
// la celda grande mide exactamente el doble de una chica en ancho y alto,
// todas comparten proporción 3:2 y el gap es de 4px. Así las fotos descansan
// entre sí en vez de pelearse. Acá funciona porque son recortes apaisados;
// con las verticales de la carta el mismo mosaico daría 933px de alto.
//
// Las cinco primeras se ven en la grilla; las demás viven en el visor y el
// botón anuncia el total. Cambiar una foto es cambiar una línea de esta lista.
//
// Cada entrada es [recorte, alt, original]: la grilla usa el recorte apaisado y
// el visor abre el cuadro entero (v-*), porque ampliar una foto para volver a
// verla cortada no tiene sentido.
export const GALERIA = [
  ['g-barra-pescados', 'El pescado del día dispuesto en la barra', 'salon-ventanal'],
  ['g-barra-montaje',  'El itamae montando el servicio',           'barra-montaje'],
  ['g-chirashi',       'Kaisen: pesca y mariscos del día',         'chirashi'],
  ['g-donburi',        'Donburi de pesca del día',                 'donburi'],
  ['g-yakitori',       'Brochetas de la robata',                   'yakitori'],
  // La nube sale por ahora: es la más fría del lote (luz de día del ventanal) y
  // al acercarla al set el papel crema se iba a naranja. Vuelve cuando haya una
  // foto suya propia, no un recorte del fondo de otra.
  ['g-robata',         'La robata en servicio',                    'robata'],
];
export const VISIBLES = 5;

export function hazGaleria(FOTOS, esc){
  const ss = f => { const a=FOTOS[f+'-800.jpg'], b=FOTOS[f+'.jpg'], o=[];
    if(a) o.push(`fotos/${f}-800.jpg ${a[0]}w`);
    if(b && (!a||b[0]!==a[0])) o.push(`fotos/${f}.jpg ${b[0]}w`);
    return o.join(', '); };
  const todas = GALERIA.filter(([f]) => FOTOS[f+'.jpg']);
  if(todas.length < 3) return '';
  const vis = todas.slice(0, VISIBLES);
  const celdas = vis.map(([f,alt],i)=>{
    const grande = i===0;
    const sizes = grande ? '(max-width:900px) 100vw, 50vw' : '(max-width:900px) 50vw, 25vw';
    return `<button class="gal-celda${grande?' gal-grande':''}" type="button" data-i="${i}" aria-label="Ver ${esc(alt)}">`
      + `<img loading="lazy" src="fotos/${f}.jpg" srcset="${ss(f)}" sizes="${sizes}" alt="${esc(alt)}">`
      + (i===vis.length-1 && todas.length>vis.length ? `<span class="mz-todas">Ver las ${todas.length}</span>` : '')
      + `</button>`;
  }).join('');
  const datos = JSON.stringify(todas.map(([f,alt,orig])=>{
    const o = {s:`fotos/${f}.jpg`, a:alt};
    if(orig && FOTOS['v-'+orig+'.jpg']) o.f = `fotos/v-${orig}.jpg`;   // el visor abre la entera
    return o;
  })).replace(/'/g,'&#39;');
  return `<!--GAL-INI-->
<section class="galeria" id="galeria">
  <div class="gal-head"><p class="sec-tag">La barra</p><h2 class="sec-title">El pescado, a la vista</h2><div class="gold-line" style="margin-left:0"></div></div>
  <div class="mz gal" data-fotos='${datos}'>${celdas}</div>
</section>
<!--GAL-FIN-->`;
}

export const CSS_GALERIA = `
/*GAL-CSS-INI*/
.galeria{padding:0 48px 76px;background:var(--dark)}
.gal-head{margin-bottom:22px}
.gal{display:grid;gap:4px;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:3/1;max-width:100%}
.gal-celda{position:relative;overflow:hidden;padding:0;border:0;background:var(--dark2);cursor:pointer;display:block}
.gal-celda img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.9);transition:filter .4s,transform .6s}
.gal-celda:hover img{filter:brightness(1);transform:scale(1.03)}
.gal-grande{grid-row:1/3}
@media(max-width:900px){
  .galeria{padding:0 18px 52px}
  .gal{grid-template-columns:1fr 1fr;grid-template-rows:auto;aspect-ratio:auto}
  .gal-grande{grid-column:1/3;grid-row:auto;aspect-ratio:3/2}
  .gal-celda:not(.gal-grande){aspect-ratio:3/2}
}
/*GAL-CSS-FIN*/`;
