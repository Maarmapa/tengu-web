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
import math, os, sys
from PIL import Image, ImageOps, ImageStat

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FOTOS = os.path.normpath(os.path.join(WEB, 'fotos'))

# Los mismos números que igualaron el set de la galería. El tope existe porque
# sin él la foto más fría del lote se iba a naranja y el papel crema del set
# dejaba de ser crema.
CAL, LUZ = 45.0, 112.0
FUERZA = 0.45        # cuánto del camino al objetivo se recorre: emparejar, no aplastar
TOPE_LUZ = 1.22      # tope del exponente de brillo
TOPE_CAL = 10.0      # tope del desplazamiento de color, en puntos de R−B
TOPE_CAL_G = 1.10    # tope del exponente por canal
CALIDAD = 82
LADO_VISOR = 2400   # v-*: el visor llega a 92vw × 84vh, o sea ~2650 px en retina
LADO_BALDOSA = 900  # t-*: la baldosa mide ~330 CSS px, o sea 660 en retina

# Las fotos del sitio entraron reducidas a 1200x1600 sin necesidad: los originales que
# mandó Allan son de 2480x3307 a 3120x4160. Ahí se perdía justo donde importa, en el
# visor a pantalla completa, que ampliaba 1,65x. Este diccionario dice de qué archivo
# original sale cada foto para poder rehacerlas en alta.
#
# La carpeta vive FUERA del repo (pesa 180 MB y son fotos del cliente). Si no está,
# el script avisa y sigue con lo que haya en fotos/, que es peor pero no rompe nada.
ALLAN = os.path.expanduser('~/tengu-fotos-allan/originales')
ORIGINAL = {
    'almejas-canasto': 'IMG_5709', 'almejas-gratinadas': 'IMG_5753',
    'almejas-hielo': 'IMG_5736',   'almejas-limon': 'IMG_5757',
    'bluefin-corte': 'IMG_5957',   'bluefin-lomos': 'IMG_5956',
    'centolla': 'IMG_5434',        'edamame': 'IMG_5762',
    'nigiris-barra': 'IMG_5874',   'robata': 'IMG_5259',
    'salon-ventanal': 'IMG_5849',  'usuzukuri-jalapeno': '1489150e-92aa-43f9-b94d-f5bfb90dc29b',
    'yakitori': 'IMG_5266',        'donburi': 'IMG_5867',
    'chirashi': '3c1bab2a-8253-4c77-a6a3-c7dffcacb393',
    'gyozas': 'DB976931-3ACD-4051-BABC-1664E2A16884',
    'nigiri-trufa': 'E5B79A4E-BC97-4A42-99F7-3A449CBEA487',
    'okonomiyaki': 'EEAC8094-8297-48CC-8D7D-2DED965771C3',
    'tartar-mora': 'BC8D6F93-FCE5-4B75-B153-A928CA284297',
    'tiradito-petalos': 'FA45642D-3277-4228-95F1-85D6A0F16128',
    'uni-ikura-trufa': 'DAF66EE5-6468-4744-AEBC-EA94976586A1',
    'nigiris-pase': '618bc124-5802-4650-84fc-79b7ac451183',
    # barra-montaje solo existe a 1200x1600; no hay original más grande
    'barra-montaje': '0bc9a43c-69ed-4c2e-aa94-9155defb618b',
}

# Fotos que usan las secciones de la carta y la galería de la barra.
ORIGEN = [
    'uni-ikura-trufa', 'tartar-mora', 'gyozas', 'edamame',
    'tiradito-petalos', 'usuzukuri-jalapeno', 'almejas-canasto', 'almejas-hielo',
    'nigiri-trufa', 'nigiris-barra', 'nigiris-pase',
    'okonomiyaki', 'almejas-gratinadas', 'donburi', 'chirashi', 'almejas-limon',
    'salon-ventanal', 'barra-montaje', 'yakitori', 'robata',
]

# Recortes apaisados de la galería de la barra. Ahí la geometría de Omakase sí
# funciona porque son escenas, no platos. La posición va como FRACCIÓN del recorrido
# vertical disponible, no en pixeles, para que no dependa del tamaño del original.
# Los dos bowls van en 1.00 —al ras de abajo— porque son casi cuadrados (1,04 y 1,10):
# en una celda 3:2 se pierde el 30% del alto y, centrados, el borde se cortaba arriba
# y abajo. Pegados abajo el bowl entra entero y lo que se va es mesa.
GALERIA = {
    'g-barra-pescados': ('salon-ventanal', 0.85),
    'g-barra-montaje':  ('barra-montaje',  0.55),
    'g-chirashi':       ('chirashi',       1.00),
    'g-donburi':        ('donburi',        1.00),
    'g-yakitori':       ('yakitori',       0.619),
    'g-robata':         ('robata',         0.45),
}


