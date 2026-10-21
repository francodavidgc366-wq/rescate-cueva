"""Trofeos 32x32, iconos de POI 16x16, marco 9-slice y botones."""
import math
import numpy as np
from artlib import *
from art_icons import *

TROPHY = [('confesion', 'chat', 'purple'), ('cero_bajas', 'salud', 'gold'), ('cartografo', 'mapa', 'gold'), ('lengua_plata', 'secreto', 'purple'), ('detective', 'ojo', 'purple'),
          ('al_borde', 'alerta', 'gold'), ('todos_cumplen', 'confianza', 'gold'), ('sin_pausas', 'reloj', 'purple'), ('everest', 'estrella', 'cyan'), ('cartas_arriba', 'material', 'purple'),
          ('riesgo_calculado', 'agua', 'gold'), ('hombro', 'cuerda', 'purple'), ('manos_limpias', 'botiquin', 'gold'), ('cada_uno', 'llave', 'purple'), ('unanimes', 'voto', 'gold'), ('sin_secretos', 'candado', 'gold')]
ICFN = dict(ICONS)
def trophy(emb, tier):
    i = Ic(32, 6)
    rb = '#d8283c' if tier != 'cyan' else '#2a78c8'
    i.layer(lambda d, s: (P(d, [(9, 1), (15, 1), (17, 11), (12, 14)], s), P(d, [(23, 1), (17, 1), (15, 11), (20, 14)], s)), cr(rb), r=1.2, gain=1.4)
    base = {'gold': '#f0b030', 'purple': '#9a7cf0', 'cyan': '#38d0e8'}[tier]
    i.layer(lambda d, s: E(d, 16, 18, 13, 13, s), cr(base), r=2.5, gain=1.3, amb=.58)
    i.flat(i.m(lambda d, s: E(d, 16, 18, 10, 10, s)), mix(hx(base), hx('#1c1050'), .72))
    i.layer(lambda d, s: E(d, 16, 18, 9, 9, s), cr(mix(hx(base), hx('#1c1050'), .55)), r=2, L=(1, 1), gain=1.0)
    im = i.done(); em = ICFN[emb](); im.alpha_composite(em, (8, 10)); return im
