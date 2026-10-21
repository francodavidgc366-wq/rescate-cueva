"""v4: iconos POI/HUD mas claros (patch sobre art_icons/art_ui), marcos de retrato 9-slice, props de luz (lampara colgante, linterna de suelo)."""
import numpy as np
from artlib import *
import art_icons as AI, art_ui as AU
from art_icons import Ic, cr, P, E, Ln, Rc, RAMPS, INK

def c_cuerda():
    i = Ic(); i.layer(lambda d, s: E(d, 8, 9, 6.6, 5.2, s), 'tan', r=1.5, gain=1.6)
    i.flat(i.m(lambda d, s: (Ln(d, [(3.2, 8.2), (4.2, 11.4)], .8, s), Ln(d, [(12.8, 8.2), (11.8, 11.4)], .8, s), Ln(d, [(5.2, 5.6), (6.6, 6.6)], .8, s), Ln(d, [(10.8, 5.6), (9.4, 6.6)], .8, s))), '#9a7440')
    i.flat(i.m(lambda d, s: E(d, 8, 9.2, 3.0, 2.0, s)), '#2a1c30'); i.flat(i.m(lambda d, s: E(d, 7.4, 8.8, 1.2, .6, s)), '#4a3448')
    i.layer(lambda d, s: Ln(d, [(11.2, 12), (13.4, 13.6), (14.6, 12.4)], 1.5, s), 'tan'); return i.done()
def c_confianza():
    i = Ic(); i.layer(lambda d, s: P(d, [(8, 1.2), (14.2, 3.4), (13.6, 9.4), (8, 14.8), (2.4, 9.4), (1.8, 3.4)], s), 'gold', r=1.5, gain=1.5)
    i.layer(lambda d, s: P(d, [(8, 3.4), (12.2, 5), (11.8, 8.8), (8, 12.2), (4.2, 8.8), (3.8, 5)], s), cr('#2a5aa8'), r=1.2)
    i.flat(i.m(lambda d, s: Ln(d, [(5.8, 7.4), (7.6, 9.2), (10.4, 5.6)], 1.3, s)), '#f4f8ff'); return i.done()
def p_cristal():
    i = Ic(); i.layer(lambda d, s: P(d, [(8, 0.8), (11.6, 4.4), (11.2, 14), (4.8, 14), (4.4, 4.4)], s), 'cyan', r=1.2, gain=1.3, amb=.55)
    i.flat(i.m(lambda d, s: P(d, [(8, 1.6), (8, 14), (4.8, 14), (4.4, 4.4)], s)), '#7ae8f8'); i.flat(i.m(lambda d, s: P(d, [(8, 1.6), (11.6, 4.4), (11.2, 14), (8, 14)], s)), '#1e8ac8')
    i.flat(i.m(lambda d, s: Ln(d, [(6.2, 4.4), (6, 9)], .8, s)), '#ffffff'); i.flat(i.m(lambda d, s: Ln(d, [(8, 1.6), (8, 14)], .4, s)), '#bff8ff')
    i.layer(lambda d, s: P(d, [(1.2, 14), (2, 9.4), (4.4, 14)], s), 'cyan', r=.8); i.layer(lambda d, s: P(d, [(11.6, 14), (13.8, 8.6), (14.8, 14)], s), 'cyan', r=.8); return i.done()
def p_linterna():
    i = Ic(); i.flat(i.m(lambda d, s: Ln(d, [(5.2, 4), (5.6, 1.8), (8, 1), (10.4, 1.8), (10.8, 4)], 1.0, s)), '#b8bcd8')
    i.layer(lambda d, s: (P(d, [(4, 4.6), (12, 4.6), (10.8, 2.8), (5.2, 2.8)], s), Rc(d, 3.6, 12, 12.4, 14.6, s, .6)), 'gray', r=1.1, gain=1.6)
    i.flat(i.m(lambda d, s: P(d, [(4.8, 4.6), (11.2, 4.6), (11.8, 12), (4.2, 12)], s)), '#f2a030'); i.flat(i.m(lambda d, s: P(d, [(6, 5.6), (10, 5.6), (10.4, 11), (5.6, 11)], s)), '#ffe070')
    i.flat(i.m(lambda d, s: Rc(d, 7, 6.8, 9, 10, s)), '#fffbe0'); i.flat(i.m(lambda d, s: Ln(d, [(4.8, 4.6), (4.2, 12)], .8, s)), '#4a4a66'); i.flat(i.m(lambda d, s: Ln(d, [(11.2, 4.6), (11.8, 12)], .8, s)), '#4a4a66'); return i.done()
