"""Iconos 16x16, insignias de logros 32x32, iconos de POI, marcos y botones de UI."""
import math
import numpy as np
from artlib import *

INK = hx('#150e28')
def cr(base, warm='#fff0c8'):
    b = hx(base) if isinstance(base, str) else base
    return np.array([mix(b, hx('#120a30'), .78), mix(b, hx('#1c1050'), .5), mix(b, hx('#2a1470'), .2), b, mix(b, hx(warm), .38), mix(b, hx('#ffffff'), .72)])
RAMPS = dict(red=cr('#d8283c'), blue=cr('#2a9ad8'), cyan=cr('#38d0e8'), gold=cr('#f0b030'), brown=cr('#9a5a32'), gray=cr('#8c90a8'), white=cr('#e8e4f4'), green=cr('#38b860'),
             orange=cr('#e8742a'), purple=cr('#8a5cf0'), tan=cr('#d8b878'), dark=cr('#3a3454'), pink=cr('#f06088'), skin=cr('#e8b48a'), yellow=cr('#f8e050'))

class Ic:
    def __init__(self, n=16, ss=8):
        self.n, self.ss = n, ss; self.cv = Cv(n, n); self.cv.a[:] = 0; self.A = np.zeros((n, n), bool); self.ox = 0
    def m(self, fn): return drawmask(self.n, self.n, fn, self.ss)
    def layer(self, fn, ramp, L=(-1, -.9), r=1.2, amb=.56, gain=1.5, dw=.5):
        mk = self.m(fn) if callable(fn) else fn
        ramp = RAMPS[ramp] if isinstance(ramp, str) else ramp
        self.cv.put(mk, shade(mk, ramp, L=L, r=r, amb=amb, gain=gain, dw=dw, dither=False)); self.A |= mk; return mk
    def flat(self, fn, col):
        mk = self.m(fn) if callable(fn) else fn
        self.cv.put(mk, hx(col) if isinstance(col, str) else col); self.A |= mk; return mk
    def done(self, ink=True):
        n = self.n; out = dilate(self.A, 1) & ~self.A
        # contorno de color: tono oscuro del vecino
        a = self.cv.a; oc = np.zeros_like(a); cnt = np.zeros((n, n, 1))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sm = np.roll(np.roll(self.A, dy, 0), dx, 1); oc += np.roll(np.roll(a, dy, 0), dx, 1) * sm[..., None]; cnt += sm[..., None]
        ocol = oc / np.maximum(cnt, 1) * .25 + INK * .75
        self.cv.put(out, ocol); full = self.A | out
        o = np.zeros((n, n, 4), np.uint8); o[..., :3] = np.clip(self.cv.a, 0, 255).astype(np.uint8); o[..., 3] = np.where(full, 255, 0)
        return Image.fromarray(o, 'RGBA')

def P(d, pts, s): d.polygon([(x * s, y * s) for x, y in pts], fill=255)
def E(d, cx, cy, rx, ry, s): d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)
def Ln(d, pts, w, s): d.line([(x * s, y * s) for x, y in pts], fill=255, width=max(1, int(w * s)), joint='curve')
def Rc(d, x0, y0, x1, y1, s, r=0): d.rounded_rectangle([x0 * s, y0 * s, x1 * s - 1, y1 * s - 1], radius=r * s, fill=255)
def star_pts(cx, cy, R, r, n=5, rot=-math.pi / 2): return [(cx + (R if i % 2 == 0 else r) * math.cos(rot + i * math.pi / n), cy + (R if i % 2 == 0 else r) * math.sin(rot + i * math.pi / n)) for i in range(n * 2)]

def i_agua():
    i = Ic(); i.layer(lambda d, s: (P(d, [(8, 1.2), (12.4, 8), (12.8, 10.4), (8, 14.8), (3.2, 10.4), (3.6, 8)], s), E(d, 8, 10, 4.8, 4.8, s)), 'blue', r=1.6, gain=1.5)
    i.flat(i.m(lambda d, s: Ln(d, [(5.6, 9.6), (5.8, 11.4)], .9, s)), '#d8f8ff'); i.flat(i.m(lambda d, s: E(d, 6.2, 8.4, .7, .9, s)), '#ffffff'); return i.done()
def i_salud():
    i = Ic(); i.layer(lambda d, s: (E(d, 5.2, 5.6, 3.6, 3.6, s), E(d, 10.8, 5.6, 3.6, 3.6, s), P(d, [(1.7, 6.6), (14.3, 6.6), (8, 14.4)], s)), 'red', r=1.8, gain=1.5)
    i.flat(i.m(lambda d, s: E(d, 4.6, 4.6, 1.2, .9, s)), '#ffd0d8'); return i.done()
