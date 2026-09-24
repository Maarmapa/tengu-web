#!/usr/bin/env python3
"""Genera las fotos que abre el visor: el cuadro ENTERO, no el recorte del mosaico.

El mosaico necesita recortes apaisados y acotados —en los platos redondos el
contenido se corta arriba a propósito— pero ampliar una foto para volver a verla
cortada no tiene sentido: el visor tiene que mostrar el plato completo, como lo
hace la ficha de Omakase que sirvió de referencia.

Los archivos v-* son el original entero con la misma corrección de color que
llevan los recortes (hacia cal +45 / luz 112, con tope), para que no salte el
color al abrir la foto.
"""
import os, sys
from PIL import Image, ImageOps, ImageStat

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FOTOS = os.path.normpath(os.path.join(WEB, 'fotos'))

# Los mismos números que igualaron el set de la galería. El tope existe porque
# sin él la foto más fría del lote se iba a naranja y el papel crema del set
# dejaba de ser crema.
CAL, LUZ = 45.0, 112.0
TOPE_CAL, TOPE_LUZ_MIN, TOPE_LUZ_MAX = 12.0, 0.88, 1.28
LADO, CALIDAD = 1600, 82

# recorte del mosaico -> original entero
ORIGEN = {
    's-uni-ikura': 'uni-ikura-trufa',   's-tartar': 'tartar-mora',
    's-gyozas': 'gyozas',               's-edamame': 'edamame',
    's-tiradito': 'tiradito-petalos',   's-usuzukuri': 'usuzukuri-jalapeno',
    's-almejas-canasto': 'almejas-canasto', 's-almejas-hielo': 'almejas-hielo',
    's-nigiri-trufa': 'nigiri-trufa',   's-nigiris-barra': 'nigiris-barra',
    's-okonomiyaki': 'okonomiyaki',     's-almejas-grat': 'almejas-gratinadas',
    's-donburi': 'donburi',             's-chirashi': 'chirashi',
    's-almejas-limon': 'almejas-limon',
    'g-barra-pescados': 'salon-ventanal', 'g-barra-montaje': 'barra-montaje',
    'g-chirashi': 'chirashi',           'g-donburi': 'donburi',
    'g-yakitori': 'yakitori',           'g-robata': 'robata',
}


def medir(im):
    r, g, b = ImageStat.Stat(im).mean
    return r - b, 0.299 * r + 0.587 * g + 0.114 * b


def iguala(im):
    cal, luz = medir(im)
    d = max(-TOPE_CAL, min(TOPE_CAL, CAL - cal)) / 2.0
    k = max(TOPE_LUZ_MIN, min(TOPE_LUZ_MAX, LUZ / luz)) if luz > 1 else 1.0
    lut_r = [min(255, max(0, round(v * k + d))) for v in range(256)]
    lut_g = [min(255, max(0, round(v * k))) for v in range(256)]
    lut_b = [min(255, max(0, round(v * k - d))) for v in range(256)]
    return im.point(lut_r + lut_g + lut_b)


def main():
    hechas, faltan = [], []
    for corte, orig in sorted(ORIGEN.items()):
        src = os.path.join(FOTOS, orig + '.jpg')
        if not os.path.exists(src):
            faltan.append(orig)
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        w, h = im.size
        if max(w, h) > LADO:
            k = LADO / max(w, h)
            im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        dst = os.path.join(FOTOS, 'v-' + orig + '.jpg')
        iguala(im).save(dst, 'JPEG', quality=CALIDAD, optimize=True, progressive=True)
        if 'v-' + orig not in [x[0] for x in hechas]:
            hechas.append(('v-' + orig, im.size))
    for n, s in hechas:
        print('  %-24s %dx%d' % (n, s[0], s[1]))
    if faltan:
        print('FALTAN originales: ' + ', '.join(sorted(set(faltan))), file=sys.stderr)
        return 1
    print('%d fotos enteras para el visor' % len(hechas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