def p_pozo():
    i = Ic(); i.layer(lambda d, s: Rc(d, 2.4, 8, 13.6, 14.4, s, .8), 'gray', r=1.2)
    i.flat(i.m(lambda d, s: [Ln(d, [(2.6, y), (13.4, y)], .45, s) for y in (10.2, 12.3)] and None), '#4a4a66'); i.flat(i.m(lambda d, s: Ln(d, [(7, 8.4), (7, 10.2)], .45, s)), '#4a4a66')
    i.layer(lambda d, s: E(d, 8, 8, 5.8, 2.6, s), 'gray', r=.8); i.flat(i.m(lambda d, s: E(d, 8, 8.2, 4.4, 1.8, s)), '#0c1830'); i.flat(i.m(lambda d, s: E(d, 7, 8.2, 1.6, .6, s)), '#38a8e8')
    i.flat(i.m(lambda d, s: (Rc(d, 3, 1.2, 4.2, 8, s), Rc(d, 11.8, 1.2, 13, 8, s))), '#7a4a28'); i.flat(i.m(lambda d, s: Rc(d, 2.2, 1, 13.8, 2.6, s)), '#9a5a32'); i.flat(i.m(lambda d, s: Rc(d, 2.2, 1, 13.8, 1.6, s)), '#d89a58'); return i.done()
def p_huellas():
    i = Ic()
    for (x, y, a) in ((5.2, 10.6, -.2), (10.8, 5.4, .2)):
        i.layer(lambda d, s, x=x, y=y: (E(d, x, y, 2.3, 3.0, s), E(d, x, y + 4.0, 1.6, 1.3, s)), 'tan', r=.8, gain=1.2)
        i.flat(i.m(lambda d, s, x=x, y=y: (Ln(d, [(x - 1.2, y - .8), (x + 1.2, y - .8)], .5, s), Ln(d, [(x - 1.4, y + .8), (x + 1.4, y + .8)], .5, s))), '#8a6a40')
    return i.done()
def p_tuberia():
    i = Ic(); i.layer(lambda d, s: (Rc(d, 1.2, 8.4, 14.8, 12.8, s, .6), Rc(d, 6.6, 4.4, 9.4, 8.6, s)), 'gray', r=1.1, gain=1.6)
    i.flat(i.m(lambda d, s: (Rc(d, 1.2, 7.8, 2.8, 13.4, s), Rc(d, 13.2, 7.8, 14.8, 13.4, s))), '#a8acc8')
    i.layer(lambda d, s: E(d, 8, 3.4, 4.2, 1.6, s), cr('#d8283c'), r=.8); i.flat(i.m(lambda d, s: Ln(d, [(8, 3.4), (8, 5)], .8, s)), '#4a4a66')
    i.flat(i.m(lambda d, s: Rc(d, 4.4, 13.4, 5.6, 15.4, s)), '#38a8e8'); return i.done()
def p_puerta():
    i = Ic(); i.layer(lambda d, s: Rc(d, 2.4, 1.6, 13.6, 14.6, s, .6), 'gray', r=1.3, gain=1.5)
    i.flat(i.m(lambda d, s: Rc(d, 4, 3.2, 12, 14.6, s)), '#2a2a44')
    i.flat(i.m(lambda d, s: [Ln(d, [(x, 3.6), (x, 14.4)], .6, s) for x in (5.6, 8, 10.4)] and None), '#8a90b0'); i.flat(i.m(lambda d, s: (Rc(d, 4, 6, 12, 6.9, s), Rc(d, 4, 10.6, 12, 11.5, s))), '#6a708e')
    i.flat(i.m(lambda d, s: E(d, 10.9, 8.6, .8, .8, s)), '#f0c040'); return i.done()
def p_huellas():
    i = Ic()
    for (x, y) in ((5.2, 10.4), (10.8, 4.8)):
        i.layer(lambda d, s, x=x, y=y: (E(d, x, y, 2.4, 3.2, s), E(d, x, y + 4.2, 1.7, 1.2, s)), 'white', r=.8, gain=1.0, amb=.62)
        i.flat(i.m(lambda d, s, x=x, y=y: [Ln(d, [(x - 1.4, y + k), (x + 1.4, y + k)], .5, s) for k in (-1.2, .2, 1.6)] and None), '#8a90b0')
    return i.done()

def i_trofeo_fix(): return AI.i_trofeo()