def i_material():
    i = Ic(); i.layer(lambda d, s: Rc(d, 1.6, 4, 14.4, 14.4, s), 'brown', r=1.2)
    i.flat(i.m(lambda d, s: (Rc(d, 1.6, 4, 14.4, 6, s), Rc(d, 1.6, 12.4, 14.4, 14.4, s))), '#a0a8c0')
    i.flat(i.m(lambda d, s: (Rc(d, 3.2, 4, 4.4, 14.4, s), Rc(d, 11.6, 4, 12.8, 14.4, s))), '#5a3418'); i.flat(i.m(lambda d, s: Rc(d, 6.4, 8, 9.6, 10.4, s)), '#f0c040'); i.flat(i.m(lambda d, s: Rc(d, 6.4, 8, 9.6, 8.8, s)), '#fff0b0'); return i.done()
def i_confianza():
    i = Ic(); i.layer(lambda d, s: P(d, [(8, 1.2), (14, 3.4), (13.4, 9), (8, 14.8), (2.6, 9), (2, 3.4)], s), 'gold', r=1.5, gain=1.5)
    i.layer(lambda d, s: P(d, [(8, 3.6), (12, 5), (11.6, 8.6), (8, 12.2), (4.4, 8.6), (4, 5)], s), cr('#2a5aa8'), r=1.2)
    i.flat(i.m(lambda d, s: (E(d, 6.6, 7, 1.7, 1.7, s), E(d, 9.4, 7, 1.7, 1.7, s), P(d, [(5, 7.6), (11, 7.6), (8, 11)], s))), '#ffe0d0'); return i.done()
def i_cuerda():
    i = Ic()
    for k, (rx, ry) in enumerate(((6.3, 4.8), (4.2, 3.2))):
        pass
    i.layer(lambda d, s: (E(d, 8, 9, 6.4, 4.8, s),), 'tan', r=1.4, gain=1.5)
    i.flat(i.m(lambda d, s: (E(d, 8, 9, 4.2, 2.8, s))), '#4a3420'); i.flat(i.m(lambda d, s: E(d, 8, 9, 2.2, 1.2, s)), '#150e28')
    i.flat(i.m(lambda d, s: (Ln(d, [(2.6, 8), (3.4, 10.6)], .8, s), Ln(d, [(13.4, 8), (12.6, 10.6)], .8, s), Ln(d, [(5, 5.6), (6.4, 6.6)], .8, s), Ln(d, [(11, 5.6), (9.6, 6.6)], .8, s))), '#8a6a40')
    i.layer(lambda d, s: Ln(d, [(11.4, 6.6), (13.2, 2.6), (14.6, 2.4)], 1.4, s), 'tan'); return i.done()
def i_bateria():
    i = Ic(); i.layer(lambda d, s: Rc(d, 2, 4.4, 13, 12.8, s, .8), 'green', r=1.3); i.flat(i.m(lambda d, s: Rc(d, 13, 6.4, 14.6, 10.8, s)), '#c8cce0')
    i.flat(i.m(lambda d, s: P(d, [(8.6, 5.2), (5.2, 9), (7.4, 9), (6.6, 12), (10.6, 7.8), (8.4, 7.8)], s)), '#fff070'); return i.done()
def i_radio():
    i = Ic(); i.layer(lambda d, s: Rc(d, 1.6, 5.6, 14.4, 14.4, s, 1), 'gray', r=1.3)
    i.flat(i.m(lambda d, s: Ln(d, [(11.6, 5.4), (13.6, 1.6)], .8, s)), '#d8dcf0'); i.flat(i.m(lambda d, s: E(d, 13.8, 1.6, .9, .9, s)), '#ff5040')
    i.flat(i.m(lambda d, s: (Ln(d, [(3.6, 8.4), (7, 8.4)], .8, s), Ln(d, [(3.6, 10.4), (7, 10.4)], .8, s), Ln(d, [(3.6, 12.4), (7, 12.4)], .8, s))), '#2a2a40'); i.flat(i.m(lambda d, s: E(d, 11, 9.8, 2.3, 2.3, s)), '#e8d890'); i.flat(i.m(lambda d, s: E(d, 11, 9.8, .9, .9, s)), '#8a4020'); return i.done()
