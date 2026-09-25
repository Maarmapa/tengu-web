#!/usr/bin/env python3
"""Genera las fotos de las secciones de la carta: el cuadro ENTERO, sin recortar.

Antes el mosaico pedía recortes apaisados de 1,5 (los archivos s-*). Las fotos de
Tengu son verticales de 1200x1600, así que para llegar a ese 1,5 había que botar la
mitad de la foto a lo alto y encima ampliarla un 33%. En un plato redondo visto
desde arriba esa mitad ES el plato, y por eso salían cortados. La referencia de
Omakase funciona con esa geometría porque ellos disparan apaisado nativo.

La fila justificada que los reemplaza no recorta nada: todas las fotos van al mismo
alto y el ancho lo decide cada una. Por eso acá salen enteras, en dos tamaños:

    t-*   ~900 px, para las baldosas de la fila
    v-*  ~1600 px, para el visor a pantalla completa

Las dos llevan la misma corrección de color que igualó el set de la galería (hacia
cal +45 / luz 112, con tope), así que no salta el color al abrir una foto.
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
CALIDAD = 82
LADO_VISOR = 1600   # v-*: el visor llega a 92vw × 84vh
LADO_BALDOSA = 900  # t-*: la baldosa mide ~330 CSS px, o sea 660 en retina

# Fotos que usan las secciones de la carta y la galería de la barra. La galería sigue
# con sus recortes g-* apaisados —ahí funcionan, porque son escenas y no platos— y de
# acá solo saca la foto entera para el visor.
ORIGEN = [
    'uni-ikura-trufa', 'tartar-mora', 'gyozas', 'edamame',
    'tiradito-petalos', 'usuzukuri-jalapeno', 'almejas-canasto', 'almejas-hielo',
    'nigiri-trufa', 'nigiris-barra',
    'okonomiyaki', 'almejas-gratinadas', 'donburi', 'chirashi', 'almejas-limon',
    'salon-ventanal', 'barra-montaje', 'yakitori', 'robata',
]


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


def escala(im, lado):
    w, h = im.size
    if max(w, h) <= lado:
        return im
    k = lado / max(w, h)
    return im.resize((round(w * k), round(h * k)), Image.LANCZOS)


def main():
    hechas, faltan = [], []
    for orig in sorted(set(ORIGEN)):
        src = os.path.join(FOTOS, orig + '.jpg')
        if not os.path.exists(src):
            faltan.append(orig)
            continue
        base = iguala(ImageOps.exif_transpose(Image.open(src)).convert('RGB'))
        for pre, lado in (('v-', LADO_VISOR), ('t-', LADO_BALDOSA)):
            im = escala(base, lado)
            im.save(os.path.join(FOTOS, pre + orig + '.jpg'), 'JPEG',
                    quality=CALIDAD, optimize=True, progressive=True)
            if pre == 't-':
                hechas.append((orig, im.size))
    for n, s in hechas:
        print('  %-24s baldosa %dx%d (ratio %.2f)' % (n, s[0], s[1], s[0] / s[1]))
    if faltan:
        print('FALTAN originales: ' + ', '.join(sorted(set(faltan))), file=sys.stderr)
        return 1
    print('%d fotos enteras · v-* para el visor, t-* para las baldosas' % len(hechas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