def gen_trophies():
    sh = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
    for k, (n, e, t) in enumerate(TROPHY): sh.alpha_composite(trophy(e, t), ((k % 8) * 32, (k // 8) * 32))
    save(sh, 'trophies', cell=32, fw=32, fh=32, cols=8, rows=2, names=[n for n, _, _ in TROPHY], index={n: k for k, (n, _, _) in enumerate(TROPHY)}, note='insignias de logros; idx k -> x=(k%8)*32,y=(k//8)*32; = Story ACH.trophy')

# POI: reutilizamos iconos y añadimos nuevos
def p_cristal():
    i = Ic(); i.layer(lambda d, s: (P(d, [(2, 14), (4, 7), (6.6, 14)], s), P(d, [(5.6, 14), (9, 1.6), (12.4, 14)], s), P(d, [(10.6, 14), (12.8, 8), (14.6, 14)], s)), 'cyan', gain=1.5); i.flat(i.m(lambda d, s: Ln(d, [(8.4, 4), (8.6, 10)], .8, s)), '#e8ffff'); return i.done()
def p_linterna():
    i = Ic(); i.layer(lambda d, s: (Rc(d, 4, 6, 12, 14.4, s, 1), P(d, [(3, 6), (13, 6), (11, 2.6), (5, 2.6)], s)), 'gray'); i.flat(i.m(lambda d, s: Rc(d, 6, 8, 10, 12.6, s)), '#fff0a0'); return i.done()
def p_huellas():
    i = Ic()
    for (x, y) in ((5, 11), (10, 5)):
        i.layer(lambda d, s, x=x, y=y: (E(d, x, y + 1, 2.2, 3, s), E(d, x - 2, y - 2.6, .8, 1, s), E(d, x, y - 3, .8, 1, s), E(d, x + 2, y - 2.6, .8, 1, s)), 'tan', r=.8)
    return i.done()
def p_caja():
    i = Ic(); i.layer(lambda d, s: P(d, [(1.6, 5), (14.4, 5), (14.4, 14.4), (1.6, 14.4)], s), 'green'); i.flat(i.m(lambda d, s: Rc(d, 1.6, 5, 14.4, 7, s)), '#c8d890'); i.flat(i.m(lambda d, s: Rc(d, 6.4, 8, 9.6, 10, s)), '#f0e0a0'); return i.done()
def p_libreta():
    i = Ic(); i.layer(lambda d, s: Rc(d, 3, 1.8, 13, 14.4, s, .8), 'brown'); i.flat(i.m(lambda d, s: Rc(d, 4.6, 4, 11.4, 9, s)), '#e8d8b0'); i.flat(i.m(lambda d, s: (Ln(d, [(5.4, 5.6), (10.6, 5.6)], .5, s), Ln(d, [(5.4, 7.4), (9, 7.4)], .5, s))), '#6a4a30'); return i.done()
def p_brujula():
    i = Ic(); i.layer(lambda d, s: E(d, 8, 8, 6.6, 6.6, s), 'gold'); i.flat(i.m(lambda d, s: E(d, 8, 8, 5, 5, s)), '#f4ecd8'); i.flat(i.m(lambda d, s: P(d, [(8, 3.4), (6.6, 8), (9.4, 8)], s)), '#d8283c'); i.flat(i.m(lambda d, s: P(d, [(8, 12.6), (6.6, 8), (9.4, 8)], s)), '#3a4a6a'); return i.done()
def p_tuberia():
    i = Ic(); i.layer(lambda d, s: (Rc(d, 1.6, 6.4, 14.4, 10.4, s), Rc(d, 6.4, 3, 9.6, 7, s), E(d, 8, 3.2, 3.4, 1.4, s)), 'gray'); i.flat(i.m(lambda d, s: E(d, 8, 3.2, 3, 1.1, s)), '#d8283c'); i.flat(i.m(lambda d, s: Rc(d, 4, 10, 5.2, 14, s)), '#2a9ad8'); return i.done()
def p_puerta():
    i = Ic(); i.layer(lambda d, s: Rc(d, 2.6, 1.8, 13.4, 14.4, s, 1), 'gray')
    i.flat(i.m(lambda d, s: [Ln(d, [(x, 3.4), (x, 13)], .6, s) for x in (5, 7.4, 9.8, 12)] and None), '#2a2a40'); i.flat(i.m(lambda d, s: (Rc(d, 4.2, 4, 11.8, 4.8, s), Rc(d, 4.2, 10, 11.8, 10.8, s))), '#2a2a40'); return i.done()
def p_pozo():
    i = Ic(); i.layer(lambda d, s: E(d, 8, 9, 6.4, 5, s), 'gray'); i.flat(i.m(lambda d, s: E(d, 8, 9, 4.4, 3, s)), '#05040f'); i.flat(i.m(lambda d, s: E(d, 8, 9.6, 3, 1.6, s)), '#2a78c8'); return i.done()
POI = [('mapa', ICFN['mapa']), ('agua', ICFN['agua']), ('alerta', ICFN['alerta']), ('botiquin', ICFN['botiquin']), ('cuerda', ICFN['cuerda']), ('material', ICFN['material']), ('secreto', ICFN['secreto']), ('ojo', ICFN['ojo']),
       ('llave', ICFN['llave']), ('radio', ICFN['radio']), ('cristal', p_cristal), ('linterna', p_linterna), ('huellas', p_huellas), ('caja', p_caja), ('libreta', p_libreta), ('brujula', p_brujula),
       ('tuberia', p_tuberia), ('puerta', p_puerta), ('pozo', p_pozo), ('bateria', ICFN['bateria'])]
def gen_poi():
    sh = Image.new('RGBA', (160, 32), (0, 0, 0, 0))
    for k, (n, f) in enumerate(POI): sh.alpha_composite(f(), ((k % 10) * 16, (k // 10) * 16))
    save(sh, 'poi_icons', cell=16, fw=16, fh=16, cols=10, rows=2, names=[n for n, _ in POI], index={n: k for k, (n, _) in enumerate(POI)}, note='idx k -> x=(k%10)*16,y=(k//10)*16; añade halo en el motor')

def frame(border, inner, hi, studs):
    s = 24; i = Image.new('RGBA', (s, s)); d = ImageDraw.Draw(i)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=4, fill=hx_t('#150e28')); d.rounded_rectangle([1, 1, s - 2, s - 2], radius=3, fill=hx_t(border))
    d.rounded_rectangle([2, 2, s - 3, s - 3], radius=3, fill=hx_t(mixh(border, '#150e28', .55))); d.rounded_rectangle([3, 3, s - 4, s - 4], radius=2, fill=hx_t(inner))
    d.line([4, 4, s - 5, 4], fill=hx_t(mixh(inner, '#ffffff', .12))); d.line([2, 1, s - 3, 1], fill=hx_t(hi))
    d.line([1, 3, 1, s - 4], fill=hx_t(mixh(border, '#ffffff', .25)))
    for x, y in ((3, 3), (s - 4, 3), (3, s - 4), (s - 4, s - 4)): d.point((x, y), fill=hx_t(studs))
    for x, y in ((2, 2), (s - 3, 2)): d.point((x, y), fill=hx_t(hi))
    return i
def hx_t(c): return tuple(int(v) for v in hx(c)) + (255,)
def mixh(a, b, t): return '#%02x%02x%02x' % tuple(int(v) for v in mix(hx(a), hx(b), t))
def gen_ui():
    save(frame('#e8964a', '#241440', '#ffd890', '#ffe0a0'), 'ui_frame', slice=8, note='9-slice: esquinas 8px, centro tileable; borde ámbar doble, interior violeta oscuro')
    # botones: 3 filas (primario ámbar, secundario violeta, peligro rojo) x 4 estados (normal, hover, pressed, disabled); celda 24x16 slice 6
    sh = Image.new('RGBA', (96, 48), (0, 0, 0, 0))
    cols = [('#e8964a', '#c0602a', '#ffd890'), ('#8a5cf0', '#4a2c90', '#d8c0ff'), ('#e04050', '#901828', '#ffc0c8')]
    for r, (top, bot, hi) in enumerate(cols):
        for st in range(4):
            c = Image.new('RGBA', (24, 16)); d = ImageDraw.Draw(c)
            t, b = (top, bot) if st != 2 else (bot, mixh(bot, '#150e28', .3))
            if st == 1: t = mixh(top, '#ffffff', .22)
            if st == 3: t, b, hi2 = '#4a4660', '#34304a', '#6a6684'
            else: hi2 = hi
            d.rounded_rectangle([0, 0, 23, 15], radius=3, fill=hx_t('#150e28')); d.rounded_rectangle([1, 1, 22, 14], radius=2, fill=hx_t(b))
            d.rounded_rectangle([1, 1, 22, 12 if st != 2 else 13], radius=2, fill=hx_t(t))
            if st != 2: d.line([2, 1, 21, 1], fill=hx_t(hi2)); d.line([2, 12, 21, 12], fill=hx_t(mixh(t, b, .5)))
            sh.alpha_composite(c, (st * 24, r * 16))
    save(sh, 'ui_buttons', fw=24, fh=16, cols=4, rows=3, slice=6, states=['normal', 'hover', 'pressed', 'disabled'], variants=['primary', 'secondary', 'danger'], note='9-slice slice=6; fila=variante, columna=estado')