def i_mapa():
    i = Ic(); i.layer(lambda d, s: P(d, [(1.4, 3), (5.6, 2), (10.4, 3.4), (14.6, 2.4), (14.6, 12.8), (10.4, 13.8), (5.6, 12.4), (1.4, 13.6)], s), 'tan', r=1.4)
    i.flat(i.m(lambda d, s: (Ln(d, [(5.6, 2), (5.6, 12.4)], .5, s), Ln(d, [(10.4, 3.4), (10.4, 13.8)], .5, s))), '#8a6a40')
    i.flat(i.m(lambda d, s: Ln(d, [(3, 11), (6, 8), (9, 9.4), (12.4, 5.4)], .7, s)), '#3a6aa8'); i.flat(i.m(lambda d, s: (Ln(d, [(10.6, 4.4), (13, 6.6)], 1, s), Ln(d, [(13, 4.4), (10.6, 6.6)], 1, s))), '#d8283c'); return i.done()
def i_botiquin():
    i = Ic(); i.layer(lambda d, s: Rc(d, 1.6, 5, 14.4, 14.2, s, 1), 'white', r=1.3, gain=2)
    i.flat(i.m(lambda d, s: Rc(d, 5.4, 2.6, 10.6, 5.4, s)), '#6a6a8a'); i.flat(i.m(lambda d, s: Rc(d, 6.6, 3.6, 9.4, 5.4, s)), '#150e28')
    i.flat(i.m(lambda d, s: (Rc(d, 6.6, 7, 9.4, 12.6, s), Rc(d, 4.8, 8.8, 11.2, 10.8, s))), '#d8283c'); return i.done()
def i_llave():
    i = Ic(); i.layer(lambda d, s: (E(d, 4.8, 4.8, 3.6, 3.6, s), Ln(d, [(7, 7), (13.6, 13.6)], 2, s), Rc(d, 10.4, 11, 13, 12.4, s), Rc(d, 11.6, 12.6, 13.8, 14, s)), 'gold', r=1.1, gain=1.5)
    i.flat(i.m(lambda d, s: E(d, 4.2, 4.2, 1.4, 1.4, s)), '#150e28'); return i.done()
def i_ojo():
    i = Ic(); i.layer(lambda d, s: P(d, [(1, 8), (4, 4.6), (8, 3.4), (12, 4.6), (15, 8), (12, 11.4), (8, 12.6), (4, 11.4)], s), 'white', r=1.4, gain=1.4)
    i.flat(i.m(lambda d, s: E(d, 8, 8, 3.4, 3.4, s)), '#38b8e8'); i.flat(i.m(lambda d, s: E(d, 8, 8, 1.8, 1.8, s)), '#150e28'); i.flat(i.m(lambda d, s: E(d, 7, 7, .9, .9, s)), '#ffffff'); return i.done()
def i_candado():
    i = Ic(); i.layer(lambda d, s: Ln(d, [(5, 7), (5, 4.6), (6.4, 2.6), (9.6, 2.6), (11, 4.6), (11, 7)], 1.7, s), 'gray', r=1)
    i.layer(lambda d, s: Rc(d, 2.8, 7, 13.2, 14.4, s, 1), 'gold', r=1.3); i.flat(i.m(lambda d, s: (E(d, 8, 10, 1.3, 1.3, s), Rc(d, 7.4, 10.4, 8.6, 12.6, s))), '#150e28'); return i.done()
def i_trofeo():
    i = Ic(); i.layer(lambda d, s: (P(d, [(3.8, 2.4), (12.2, 2.4), (11.4, 8), (8, 10.4), (4.6, 8)], s), Rc(d, 7, 9.6, 9, 12.4, s), Rc(d, 4.4, 12.2, 11.6, 14.4, s)), 'gold', r=1.3, gain=1.5)
    i.layer(lambda d, s: (Ln(d, [(3.8, 3.6), (1.8, 3.6), (2.2, 6.2), (4.8, 7.2)], 1, s), Ln(d, [(12.2, 3.6), (14.2, 3.6), (13.8, 6.2), (11.2, 7.2)], 1, s)), 'gold')
    i.flat(i.m(lambda d, s: Ln(d, [(5.4, 3.6), (5.8, 6.6)], .8, s)), '#fff8c0'); return i.done()
def i_estrella():
    i = Ic(); i.layer(lambda d, s: P(d, star_pts(8, 8.6, 7.4, 3.3), s), 'gold', r=1.4, gain=1.5); i.flat(i.m(lambda d, s: E(d, 6.8, 6.6, .9, .9, s)), '#fff8d0'); return i.done()