def fuente(nombre):
    """El original en alta si está; si no, lo que haya en fotos/."""
    o = ORIGINAL.get(nombre)
    if o:
        for sub in ('adjuntos', 'fotos', 'fotos1'):
            p = os.path.join(ALLAN, sub, o + '.jpeg')
            if os.path.exists(p):
                return p, True
    return os.path.join(FOTOS, nombre + '.jpg'), False


def medir(im):
    r, g, b = ImageStat.Stat(im).mean
    return r - b, 0.299 * r + 0.587 * g + 0.114 * b


def gamma(objetivo, actual, tope):
    """Exponente que acerca `actual` a `objetivo` sin tocar el negro ni el blanco.

    Antes esto era un multiplicador (v*k) más un offset para el color. Las dos
    operaciones LEVANTAN EL PISO: un pixel en 20 se iba a 26, y la foto perdía sus
    negros. Sobre el fondo casi negro del sitio eso se lee como foto lavada —los
    negros del donburi pasaron de 11,3% a 6,0% del cuadro—. La gamma deja 0 en 0 y
    255 en 255 y mueve solo los medios, que es donde vive la diferencia real.
    """
    a = max(1.0, min(254.0, actual)) / 255.0
    o = max(1.0, min(254.0, objetivo)) / 255.0
    g = math.log(o) / math.log(a)
    return max(1.0 / tope, min(tope, g))


def lut(g):
    return [min(255, max(0, round(255.0 * (v / 255.0) ** g))) for v in range(256)]


def iguala(im):
    cal, luz = medir(im)
    # Se corrige solo una PARTE del camino al objetivo. Llevarlas todas al mismo
    # número las dejaba a todas con el mismo brillo, y el set perdía el contraste
    # entre un plato oscuro y uno luminoso, que es información de la foto, no ruido.
    objL = luz + (LUZ - luz) * FUERZA
    objC = cal + (CAL - cal) * FUERZA
    gl = gamma(objL, luz, TOPE_LUZ)
    # el color se mueve empujando rojo y azul en sentidos opuestos, también por gamma
    dc = max(-TOPE_CAL, min(TOPE_CAL, objC - cal)) / 2.0
    gr = gamma(max(1.0, luz + dc), luz, TOPE_CAL_G)
    gb = gamma(max(1.0, luz - dc), luz, TOPE_CAL_G)
    return im.point(lut(gl * gr) + lut(gl) + lut(gl * gb))


def escala(im, lado):
    w, h = im.size
    if max(w, h) <= lado:
        return im
    k = lado / max(w, h)
    return im.resize((round(w * k), round(h * k)), Image.LANCZOS)


def main():
    hechas, faltan, sinAlta = [], [], []
    crudos = {}
    for nombre in sorted(set(ORIGEN) | {v[0] for v in GALERIA.values()}):
        src, alta = fuente(nombre)
        if not os.path.exists(src):
            faltan.append(nombre)
            continue
        if not alta:
            sinAlta.append(nombre)
        crudos[nombre] = ImageOps.exif_transpose(Image.open(src)).convert('RGB')

    for nombre in sorted(set(ORIGEN)):
        if nombre not in crudos:
            continue
        base = iguala(crudos[nombre])
        for pre, lado in (('v-', LADO_VISOR), ('t-', LADO_BALDOSA)):
            im = escala(base, lado)
            im.save(os.path.join(FOTOS, pre + nombre + '.jpg'), 'JPEG',
                    quality=CALIDAD, optimize=True, progressive=True)
            if pre == 't-':
                hechas.append((nombre, crudos[nombre].size, im.size))

    for corte, (nombre, frac) in sorted(GALERIA.items()):
        if nombre not in crudos:
            continue
        im = crudos[nombre]
        W, H = im.size
        bh = min(H, int(W / 1.5))           # la galería va en 3:2 apaisado
        y = int((H - bh) * frac)
        rec = escala(iguala(im.crop((0, y, W, y + bh))), 1600)
        rec.save(os.path.join(FOTOS, corte + '.jpg'), 'JPEG',
                 quality=CALIDAD, optimize=True, progressive=True)
        rec.resize((800, round(800 * rec.size[1] / rec.size[0])), Image.LANCZOS).save(
            os.path.join(FOTOS, corte + '-800.jpg'), 'JPEG',
            quality=CALIDAD, optimize=True, progressive=True)

    for n, o, s in hechas:
        print('  %-22s original %-11s baldosa %dx%d' % (n, '%dx%d' % o, s[0], s[1]))
    if sinAlta:
        print('SIN original en alta (se usó fotos/): ' + ', '.join(sorted(sinAlta)), file=sys.stderr)
    if faltan:
        print('FALTAN: ' + ', '.join(sorted(set(faltan))), file=sys.stderr)
        return 1
    print('%d fotos · v-* %dpx para el visor, t-* %dpx para las baldosas, %d recortes de galería'
          % (len(hechas), LADO_VISOR, LADO_BALDOSA, len(GALERIA)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