NEW_ICON = dict(cuerda=c_cuerda, confianza=c_confianza)
NEW_POI = dict(cristal=p_cristal, linterna=p_linterna, pozo=p_pozo, huellas=p_huellas, tuberia=p_tuberia, puerta=p_puerta, cuerda=c_cuerda)
def patch():
    AI.ICONS[:] = [(n, NEW_ICON.get(n, f)) for n, f in AI.ICONS]; AU.ICFN.update(NEW_ICON)
    AU.POI[:] = [(n, NEW_POI.get(n, f)) for n, f in AU.POI]

# ------------------------------------------------------------ marcos de retrato 16x16, 9-slice (slice=6), centro transparente
def pframe(base, light, dark, stud):
    n = 16; o = np.zeros((n, n, 4), np.uint8); hx_ = lambda c: tuple(int(v) for v in hx(c)) + (255,)
    def px(x, y, c): o[y, x] = c if len(c) == 4 else c + (255,)
    for y in range(n):
        for x in range(n):
            e = min(x, y, n - 1 - x, n - 1 - y)
            if e > 4: continue
            corner = (x < 2 or x > n - 3) and (y < 2 or y > n - 3)
            if corner and (min(x, n - 1 - x) + min(y, n - 1 - y)) < 1: continue   # esquina redondeada
            c = [hx_('#150e28'), hx_(base), hx_(base), hx_('#150e28'), (21, 14, 40, 110)][e]
            if e == 1: c = hx_(light if (y == 1 or x == 1) and (x + y < n) else dark if (y == n - 2 or x == n - 2) else base)
            if e == 2: c = hx_(mixh(base, '#150e28', .25) if (y == n - 3 or x == n - 3) else base)
            o[y, x] = c
    for (x, y) in ((2, 2), (n - 3, 2), (2, n - 3), (n - 3, n - 3)): px(x, y, hx_(stud))
    for (x, y) in ((1, 2), (2, 1)): px(x, y, hx_('#ffffff'))
    return Image.fromarray(o, 'RGBA')
def mixh(a, b, t): return '#%02x%02x%02x' % tuple(int(v) for v in mix(hx(a), hx(b), t))
def gen_pframes():
    for n, (b, l, d, s) in dict(portrait_frame=('#e8964a', '#ffd890', '#a0501e', '#fff0c0'), portrait_frame_turq=('#2ab8b0', '#a0fff0', '#146a78', '#e0fffa'), portrait_frame_violet=('#8a5cf0', '#d8c0ff', '#4a2c90', '#f0e4ff')).items():
        save(pframe(b, l, d, s), n, slice=6, note='9-slice 16x16 (slice=6), centro TRANSPARENTE (poner detras el retrato); borde 5px con bisel + sombra interior')

# ------------------------------------------------------------ props de luz
def lamp_hang(f):
    i = Ic(32, 8); ox = 8; g = [0, 1, 0, 2][f]
    i.flat(i.m(lambda d, s: Ln(d, [(ox + 6.4, 2.2), (ox + 8, 0.6), (ox + 9.6, 2.2), (ox + 8, 3.8), (ox + 6.4, 2.2)], 1.0, s)), '#b8bcd8')   # anilla / gancho
    for k, y in enumerate((4, 6.4, 8.8)): i.flat(i.m(lambda d, s, y=y, k=k: Rc(d, ox + (7 if k % 2 == 0 else 7.4), y, ox + (9 if k % 2 == 0 else 8.6), y + 2.2, s)), '#8a90b0' if k % 2 == 0 else '#c0c4dc')
    i.layer(lambda d, s: (P(d, [(ox + 4, 14), (ox + 12, 14), (ox + 10.6, 11.4), (ox + 5.4, 11.4)], s), Rc(d, ox + 7, 10, ox + 9, 12, s)), 'gray', r=1.1, gain=1.6)
    i.flat(i.m(lambda d, s: P(d, [(ox + 4.6, 14), (ox + 11.4, 14), (ox + 12, 23), (ox + 4, 23)], s)), ['#f08a28', '#f29a30', '#e87820'][g])
    i.flat(i.m(lambda d, s: P(d, [(ox + 5.8, 15), (ox + 10.2, 15), (ox + 10.6, 22), (ox + 5.4, 22)], s)), ['#ffd060', '#ffdc70', '#ffc850'][g])
    i.flat(i.m(lambda d, s: P(d, [(ox + 6.8, 16.4), (ox + 9.2, 16.4), (ox + 9.4, 21), (ox + 6.6, 21)], s)), ['#fff4c0', '#ffffe0', '#fff0b0'][g])
    i.flat(i.m(lambda d, s: (Ln(d, [(ox + 4.6, 14), (ox + 4, 23)], .8, s), Ln(d, [(ox + 11.4, 14), (ox + 12, 23)], .8, s))), '#4a4a66')
    i.layer(lambda d, s: P(d, [(ox + 3.6, 23), (ox + 12.4, 23), (ox + 10.4, 26), (ox + 5.6, 26)], s), 'gray', r=1.1, gain=1.6)
    return i.done().crop((8, 0, 24, 28))