def i_reloj():
    i = Ic(); i.layer(lambda d, s: E(d, 8, 8.4, 6.6, 6.6, s), 'orange', r=1.4); i.flat(i.m(lambda d, s: E(d, 8, 8.4, 4.9, 4.9, s)), '#f4ecf8')
    i.flat(i.m(lambda d, s: (Ln(d, [(8, 8.4), (8, 4.8)], .9, s), Ln(d, [(8, 8.4), (10.6, 9.8)], .9, s))), '#2a1830'); i.flat(i.m(lambda d, s: E(d, 8, 8.4, .8, .8, s)), '#d8283c'); return i.done()
def i_chat():
    i = Ic(); i.layer(lambda d, s: (Rc(d, 1.6, 2.4, 14.4, 11.2, s, 2), P(d, [(4, 10.4), (8, 10.4), (4.4, 14.2)], s)), 'white', r=1.4, gain=1.8)
    i.flat(i.m(lambda d, s: (E(d, 5, 6.8, .9, .9, s), E(d, 8, 6.8, .9, .9, s), E(d, 11, 6.8, .9, .9, s))), '#6a5aa0'); return i.done()
def i_voto():
    i = Ic(); i.layer(lambda d, s: Rc(d, 1.8, 8.4, 14.2, 14.4, s, .6), 'blue', r=1.3)
    i.flat(i.m(lambda d, s: Rc(d, 5.2, 9.6, 10.8, 10.8, s)), '#0a2040')
    i.layer(lambda d, s: P(d, [(4.4, 1.4), (11.6, 1.4), (11.6, 9.4), (4.4, 9.4)], s), 'white', r=1.1, gain=1.2)
    i.flat(i.m(lambda d, s: Ln(d, [(5.8, 5.2), (7.4, 6.8), (10.2, 3.2)], 1.2, s)), '#38b860'); return i.done()
def i_alerta():
    i = Ic(); i.layer(lambda d, s: P(d, [(8, 1.4), (14.8, 13.6), (1.2, 13.6)], s), 'yellow', r=1.5, gain=1.5)
    i.flat(i.m(lambda d, s: (Rc(d, 7.2, 5.4, 8.8, 9.8, s), E(d, 8, 11.8, .95, .95, s))), '#2a1830'); return i.done()
def i_secreto():
    i = Ic(); i.layer(lambda d, s: E(d, 8, 8, 6.4, 6.4, s), 'purple', r=1.5, gain=1.5)
    i.flat(i.m(lambda d, s: (Ln(d, [(5.6, 6), (6, 4.6), (8, 4), (10, 4.6), (10.4, 6.2), (8.2, 8.2), (8, 9.4)], 1.5, s), E(d, 8, 11.6, .95, .95, s))), '#fff0ff'); i.flat(i.m(lambda d, s: E(d, 12.6, 3.2, .7, .7, s)), '#ffffff'); return i.done()
def i_ap():
    i = Ic(); i.layer(lambda d, s: P(d, [(8, 2.4), (13, 8), (8, 13.6), (3, 8)], s), 'orange', r=1.5, gain=1.5, amb=.55); i.flat(i.m(lambda d, s: P(d, [(8, 4.4), (10.6, 8), (8, 6.8), (5.4, 8)], s)), '#ffe8a0'); return i.done()

ICONS = [('agua', i_agua), ('salud', i_salud), ('material', i_material), ('confianza', i_confianza), ('cuerda', i_cuerda), ('bateria', i_bateria), ('radio', i_radio),
         ('mapa', i_mapa), ('botiquin', i_botiquin), ('llave', i_llave), ('ojo', i_ojo), ('candado', i_candado), ('trofeo', i_trofeo), ('estrella', i_estrella),
         ('reloj', i_reloj), ('chat', i_chat), ('voto', i_voto), ('alerta', i_alerta), ('secreto', i_secreto), ('ap', i_ap)]

def gen_icons():
    sh = Image.new('RGBA', (160, 32), (0, 0, 0, 0)); idx = {}
    for k, (n, f) in enumerate(ICONS):
        sh.alpha_composite(f(), ((k % 10) * 16, (k // 10) * 16)); idx[n] = k
    save(sh, 'icons', cell=16, fw=16, fh=16, cols=10, rows=2, names=[n for n, _ in ICONS], index=idx, order=[n for n, _ in ICONS], note='idx k -> x=(k%10)*16, y=(k//10)*16; ap = punto de acción')
