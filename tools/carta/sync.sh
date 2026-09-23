#!/bin/sh
# Re-sincroniza la carta nativa con la carta viva de la cocina (gour.media/tengu).
# Uso: tools/carta/sync.sh   → baja las 6 secciones, extrae, compara con la última
# extracción guardada y regenera carta.html. Revisar el diff ANTES de commitear.
set -e
cd "$(dirname "$0")"
[ -f data/carta-final.json ] && cp data/carta-final.json data/prev-final.json
for s in comida bar sake vinos por-copa teishoku; do
  curl -s -m 30 "https://gour.media/tengu/$s/" -o "data/raw-$s.html"
done
node extraer.mjs data | head -8
node final.mjs data | sed -n '2p'
node generar.mjs data
node diff.mjs data | tail -3
echo "→ carta.html regenerada. Diff completo vs 28-ago en data/diff-28ago-vs-23sep.json; comparar data/prev-final.json vs data/carta-final.json para el cambio desde la última corrida."
