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
node extraer.mjs data | head -9
node final.mjs data | sed -n '2p'
# El diff va ANTES de escribir el sitio: es el control humano, y hasta acá index.html
# todavía es el de la corrida anterior por si hay que volver atrás.
node diff.mjs data
node generar.mjs data
node oraculo.mjs data
node index-carta.mjs data
echo "→ carta.html, index.html y api/_carta.js regenerados. Detalle en data/diff-ultima-corrida.json."
echo "  Si salió el aviso ⚠️ FRENO, algo volvió vacío de Gourmedia y se conservó lo anterior: revisalo antes de commitear."