def lantern_floor(f):
    i = Ic(16, 8); g = [0, 1, 0, 2][f]
    i.flat(i.m(lambda d, s: Ln(d, [(4.6, 4.2), (5, 1.8), (8, .8), (11, 1.8), (11.4, 4.2)], 1.0, s)), '#b8bcd8')
    i.layer(lambda d, s: (P(d, [(3.6, 5.4), (12.4, 5.4), (11, 3.4), (5, 3.4)], s), Rc(d, 3, 11.6, 13, 14.4, s, .6)), 'gray', r=1.1, gain=1.6)
    i.flat(i.m(lambda d, s: P(d, [(4.4, 5.4), (11.6, 5.4), (12.2, 11.6), (3.8, 11.6)], s)), ['#f08a28', '#f29a30', '#e87820'][g])
    i.flat(i.m(lambda d, s: P(d, [(5.6, 6.2), (10.4, 6.2), (10.8, 11), (5.2, 11)], s)), ['#ffd060', '#ffdc70', '#ffc850'][g])
    i.flat(i.m(lambda d, s: P(d, [(6.8, 7.2), (9.2, 7.2), (9.4, 10.4), (6.6, 10.4)], s)), ['#fff4c0', '#ffffe0', '#fff0b0'][g])
    i.flat(i.m(lambda d, s: (Ln(d, [(4.4, 5.4), (3.8, 11.6)], .8, s), Ln(d, [(11.6, 5.4), (12.2, 11.6)], .8, s))), '#4a4a66'); return i.done()
def chain_seg():
    im = Image.new('RGBA', (8, 8), (0, 0, 0, 0)); px = im.load()
    for y in range(8):
        for x in (3, 4): px[x, y] = (150, 156, 184, 255) if (y // 2) % 2 == 0 else (96, 102, 130, 255)
        px[2, y] = px[5, y] = (21, 14, 40, 255) if (y // 2) % 2 == 0 else (0, 0, 0, 0)
    for y in (0, 1): px[5, y] = (0, 0, 0, 0)
    return im
def gen_lightprops():
    save(sheet4(lamp_hang, 16, 28), 'lamp_hang', fw=16, fh=28, cols=4, frames=4, fps=7, anchorX=8, anchorY=0, hookX=8, hookY=0, lightX=8, lightY=18, baseY=27,
         note='lampara colgante: colgar con el pixel (anchorX,anchorY) en la viga; foco de luz en (lightX,lightY) dentro del frame; 4 frames de parpadeo; para cadena mas larga repetir lamp_chain bajo el gancho y bajar el cuerpo')
    save(sheet4(lantern_floor, 16, 16), 'lantern_floor', fw=16, fh=16, cols=4, frames=4, fps=7, anchorX=8, anchorY=15, baseY=15, lightX=8, lightY=8,
         note='linterna de suelo: base en la ULTIMA fila (y=15); anclar (anchorX,anchorY) al suelo; foco en (8,8)')
    save(chain_seg(), 'lamp_chain', anchorX=4, anchorY=0, tile='vertical', note='eslabon 8x8 tileable en vertical; colocar bajo el gancho de lamp_hang (empalma con y=0 de su cuerpo)')
def sheet4(fn, w, h):
    sh = Image.new('RGBA', (w * 4, h), (0, 0, 0, 0))
    for f in range(4): sh.alpha_composite(fn(f), (f * w, 0))
    return sh

def props_baselines(META):
    """anade baseY/anchorX/anchorY por fila de props (celda 16x16, sin recortar para no romper el engine)"""
    im = np.asarray(Image.open(os.path.join(OUT, 'props.png')).convert('RGBA'))[..., 3] > 0
    meta = META['props']
    for k, r in meta['rows'].items():
        y0 = r['row'] * 16; fr = r.get('frames', 1); rows = [int(np.where(im[y0:y0 + 16, f * 16:f * 16 + 16].any(1))[0].max()) for f in range(fr)]
        r['baseY'] = max(rows); r['anchorX'] = 8; r['anchorY'] = max(rows); r['padBottom'] = 15 - max(rows)
def gen_icons4():
    gen_pframes(); gen_lightprops()
