"""ART v7: retratos 96x96 estilo gotico oscuro (referencia de estilo: Blasphemous; nada copiado). Pintado procedural:
mascaras a 4x (384px), sombreado por volumen (heightmap difuminado + luz de linterna calida a la izquierda), hebras de pelo
por campo de flujo, pliegues de tela, rim rojo apagado a la derecha, reduccion por promedio de area.
Genera portrait_<guia|medica|ing|lia>[ _alert|_hurt|_talk|_dead ] (hoja 384x96 fw=fh=96) y preview_cast7.png (x3)."""
import math
import numpy as np
from PIL import Image, ImageDraw
from artlib import hx, save, OUT

S = 96; SS = 4; W = S * SS; Z = 1.14   # zoom del diseno (coordenadas de diseno 96 -> lienzo): cabeza mas grande
INK = hx('#0e0509')
def TX(x): return 48 + (x - 48) * Z
def TY(y): return 3 + (y - 5) * Z
def IX(x): return 48 + (x - 48) / Z
def IY(y): return 5 + (y - 3) / Z
YY, XX = np.mgrid[0:W, 0:W]; XP = IX(XX / SS); YP = IY(YY / SS)

# ------------------------------------------------------------------ primitivas (coordenadas en unidades de 96px)
def _m(fn):
    im = Image.new('L', (W, W), 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 127
def cr(pts, n=8):
    P = np.array(pts, float); N = len(P); out = []
    for i in range(N):
        p0, p1, p2, p3 = P[(i - 1) % N], P[i], P[(i + 1) % N], P[(i + 2) % N]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return [tuple(p) for p in out]
def Pg(pts, sm=False):
    q = cr(pts) if sm else pts
    return _m(lambda d: d.polygon([(TX(x) * SS, TY(y) * SS) for x, y in q], fill=255))
def El(cx, cy, rx, ry): return _m(lambda d: d.ellipse([(TX(cx) - rx * Z) * SS, (TY(cy) - ry * Z) * SS, (TX(cx) + rx * Z) * SS, (TY(cy) + ry * Z) * SS], fill=255))
def Ln(pts, w):
    def f(d):
        q = [(TX(x) * SS, TY(y) * SS) for x, y in pts]; d.line(q, fill=255, width=max(1, int(w * Z * SS)), joint='curve'); r = w * Z * SS / 2
        for x, y in (q[0], q[-1]): d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return _m(f)
def Rc(x0, y0, x1, y1, r=1): return _m(lambda d: d.rounded_rectangle([TX(x0) * SS, TY(y0) * SS, TX(x1) * SS, TY(y1) * SS], radius=r * Z * SS, fill=255))
def Q(p0, p1, p2, n=16):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]
def Stroke(pts, w0, w1=None, n=2):
    """trazo de ancho variable w0->w1 (cejas, hebras gruesas)"""
    w1 = w0 if w1 is None else w1; P = np.array(pts, float); L, R = [], []
    for i in range(len(P)):
        d = P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]; d /= (np.hypot(*d) + 1e-9); nx, ny = -d[1], d[0]
        w = (w0 + (w1 - w0) * i / max(len(P) - 1, 1)) / 2; L.append((P[i][0] + nx * w, P[i][1] + ny * w)); R.append((P[i][0] - nx * w, P[i][1] - ny * w))
    return Pg(L + R[::-1])
def U(*ms):
    r = ms[0].copy()
    for m in ms[1:]: r |= m
    return r

_K = {}
def _kern(sig):
    if sig not in _K:
        r = int(sig * 3) + 1; k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sig * sig)); k /= k.sum(); M = np.zeros((W, W))
        for i in range(W):
            lo, hi = max(i - r, 0), min(i + r + 1, W); M[i, lo:hi] = k[lo - i + r:hi - i + r]
        _K[sig] = M / M.sum(1, keepdims=True)
    return _K[sig]
def blur(m, r):
    K = _kern(max(r * Z * SS, .6)); return K @ m.astype(float) @ K.T
def fblur(a, r):
    from PIL import ImageFilter
    im = Image.fromarray((np.clip(np.asarray(a, float), 0, 1) * 255).astype(np.uint8)); return np.asarray(im.filter(ImageFilter.GaussianBlur(max(r * Z * SS, .5))), float) / 255
def dil(m, r):
    n = int(round(r * SS)); o = m.copy()
    for _ in range(n): o = o | np.roll(o, 1, 0) | np.roll(o, -1, 0) | np.roll(o, 1, 1) | np.roll(o, -1, 1)
    return o
def col(c): return hx(c) if isinstance(c, str) else np.asarray(c, float)
def mix(a, b, t): a = col(a); return a + (col(b) - a) * t
_NZ = np.random.default_rng(7).random((W, W))
_NZ = blur(_NZ, .5); _NZ = (_NZ - _NZ.min()) / (_NZ.max() - _NZ.min())

def ramp(base, deep='#2a0c18', hi='#ffe2a8', n=7):
    """rampa oscura->clara de n tonos; sombras hacia vino/violeta, luces doradas"""
    b = col(base); d = col(deep); h = col(hi); out = []
    for i in range(n):
        t = i / (n - 1)
        out.append(mix(d, b, t / .55) if t <= .55 else mix(b, h, (t - .55) / .45 * .62))
    return np.array(out)
def lamp(x, y, r, p=1.6): return np.clip(1 - np.hypot(XP - x, YP - y) / r, 0, 1) ** p

class Cv:
    def __init__(s, lx=-14., ly=32.):
        s.rgb = np.zeros((W, W, 3)); s.a = np.zeros((W, W), bool); s.lf = lamp(lx, ly, 74, 1.1)
    def paint(s, m, rp, r=3., L=(-.75, -.55), amb=.52, gain=1.0, ol=.55, tex=None, texa=.1, wl=.5, olc=None, steps=None):
        """pinta mascara m con rampa rp: volumen por heightmap difuminado + luz global de linterna"""
        if ol: o = dil(m, ol) & ~m; s.rgb[o] = INK if olc is None else col(olc); s.a |= o
        h = blur(m, r); gy, gx = np.gradient(h); sc = r * SS * 2.2
        lx, ly = L; ln = math.hypot(lx, ly); lam = (-gx * lx - gy * ly) / ln * sc * -1
        v = amb + lam * .5 * gain + (s.lf - .45) * wl
        if tex is not None: v = v + (tex - .5) * texa * 2
        v = v + (_NZ - .5) * .07
        n = len(rp); idx = np.clip(np.round(np.clip(v, 0, 1) * (n - 1)), 0, n - 1).astype(int)
        s.rgb[m] = rp[idx][m]; s.a |= m
    def flat(s, m, c): s.rgb[m] = col(c); s.a |= m
    def tint(s, m, c, a, clip=None):
        al = (fblur(m, .9) if m.dtype == bool else m) * a
        if clip is not None: al = al * clip
        al = (al * s.a)[..., None]; s.rgb = s.rgb * (1 - al) + col(c) * al
    def soft(s, m, c, a, r=1.5, clip=None): s.tint(fblur(m, r), c, a, clip)
    def finish(s, rim=(150, 30, 44)):
        a = s.a; rgb = s.rgb.copy()
        # rim rojo apagado a la derecha / sombra fria en el lado alejado de la linterna
        n = int(1.3 * SS); r = a & ~np.roll(a, -n, 1); rr = dil(r, .4) & a
        rgb[rr] = mix(rgb[rr], np.array(rim, float), .55) if False else rgb[rr] * .55 + np.array(rim, float) * .45
        far = np.clip((XP - 46) / 50, 0, 1)[..., None] ** 1.3 * .26
        rgb = rgb * (1 - far) + np.array([30., 10, 28]) * far
        warm = (s.lf ** 1.2)[..., None] * .10; rgb = rgb * (1 - warm) + np.array([255., 168, 70]) * warm
        # contraste: curva S suave
        x = np.clip(rgb / 255, 0, 1); x = x * x * (3 - 2 * x) * .35 + x * .65; rgb = x * 255
        A = a.astype(float).reshape(S, SS, S, SS).mean((1, 3)); C = (rgb * a[..., None]).reshape(S, SS, S, SS, 3).mean((1, 3)) / np.maximum(A[..., None], 1e-6)
        o = np.zeros((S, S, 4), np.uint8); o[..., :3] = np.clip(C, 0, 255).astype(np.uint8); o[..., 3] = np.where(A >= .5, 255, 0)
        return Image.fromarray(o, 'RGBA')

# ------------------------------------------------------------------ pelo por campo de flujo y pliegues
def strands(cv, mask, field, rp, n=260, ln=14, wd=.55, seed=1, dark=.35, light=.4, x0=0, x1=96, y0=0, y1=96, step=.8):
    r = np.random.default_rng(seed); lay = [Image.new('L', (W, W), 0) for _ in range(3)]; dr = [ImageDraw.Draw(i) for i in lay]
    ys, xs = np.nonzero(mask[::SS, ::SS])
    if not len(xs): return
    for _ in range(n):
        k = r.integers(len(xs)); x, y = IX(xs[k] + r.random()), IY(ys[k] + r.random()); pts = [(x, y)]
        for i in range(int(ln * (.5 + r.random()))):
            a = field(x, y) + r.normal(0, .08); x += math.cos(a) * step; y += math.sin(a) * step; pts.append((x, y))
        t = r.random(); li = 0 if t < dark else (2 if t > 1 - light else 1)
        dr[li].line([(TX(px) * SS, TY(py) * SS) for px, py in pts], fill=255, width=max(1, int(wd * Z * SS * (.6 + r.random() * .8))))
    for li, c in ((0, rp[1]), (2, rp[-2])):
        m = (np.asarray(lay[li]) > 127) & mask; cv.flat(m, c)
def folds(cv, mask, curves, shade, lite=None, w=.8, off=(-.9, -.5)):
    for pts in curves:
        l = Ln(pts, w) & mask; cv.tint(l, shade, .75)
        if lite is not None: cv.tint(Ln([(x + off[0], y + off[1]) for x, y in pts], w * .8) & mask & ~l, lite, .45)
def stitches(cv, pts, c, gap=1.6, w=.45):
    P = np.array(pts, float); d = np.hypot(*(P[-1] - P[0])); n = max(int(d / gap), 1)
    for i in range(0, n, 1):
        a = P[0] + (P[-1] - P[0]) * (i / n); b = P[0] + (P[-1] - P[0]) * ((i + .5) / n); cv.flat(Ln([tuple(a), tuple(b)], w), c)
def grain(cv, mask, c, n, seed, a=.5, size=.35):
    r = np.random.default_rng(seed); ys, xs = np.nonzero(mask[::SS, ::SS]); m = np.zeros((W, W), bool)
    if not len(xs): return
    for _ in range(n):
        k = r.integers(len(xs)); m |= El(IX(xs[k] + r.random()), IY(ys[k] + r.random()), size, size)
    cv.tint(m & mask, c, a)

# ------------------------------------------------------------------ cara
def skin_ramp(base, deep='#3c1220', hi='#ffe0b8'): return ramp(base, deep, hi, 10)

def face_mask(sp):
    cx = 48.; cy = sp.get('fcy', 40.); rx = sp.get('frx', 16.); ry = sp.get('fry', 23.); jw = sp.get('jaw', .36); pts = []
    for t in np.linspace(0, 2 * math.pi, 90, endpoint=False):
        y = cy + ry * math.sin(t); x = rx * math.cos(t)
        if y > cy:
            u = (y - cy) / ry; x *= 1 - jw * u ** 2.2 - sp.get('chin', 0) * u ** 6
        else: x *= 1 + .03 * math.sin(-t)
        pts.append((cx + x, y))
    return Pg(pts)

def eye_shape(x, ey, sx, ex, sp):
    """poligono de la apertura del ojo. sx=-1 izquierdo(luz), +1 derecho. ex: dict de expresion"""
    ew = sp.get('ew', 4.4); op = ex.get('open', 1.) * sp.get('eh', 2.5); tilt = ex.get('tilt', 0.) * -sx
    ci = (x - sx * ew, ey + .3 + tilt * .5)   # comisura interna (hacia nariz)
    co = (x + sx * ew, ey - .1 - tilt * .5 + sp.get('outer', .3))
    up = Q(ci, (x - sx * ew * .1, ey - op * 1.7 - ex.get('lidup', 0) + tilt * -1.2), co, 18)
    lo = Q(co, (x + sx * ew * .1, ey + op * (.9 if not ex.get('smile') else .1) + .4), ci, 18)
    return up, lo

def eyes(cv, sp, ex, F):
    ey = sp['ey']; gap = sp.get('gap', 7.6); sk = sp['sk']; gaze = ex.get('gaze', sp.get('gaze', (0, 0)))
    for sx in (-1, 1):
        x = 48 + sx * gap
        # cuenca: sombra modelada alrededor del ojo
        cv.soft(El(x, ey + .6, 6.4, 4.2), sk[1], .5 if sx > 0 else .32, 1.6, F)
        cv.soft(El(x, ey + 3.2, 5.2, 1.9), sp.get('bag', sk[1]), sp.get('bagA', .25), 1.2, F)      # ojeras
        if ex.get('close') or ex.get('shut'):
            ln = Q((x - sx * 4.4, ey + .4), (x, ey + (2.0 if ex.get('close') else 1.5)), (x + sx * 4.4, ey + .1), 16)
            cv.flat(Ln(ln, 1.1), sp.get('lidc', INK)); cv.flat(Ln([(px, py + .9) for px, py in ln], .5), mix(sk[2], INK, .3))
            if sp.get('lash'): cv.flat(Ln([ln[-1], (ln[-1][0] + sx * 1.3, ln[-1][1] + .8)], .6), INK)
            continue
        if ex.get('smile'):   # ojo feliz: arco hacia arriba con parpado inferior elevado
            ln = Q((x - sx * 4.2, ey + 1.4), (x, ey - 3.0), (x + sx * 4.2, ey + 1.2), 16)
            cv.flat(Ln(ln, 1.25), INK)
            cv.soft(Ln([(px, py + 1.4) for px, py in ln], 1.3), sk[2], .35, .8, F)
            if sp.get('lash'): cv.flat(Ln([ln[-1], (ln[-1][0] + sx * 1.8, ln[-1][1] - 1.1)], .7), INK)
            continue
        up, lo = eye_shape(x, ey, sx, ex, sp); m = Pg(up + lo)
        cv.flat(m, sp.get('sclera', '#cfc4bc'))
        cv.tint(m & (YP < ey - .2), '#2a1220', .35)                               # sombra del parpado sobre la esclera
        cv.tint(m & (np.abs(XP - x) > 3.0), '#5a2030', .22)
        gx, gy = gaze; ix = x + gx * 1.6 - sx * .3; iy = ey + .35 + gy * 1.2; irr = sp.get('ir', 2.65)
        ir = El(ix, iy, irr, irr * (1.05 if ex.get('open', 1) > .8 else 1.0)) & m
        i3 = sp['iris']
        cv.flat(ir, i3[1]); cv.flat(ir & (YP < iy - .6), i3[0]); cv.flat(ir & (YP > iy + .9), i3[2])
        cv.flat(ir & ~(El(ix, iy, irr - .55, irr - .55)), mix(i3[0], '#05020a', .55))    # anillo limbal
        pup = ex.get('pup', 1.); cv.flat(El(ix, iy, 1.2 * pup, 1.2 * pup) & m, '#05020a')
        cv.flat(El(ix - .95, iy - 1.0, .8, .8) & m, '#fff6ee'); cv.flat(El(ix + 1.0, iy + 1.2, .4, .4) & m, '#ffd9b0')
        if ex.get('wet'): cv.flat(Ln(lo[::-1][2:-2], .55) & m, '#b8dcff'); cv.tint(m & (YP > ey + .8), '#7ab8ff', .25)
        # parpado superior grueso (linea de pestanas) + pliegue
        upl = up
        if ex.get('lidcut'):   # enfado: parpado cae en diagonal sobre el ojo
            t = ((x + sx * ew_(sp)) - XP) * sx / (2 * ew_(sp)) * -1 + 1       # 0 interno ... 1 externo? (se calibra abajo)
            cut = YP < (ey - 1.0 + ((XP - x) * -sx) * .0) + (1 - np.clip(((XP - x) * sx + ew_(sp)) / (2 * ew_(sp)), 0, 1)) * 1.9 + ex['lidcut']
            cv.flat(m & cut, sk[2]); cv.flat(m & cut & (YP < ey - .8), sk[1])
            edge = [(px, ey - 1.0 + (1 - np.clip(((px - x) * sx + ew_(sp)) / (2 * ew_(sp)), 0, 1)) * 1.9 + ex['lidcut']) for px, _ in up]
            upl = edge
        cv.flat(Ln(upl, 1.15), sp.get('lidc', INK))
        if sp.get('lash'): cv.flat(Ln([upl[-1], (upl[-1][0] + sx * 1.6, upl[-1][1] - 1.2)], .75), INK)
        cv.flat(Ln(lo, .38), mix(sk[1], INK, .45))
        cv.flat(Ln([(px, py - 1.6) for px, py in up[3:-3]], .45) & ~m, mix(sk[1], INK, .35))   # pliegue del parpado
        cv.tint(Ln([(px, py + 1.5) for px, py in lo[2:-2]], .6) & F, sk[4], .3)                  # luz del parpado inferior
def ew_(sp): return sp.get('ew', 4.4)

def brows(cv, sp, ex, F):
    ey = sp['ey']; gap = sp.get('gap', 7.6); r_, inner = ex.get('br', (0, 0)); bw = sp.get('bw', 1.9); by = ey - 6.3 + r_ + sp.get('browlow', 0)
    for sx in (-1, 1):
        x = 48 + sx * gap
        o = (x + sx * 5.3, by + .8 + max(inner, 0) * -.1 + (ex.get('browout', 0))); i = (x - sx * 4.0, by + inner * .9 - .3)
        mid = ((o[0] + i[0]) / 2, min(o[1], i[1]) - 1.0 - sp.get('arch', 0.6) + (ex.get('flat', 0)))
        pts = Q(i, mid, o, 14); st = Stroke(pts, bw * 1.1, bw * .55); cv.flat(st, sp['bc'])
        cv.tint(st & (XP < x + sx * 0), sp.get('bhl', sp['bc']), .3)
        if sp.get('scar') and sx == sp['scar']:
            cv.flat(Ln([(x + sx * 1.2, by - 3.8), (x + sx * 2.4, by + 6.0)], .55), mix(sp['sk'][4], '#ffd0c0', .3))
            cv.flat(Ln([(x + sx * 1.2 - .2, by - 3.8), (x + sx * 2.2, by + 6.0)], .25), sp['sk'][1])
            for yy in (by - 1.6, by + .6, by + 2.6): cv.flat(Ln([(x + sx * .4, yy), (x + sx * 3.0, yy + .3)], .22), sp['sk'][1])

def nose(cv, sp, F):
    ey = sp['ey']; sk = sp['sk']; ns = sp.get('ns', 1.); nw = sp.get('nw', 1.); ty = ey + 11.0 * ns
    # sombra lateral derecha del puente y ala nasal
    cv.soft(Ln([(50.2, ey + 1.5), (50.6, ey + 6), (51.2 + .4 * nw, ty - 1.0)], 1.7), sk[0], .5, .9, F)
    cv.soft(Ln([(46.2, ey + 1.5), (46.0, ey + 6)], 1.2), sk[5], .24, .9, F)                      # luz del puente
    cv.soft(El(51.4 + .7 * nw, ty - .6, 2.3 * nw, 1.9), sk[1], .55, .7, F)
    cv.soft(El(45.4 - .7 * nw, ty - .6, 2.0 * nw, 1.7), sk[2], .35, .7, F)
    cv.soft(El(48.2, ty + 1.7, 3.8 * nw, 1.1), sk[0], .6, .8, F)                                  # sombra bajo la punta
    for sx, a in ((-1, .85), (1, .95)): cv.flat(El(48 + sx * 1.9 * nw, ty + .55, .95 * nw, .6), mix(sk[0], INK, .62))
    cv.soft(El(47.6, ty - 1.2, 1.2, 1.1), sk[6], .6, .5, F)                                       # brillo de la punta
    cv.flat(Ln(Q((46.2, ty - 1.6), (45.3, ty + .2), (46.2, ty + .9)), .35), mix(sk[1], INK, .35))

def mouth(cv, sp, ex, F):
    my = sp['my']; sk = sp['sk']; c, h, w = ex['m'][:3]; teeth = ex['m'][3] if len(ex['m']) > 3 else 0; w *= sp.get('mw', 1.)
    lip = sp['lip']; lipd = mix(lip, INK, .5); ts = np.linspace(-1, 1, 33)
    up = [(48 + t * w, my + .55 * c - c * t * t) for t in ts]; ct = ex.get('corner', 0)
    cv.soft(El(48, my + 4.4, 5.0, 2.2), sk[0], .35, 1.0, F)                                     # sombra bajo el labio
    if h < .4:
        # labio superior (fino, oscuro) e inferior (lleno, con brillo)
        lo = [(48 + t * w * .92, my + .55 * c - c * t * t + 1.7 * (1 - t * t) ** .6 + .3) for t in ts]
        cv.flat(Pg(up + lo[::-1]), lip); cv.flat(Pg(up + [(px, py - 1.2 * (1 - ((px - 48) / w) ** 2)) for px, py in up[::-1]]), mix(lip, lipd, .35))
        cv.flat(Ln(up, .75), lipd)
        cv.soft(Ln([(48 - w * .5 + k * w * .3, my + 1.1 + .55 * c - c * (k * .3 - .5) ** 2) for k in range(4)], .5), mix(lip, '#ffffff', .5), .5, .5, F)
        for sx in (-1, 1): cv.flat(El(48 + sx * (w + .5), my - .3 * c + .4, .45, .45), mix(sk[1], INK, .4))
        return
    lo = [(48 + t * w, my + .55 * c - c * t * t + h * (1 - t * t) ** .65) for t in ts]
    m = Pg(up + lo[::-1]); cv.flat(dil(m, .5) & ~m, mix(lipd, INK, .5)); cv.flat(m, '#3a0a16')
    if teeth:
        tm = m & (YP < my + .55 * c - c * ((XP - 48) / w) ** 2 + min(h, 2.2) * .85); cv.flat(tm, '#e8dccc'); cv.tint(tm & (XP > 49), '#5a3040', .45)
        for k in range(-3, 4): cv.flat(Ln([(48 + k * w / 3.6, my - 1), (48 + k * w / 3.6, my + h + 1)], .18) & tm, mix('#e8dccc', INK, .45))
    cv.flat(m & (YP > my + .55 * c + h * .5), '#8a2038')
    cv.flat(Ln(up, 1.0) & ~m | Ln(up, .8), lip); cv.flat(Ln([(px, py + .15) for px, py in up], .35), lipd)
    cv.flat(Ln([(48 + t * w * .8, my + .55 * c - c * t * t + h * (1 - t * t) ** .65 + .9) for t in np.linspace(-.8, .8, 12)], 1.1), lip)

def ear_pair(cv, sp, F, rp):
    for sx in (-1, 1):
        e = El(48 + sx * (sp.get('frx', 16.) + .3), sp['ey'] + 4.5, 2.6, 4.2); cv.paint(e, rp, r=1.4, wl=.2)
        cv.flat(Ln([(48 + sx * (sp.get('frx', 16.) + .6), sp['ey'] + 2.5), (48 + sx * (sp.get('frx', 16.) + .9), sp['ey'] + 6.5)], .5), mix(rp[1], INK, .3))

# ------------------------------------------------------------------ expresiones
EX = dict(
    neutral=dict(open=1., br=(0, 0), m=(.9, 0, 5.2)),
    preocupado=dict(open=1.12, br=(-.5, -2.3), m=(-1.1, 0, 4.6), sweat=1),
    enfadado=dict(open=.82, lidcut=.2, br=(1.4, 2.7), flat=.6, m=(-1.4, 2.0, 5.6, 1), snarl=1),
    feliz=dict(smile=1, br=(-1., -.4), m=(2.5, 3.0, 6.6, 1), cheeks=1),
    alert=dict(open=1.45, br=(-2.6, -1.2), pup=.7, m=(-.3, 3.2, 3.6)),
    hurt=dict(open=.5, br=(1.0, -2.8), m=(-1.6, 1.8, 5.4, 1), hurt=1),
    talk=dict(open=1., br=(-.6, -.3), m=(.8, 3.0, 4.8, 1)),
    dead=dict(shut=1, br=(1.4, -1.5), m=(-.2, 0, 4.6)),
)
SHEET = ['neutral', 'preocupado', 'enfadado', 'feliz']

def sweat(cv, ex, x=62., y=33.):
    if ex.get('sweat'):
        d = Pg([(x, y - 3.4), (x + 1.8, y + .6), (x, y + 2.2), (x - 1.8, y + .6)], True); cv.flat(dil(d, .35), INK); cv.flat(d, '#7ab8e8'); cv.flat(El(x - .5, y + .4, .45, .7), '#e8f6ff')

def face_fx(cv, sp, ex, F):
    """modelado: pomulos, mejilla en sombra, mejillas al sonreir, heridas"""
    sk = sp['sk']; ey = sp['ey']
    cv.soft(El(39, ey + 7.5, 5, 3.2), sk[5], .26, 1.4, F)                                       # pomulo iluminado
    cv.soft(El(57.5, ey + 8, 5.5, 4.5), sk[1], .3, 1.8, F)                                     # mejilla en sombra
    cv.soft(El(48, ey - 9.8, 9, 2.8), sk[5], .18, 1.6, F)                                       # frente
    cv.soft(El(63.5, ey + 2, 3.0, 9), sk[1], .35, 1.4, F)                                        # sien/lado derecho oscuro
    for sx, a in ((-1, .30), (1, .38)):                                                           # surco nasogeniano
        cv.soft(Ln(Q((48 + sx * 5.4, ey + 9.5), (48 + sx * 7.7, ey + 14), (48 + sx * 6.6, sp['my'] - 1.5)), .8), sk[0], a * sp.get('lines', 1.), .7, F)
    if ex.get('cheeks'):
        for sx in (-1, 1): cv.soft(El(48 + sx * 9.5, ey + 6.4, 3.4, 2.4), sk[4], .35, 1.0, F); cv.soft(El(48 + sx * 10.5, ey + 7.5, 3.0, 2.0), '#d8505a', .20, 1.0, F)
    if sp.get('blush'): [cv.soft(El(48 + sx * 10, ey + 7.5, 3.4, 2.0), sp['blush'], .16, 1.0, F) for sx in (-1, 1)]
    if ex.get('hurt'):
        cv.soft(El(57.5, ey + 5.5, 4.2, 3), '#6a2a6a', .6, 1.2, F)                              # moraton
        cv.soft(Ln([(55.5, ey - 7.5), (56.5, ey - 3), (56, ey + .6)], .9), '#8a1018', .85, .35, F); cv.flat(Ln([(55.5, ey - 7.5), (56.5, ey - 3), (56, ey + .6)], .55) & F, '#a01824')
        cv.flat(Ln([(51, sp['my'] + 1.0), (51.5, sp['my'] + 4)], .4), '#9a1020'); cv.soft(El(41, ey + 8.2, 2.4, 1.4), '#1a0c10', .45, .6, F)
    if ex.get('snarl'):
        cv.soft(Ln([(41.5, ey - 6.6), (45.5, ey - 3.8)], .5), sk[0], .6, .5, F); cv.soft(Ln([(54.5, ey - 6.6), (50.5, ey - 3.8)], .5), sk[0], .6, .5, F)
    if sp.get('dirt'):
        cv.soft(Ln([(55, ey + 9.2), (59, ey + 11.5)], 1.4), '#2a1810', .5, .7, F); cv.soft(El(41.4, ey - 10, 2.4, 1.0), '#2a1810', .35, .7, F)

def finish_char(cv, ex, dead=False):
    im = cv.finish()
    if dead: im = deadify(im)
    return im
def deadify(im):
    a = np.asarray(im).astype(float); g = (a[..., :3] * [.3, .59, .11]).sum(-1) / 255; g = .10 + g ** 1.1 * .8
    lo, hi = np.array([16., 24, 46]), np.array([160., 178, 208]); o = lo + (hi - lo) * g[..., None]
    return Image.fromarray(np.clip(np.dstack([o, a[..., 3]]), 0, 255).astype(np.uint8), 'RGBA')

def neck_torso(cv, sp, F_unused=None):
    pass

def head_common(cv, sp, ex, beard=None, hair_front=None, rp=None, stub=None):
    """cabeza completa. hair_front(cv,F,ex) y beard(cv,F,ex) opcionales"""
    F = face_mask(sp); sk = sp['sk']
    cv.paint(F, rp, r=5.2, gain=1.0, amb=.62, wl=.5, ol=.6)
    ear_pair(cv, sp, F, rp)
    face_fx(cv, sp, ex, F)
    if beard: beard(cv, F, ex)
    eyes(cv, sp, ex, F); nose(cv, sp, F); mouth(cv, sp, ex, F); brows(cv, sp, ex, F)
    return F

# ------------------------------------------------------------------ MATEO (guia)
def draw_guia(ex, dead=False):
    cv = Cv(); sk = skin_ramp('#b07a54'); hr = ramp('#1d130f', '#08040a', '#6a4c3a')
    sp = dict(sk=sk, ey=39., gap=7.8, my=57.2, lip='#8a4a44', bc='#140c0a', bhl='#2a1c14', iris=[hx('#6a4426'), hx('#8a5a30'), hx('#c08848')], ir=2.7,
              bw=2.3, arch=.5, ns=1.05, nw=1.15, jaw=.30, chin=.9, scar=-1, bag=hx('#5a2a28'), bagA=.2, mw=1.05, fry=23.)
    # pelo trasero + cuello
    back = Pg([(31, 40), (30, 24), (36, 14), (48, 10), (60, 14), (66, 24), (65, 40), (60, 28), (48, 22), (36, 28)], True)
    cv.paint(back, hr, r=2, wl=.4)
    jacket = ramp('#7a4a2a', '#1c0a0c', '#e0a060')
    tors = Pg([(0, 96), (1, 86), (6, 78), (22, 72), (36, 69), (60, 69), (74, 72), (90, 78), (95, 86), (96, 96)], True)
    cv.paint(tors, jacket, r=4.5, gain=1.2, amb=.5, wl=.7, tex=_NZ, texa=.1)
    # camiseta oscura en el pecho + solapas de la chaqueta
    shirt = Pg([(38, 70), (48, 86), (58, 70), (54, 68), (48, 72), (42, 68)]); cv.paint(shirt, ramp('#2a2430', '#0a060c', '#6a5a6a'), r=1.2, wl=.4, ol=.3)
    lapL = Pg([(20, 71), (32, 68), (44, 84), (38, 96), (14, 96), (10, 82)], True); lapR = Pg([(76, 71), (64, 68), (52, 84), (58, 96), (82, 96), (86, 82)], True)
    cv.paint(lapL, jacket, r=3, gain=1.3, wl=.8, tex=_NZ, texa=.1); cv.paint(lapR, jacket, r=3, gain=1.3, wl=.4, tex=_NZ, texa=.1)
    cv.paint(Pg([(30, 70), (38, 68), (46, 82), (40, 86)], True), jacket, r=1.5, wl=.8, ol=.5)   # cuello de la chaqueta (alto, izq)
    cv.paint(Pg([(66, 70), (58, 68), (50, 82), (56, 86)], True), jacket, r=1.5, wl=.3, ol=.5)
    folds(cv, tors, [[(10, 86), (18, 90), (22, 96)], [(88, 86), (80, 90), (76, 96)], [(26, 78), (22, 84), (26, 92)], [(70, 78), (74, 84), (70, 92)], [(6, 90), (10, 96)]], '#1c0a0c', '#e0a060')
    folds(cv, tors, [[(14, 80), (18, 80.5), (23, 79)], [(80, 80), (76, 80.5), (72, 79)]], '#2a1008')           # grietas del cuero
    stitches(cv, [(16, 74), (12, 82)], '#c89860'); stitches(cv, [(80, 74), (84, 82)], '#8a5a30')
    stitches(cv, [(40, 86), (36, 96)], '#c89860'); stitches(cv, [(56, 86), (60, 96)], '#8a5a30')
    cv.paint(El(15, 87, 1.5, 1.5), ramp('#b09050', '#2a1808', '#fff0b0'), r=.6, ol=.4); cv.paint(Rc(80, 76, 84, 80, .6), ramp('#8a7040', '#2a1808', '#e8d090'), r=.5, ol=.3)
    # tirante (mochila) + bolsillo
    cv.paint(Pg([(18, 72), (24, 71), (28, 96), (21, 96)]), ramp('#4a2e1c', '#140808', '#a87848'), r=1.2, wl=.7, ol=.4)
    cv.paint(Rc(64, 84, 82, 96, 1.2), jacket, r=1.5, wl=.4, tex=_NZ); stitches(cv, [(64, 85), (82, 85)], '#c89860')
    # cuello
    neck = Pg([(40, 52), (41, 70), (55, 70), (56, 52)]); cv.paint(neck, sk, r=2.5, wl=.5, ol=.5)
    cv.soft(Pg([(40, 52), (56, 52), (56, 62), (40, 62)]), sk[0], .6, 2.5, neck)
    # panuelo rojo
    red = ramp('#a21a22', '#2a040a', '#f06a58')
    sc = Pg([(36, 62), (48, 66), (60, 62), (62, 70), (54, 76), (48, 80), (42, 76), (34, 70)], True); cv.paint(sc, red, r=2.5, gain=1.3, wl=.7, ol=.55)
    folds(cv, sc, [[(40, 64), (42, 72), (46, 76)], [(56, 64), (54, 72), (50, 76)], [(47, 68), (48, 78)]], '#2a040a', '#f08070', w=.6)
    knot = Pg([(44, 74), (52, 74), (54, 80), (48, 84), (42, 80)], True); cv.paint(knot, red, r=1.2, wl=.7, ol=.5)
    cv.paint(Pg([(43, 80), (40, 90), (45, 88), (47, 82)]), red, r=.9, wl=.5, ol=.45); cv.paint(Pg([(49, 82), (52, 92), (56, 88), (52, 80)]), red, r=.9, wl=.3, ol=.45)
    cv.tint(Pg([(34, 62), (62, 62), (62, 66), (34, 66)]) & sc, '#000000', .0)
    def beard(cv, F, ex):
        b = F & (((YP > 51.5) & (np.abs(XP - 48) > 5.5)) | (YP > 62) | ((YP > 49) & (np.abs(XP - 48) > 11)))
        b |= F & (YP > 53) & (np.abs(XP - 48) <= 5.5) & ~(El(48, 57.2, 7.4, 3.2))
        cv.tint(fblur(b, 1.0), '#1a0e10', .5)
        grain(cv, b, '#120a0c', 700, 5, .9, .22)
        grain(cv, F & (YP > 49), '#6a5048', 80, 9, .35, .25)
        cv.soft(El(48, 53.7, 5, 1.0), '#140a0c', .6, .6, F)                                       # bigote
    F = head_common(cv, sp, ex, beard=beard, rp=sk)
    # pelo corto despeinado hacia atras y a la derecha
    hair = Pg([(31, 40), (30, 27), (34, 18), (42, 12), (50, 10), (60, 13), (65, 21), (66, 33), (65, 40), (63, 30), (60, 24), (54, 22.5), (46, 24), (40, 26.5), (35, 31)], True)
    cv.paint(hair, hr, r=2.2, wl=.9, ol=.6)
    strands(cv, hair, lambda x, y: -.9 + (x - 48) * .02, hr, n=260, ln=12, wd=.5, seed=3, dark=.3, light=.45)
    for p in ([(36, 18), (30, 24)], [(64, 18), (68, 26)], [(50, 10), (54, 6)]): cv.flat(Ln(Q(p[0], ((p[0][0] + p[1][0]) / 2 + 1, (p[0][1] + p[1][1]) / 2 - 2), p[1]), 1.6), hr[2])
    # frontal de minero: banda + lampara
    band = Pg([(31.5, 25), (48, 20.5), (65, 25), (65.5, 29), (48, 24.8), (31.2, 29)], True); cv.paint(band, ramp('#2a2630', '#08040a', '#7a7288'), r=1.0, wl=.6, ol=.5)
    cv.flat(Ln(Q((33, 26.5), (48, 22.5), (64, 26.5)), .35), '#6a6478')
    lampm = Rc(55, 18, 66, 28, 2); cv.paint(lampm, ramp('#8a8a92', '#18141c', '#fff4e0'), r=1.2, wl=.7, ol=.55)
    cv.paint(El(60.5, 23.2, 3.6, 3.6), ramp('#f6d890', '#6a3a10', '#ffffff'), r=1.2, ol=.4, wl=0)
    cv.flat(El(60.5, 23.2, 2.0, 2.0), '#fff8d8'); cv.flat(Rc(55, 18, 66, 19.6, .6), '#c0c0c8'); cv.flat(Ln([(57, 27), (64, 27)], .4), '#4a4a54')
    glow = lamp(60.5, 23.2, 14, 2.2); al = (glow * .55 * cv.a)[..., None]; cv.rgb = cv.rgb * (1 - al) + np.array([255., 214, 130]) * al
    sweat(cv, ex)
    return finish_char(cv, ex, dead)

# ------------------------------------------------------------------ ELENA (medica)
def draw_medica(ex, dead=False):
    cv = Cv(); sk = skin_ramp('#e0b8a0', '#481828', '#fff0e0'); hr = ramp('#14101a', '#05030a', '#6a5a82')
    sp = dict(sk=sk, ey=39.5, gap=7.4, my=57.0, lip='#a04858', bc='#0e0a12', bhl='#241c2a', iris=[hx('#2a2018'), hx('#4a3220'), hx('#8a6038')], ir=2.65,
              bw=1.5, arch=1.1, ns=.95, nw=.9, jaw=.42, frx=15.2, fry=22.5, lash=1, bag=hx('#6a3a58'), bagA=.45, sclera='#d6ccc8', lines=.7, fcy=40.2)
    back = Pg([(31, 42), (30, 26), (36, 16), (48, 12), (60, 16), (66, 26), (65, 42), (58, 30), (48, 25), (38, 30)], True); cv.paint(back, hr, r=2, wl=.4)
    # bata clinica sucia + chaleco de rescate
    coat = ramp('#c8c4c8', '#2a1a2a', '#fff8f0')
    tors = Pg([(0, 96), (1, 86), (6, 78), (22, 72), (36, 69), (60, 69), (74, 72), (90, 78), (95, 86), (96, 96)], True)
    cv.paint(tors, coat, r=4.5, gain=1.2, amb=.52, wl=.7, tex=_NZ, texa=.08)
    cv.paint(Pg([(34, 69), (48, 73), (62, 69), (60, 96), (36, 96)], True), ramp('#3a5a68', '#0a1018', '#9ac8d0'), r=2, wl=.5, ol=.4)    # camisa de quirofano
    vest = ramp('#d8641c', '#38100a', '#ffc070')
    vL = Pg([(14, 78), (28, 71), (36, 70), (42, 86), (34, 96), (10, 96), (8, 86)], True); vR = Pg([(82, 78), (68, 71), (60, 70), (54, 86), (62, 96), (86, 96), (88, 86)], True)
    cv.paint(vL, vest, r=3, gain=1.2, wl=.9, tex=_NZ, texa=.08); cv.paint(vR, vest, r=3, gain=1.2, wl=.4, tex=_NZ, texa=.08)
    for pts in ([(12, 90), (36, 90)], [(60, 90), (84, 90)]):
        st = Pg([(pts[0][0], pts[0][1]), (pts[1][0], pts[1][1]), (pts[1][0], pts[1][1] + 3.4), (pts[0][0], pts[0][1] + 3.4)]); cv.paint(st, ramp('#a8a8b0', '#2a2a34', '#ffffff'), r=.8, wl=.7, ol=.35)
    folds(cv, tors, [[(8, 84), (14, 88), (12, 96)], [(90, 84), (84, 88), (86, 96)], [(26, 76), (24, 82)], [(70, 76), (72, 82)]], '#2a1a2a', '#fff8f0')
    folds(cv, vL, [[(22, 76), (20, 86), (24, 94)]], '#38100a', '#ffc070', w=.6); folds(cv, vR, [[(74, 76), (76, 86), (72, 94)]], '#38100a', '#ffc070', w=.6)
    dirt = np.zeros((W, W), bool)
    for x, y, rx, ry in ((18, 92, 7, 3), (78, 86, 5, 2.5), (30, 80, 4, 2)): dirt |= El(x, y, rx, ry)
    cv.soft(dirt, '#3a2418', .5, 1.5, tors); grain(cv, tors, '#4a2a1a', 90, 4, .5, .4)
    cv.soft(Ln([(44, 74), (47, 90)], 3), '#6a1018', .0, 1, tors)
    # cruz roja en el pecho (parche circular)
    patch = El(23, 84, 5.4, 5.4); cv.paint(patch, ramp('#f0ece8', '#3a2a30', '#ffffff'), r=1, wl=.6, ol=.5)
    cv.flat(Rc(21.8, 80.4, 24.2, 87.6, .2), '#c01828'); cv.flat(Rc(19.4, 82.8, 26.6, 85.2, .2), '#c01828'); cv.tint(Rc(21.8, 80.4, 24.2, 87.6, .2) | Rc(19.4, 82.8, 26.6, 85.2, .2), '#2a0408', .0)
    cv.tint(patch & (XP > 25), '#3a2418', .25)
    # cuello y solapa de la bata
    neck = Pg([(41.5, 52), (42, 70), (54, 70), (54.5, 52)]); cv.paint(neck, sk, r=2.5, wl=.5, ol=.5); cv.soft(Pg([(40, 52), (57, 52), (57, 62), (40, 62)]), sk[0], .6, 2.5, neck)
    colr = Pg([(33, 69), (42, 69), (46, 80), (37, 84)]); colr2 = Pg([(63, 69), (54, 69), (50, 80), (59, 84)])
    cv.paint(colr, coat, r=1.0, gain=.7, wl=.8, ol=.5); cv.paint(colr2, coat, r=1.0, gain=.7, wl=.3, ol=.5)
    # estetoscopio
    steth = [(36, 66), (34, 78), (38, 90), (46, 94), (54, 90), (60, 78), (60, 66)]
    cv.paint(Ln(cr([(42, 64), (41, 76), (44, 86), (47, 90), (51, 86), (54, 76), (54, 64)], 6), .9), ramp('#2a2a34', '#08060c', '#6a6a7a'), r=.5, ol=.3, wl=.4)
    cv.paint(Ln([(47, 89), (47, 92)], .9), ramp('#4a4a56', '#08060c', '#a0a0b4'), r=.4, ol=.3, wl=0)
    cv.paint(El(47, 93, 2.6, 2.0), ramp('#a8a8b4', '#18141c', '#ffffff'), r=.8, ol=.5, wl=.6)
    F = head_common(cv, sp, ex, rp=sk)
    # pelo: raya al centro-izquierda, mechones sueltos, mono alto
    hair = Pg([(31.5, 44), (30.5, 28), (34, 19), (42, 14.5), (50, 13.5), (59, 16), (65, 24), (66, 36), (65, 46), (62.5, 34), (59, 28), (52, 24.6), (45, 24), (39, 27), (35, 34)], True)
    cv.paint(hair, hr, r=2, wl=.9, ol=.6)
    strands(cv, hair, lambda x, y: (math.pi * .5 + (x - 48) * .075) if y > 24 else (-.35 if x < 48 else -2.8), hr, n=280, ln=12, wd=.45, seed=5, dark=.3, light=.45)
    bun = El(49, 10.5, 9.2, 7.0); cv.paint(bun, hr, r=2.8, wl=.9, ol=.65)
    strands(cv, bun, lambda x, y: math.atan2(y - 10.5, x - 49) + math.pi / 2 + .3, hr, n=220, ln=9, wd=.45, seed=6, dark=.3, light=.45)
    cv.paint(Ln(Q((40, 14), (49, 17.8), (58, 14)), 1.0), ramp('#7a2030', '#200810', '#e06070'), r=.4, ol=.3, wl=.3)   # goma
    for pts in ([(36.2, 30), (35.2, 40), (36.0, 50)], [(60.2, 30), (61.4, 40), (60.4, 51)], [(33, 22), (30.6, 30), (30.8, 40)]):
        cv.paint(Stroke(Q(*pts), 1.5, .5), hr, r=.5, ol=.4, wl=.5)
    cv.flat(Ln(Q((38, 16.6), (45, 14.6), (54, 15.4)), .6), hr[-2]); cv.flat(Ln(Q((34, 24), (36, 19.4), (40, 17)), .5), hr[-2])
    sweat(cv, ex, 63., 36.)
    return finish_char(cv, ex, dead)

# ------------------------------------------------------------------ SAMUEL (ing)
def draw_ing(ex, dead=False):
    cv = Cv(); sk = skin_ramp('#8a5634', '#2e1018', '#f0b888'); gr = ramp('#c4c0c0', '#2a2030', '#ffffff'); hr = gr
    sp = dict(sk=sk, ey=39.5, gap=7.9, my=57.6, lip='#4a2428', bc='#8a8890', bhl='#d0ccd0', iris=[hx('#2a1810'), hx('#3e2616'), hx('#6a4426')], ir=2.7,
              bw=2.2, arch=.5, ns=1.05, nw=1.3, jaw=.30, chin=.8, frx=16.8, fry=22.5, bag=hx('#2a0c14'), bagA=.35, sclera='#d4c8bc', lines=1.3, lidc=hx('#0a0408'), mw=1.1, outer=.4)
    blue = ramp('#2c5aa8', '#08122a', '#86b4f0')
    tors = Pg([(0, 96), (1, 85), (6, 77), (22, 72), (36, 69), (60, 69), (74, 72), (90, 77), (95, 85), (96, 96)], True)
    cv.paint(tors, blue, r=4.5, gain=1.2, amb=.5, wl=.7, tex=_NZ, texa=.1)
    folds(cv, tors, [[(8, 84), (14, 88), (12, 96)], [(90, 84), (84, 88), (86, 96)], [(24, 76), (20, 84), (24, 92)], [(72, 76), (76, 84), (72, 92)], [(30, 88), (36, 96)]], '#08122a', '#86b4f0')
    # tiras reflectantes cruzadas
    for y in (86,):
        st = Pg([(0, y), (96, y), (96, y + 3.4), (0, y + 3.4)]) & tors; cv.paint(st, ramp('#b0b4b8', '#2a2a34', '#ffffff'), r=.6, ol=.3, wl=.6)
    stg = Pg([(0, 91), (96, 91), (96, 92.2), (0, 92.2)]) & tors; cv.flat(stg, '#788088')
    # cuello del mono y cremallera
    neck = Pg([(40, 52), (40.5, 70), (56, 70), (56.5, 52)]); cv.paint(neck, sk, r=2.5, wl=.5, ol=.5); cv.soft(Pg([(39, 52), (58, 52), (58, 64), (39, 64)]), sk[0], .6, 2.5, neck)
    colL = Pg([(30, 70), (40, 66), (48, 80), (46, 96), (36, 96), (30, 82)], True); colR = Pg([(66, 70), (56, 66), (48, 80), (50, 96), (60, 96), (66, 82)], True)
    cv.paint(colL, blue, r=1.2, gain=.8, wl=.9, ol=.55, tex=_NZ); cv.paint(colR, blue, r=1.2, gain=.8, wl=.3, ol=.55, tex=_NZ)
    cv.flat(Ln([(48, 80), (48, 96)], .6), '#14161c'); stitches(cv, [(48, 80), (48, 96)], '#c8c0a0', gap=1.3, w=.4)
    cv.paint(El(48, 80.4, 1.2, 1.2), ramp('#b0b0b8', '#22222a', '#ffffff'), r=.4, ol=.3, wl=0)
    stitches(cv, [(33, 71), (38, 84)], '#d8c890'); stitches(cv, [(63, 71), (58, 84)], '#a89868')
    # parche con nombre y bolsillo
    cv.paint(Rc(12, 78, 25, 84, .7), ramp('#e0dcd0', '#2a2428', '#ffffff'), r=.8, wl=.6, ol=.45)
    cv.flat(Rc(14, 80, 23, 81, .1), '#3a3a50'); cv.flat(Rc(14, 82, 20, 82.8, .1), '#6a6a80')
    cv.paint(Rc(66, 84, 84, 96, 1.3), blue, r=1.5, wl=.4, tex=_NZ); stitches(cv, [(66, 85), (84, 85)], '#d8c890'); cv.paint(El(75, 87, 1.1, 1.1), ramp('#b09050', '#2a1808', '#fff0b0'), r=.4, ol=.3, wl=0)
    grain(cv, tors, '#0a0a14', 160, 8, .45, .45); cv.soft(El(18, 92, 8, 3), '#201410', .4, 1.4, tors)
    F = head_common(cv, sp, ex, rp=sk)
    # pelo corto canoso a los lados, barba cuidada
    def beardf(cv, F, ex): pass
    # barba: mandibula + bigote + perilla, recortada, gris
    bm = F & ((YP > 50.5) & ((np.abs(XP - 48) > 6.2) | (YP > 62))) | (F & (YP > 62)); bm |= F & (YP > 53) & ~El(48, 57.6, 7.8, 3.4) & (YP < 63) & (np.abs(XP - 48) <= 6.2)
    bm &= ~El(48, 57.6, 6.8, 2.8)
    bmf = blur(bm, 1.0)
    cv.tint(bmf, '#c8c4c4', .0)
    bearda = bm & F
    bs = ramp('#8e8c92', '#1c1620', '#e8e4e8'); cv.paint(bearda, bs, r=2.6, wl=.8, ol=0, tex=_NZ, texa=.05, gain=.9)
    strands(cv, bearda, lambda x, y: math.pi * .5 + (x - 48) * .03, bs, n=360, ln=5, wd=.28, seed=12, dark=.45, light=.35, step=.5)
    cv.flat(dil(bearda, .0) & (np.roll(bearda, -3, 0) != bearda) & ~El(48, 57.6, 7.5, 3) & (YP < 51) & F, bs[2])
    mouth(cv, sp, ex, F)                    # la boca se vuelve a pintar sobre la barba
    cv.soft(Ln(Q((41.5, 53.4), (48, 55.6), (54.5, 53.4)), 1.7), bs[1], .85, .4, F)
    cv.flat(Ln(Q((43, 53.6), (48, 55.2), (53, 53.6)), 1.1) & ~El(48, 57.6, 5, 1.4), bs[3])      # bigote
    # patas de gallo y frente
    for sx in (-1, 1):
        for k in range(3): cv.soft(Ln([(48 + sx * 12, sp['ey'] - .5 + k * 1.3), (48 + sx * 14.4, sp['ey'] - 1.3 + k * 2.1)], .3), sk[0], .6, .4, F)
    for yy in (24, 26.6, 29.2): cv.soft(Ln(Q((38, yy), (48, yy - .6), (58, yy)), .35), sk[0], .5, .5, F)
    brows(cv, sp, ex, F)
    # pelo lateral canoso
    side = Pg([(30.6, 45), (30, 30), (32, 24), (36, 24), (35, 33), (35.4, 42)], True); sideR = Pg([(65.4, 45), (66, 30), (64, 24), (60, 24), (61, 33), (60.6, 42)], True)
    cv.paint(side, hr, r=1.2, wl=.9, ol=.55); cv.paint(sideR, hr, r=1.2, wl=.3, ol=.55)
    # casco amarillo abollado con linterna
    hy = ramp('#e6b418', '#38180a', '#fff0a0')
    shell = Pg([(26, 30), (25, 22), (30, 12), (40, 6), (52, 5.4), (62, 8), (69, 15), (71, 24), (71, 30), (66, 27), (48, 24.5), (30, 27)], True)
    cv.paint(shell, hy, r=4, gain=1.3, wl=.9, ol=.65, tex=_NZ, texa=.06)
    cv.paint(Pg([(22, 30.5), (48, 26.5), (74, 30.5), (74, 33), (48, 29), (22, 33)], True), hy, r=1.2, wl=.7, ol=.6)                    # ala
    cv.paint(Ln(Q((34, 11), (48, 6.6), (62, 10)), 3.2), hy, r=1.1, wl=.9, ol=.45)                                                   # cresta central
    cv.soft(El(61, 17, 4.4, 3), '#4a2a08', .55, 1.0, shell); cv.soft(Ln(Q((57.5, 14), (61, 20), (64.5, 15.5)), .5), '#3a1a08', .7, .4, shell)   # abolladura
    cv.soft(Ln(Q((32, 18), (36, 12), (42, 9)), .8), '#fff4b0', .7, .5, shell)
    for pts in ([(33, 24), (39, 20.4)], [(54, 12), (59, 11.5)], [(64, 24), (67, 21)]): cv.flat(Ln(pts, .35), '#5a3010')                    # rascadas
    grain(cv, shell, '#3a2008', 90, 3, .45, .35); cv.flat(Ln(Q((28, 29.2), (48, 25.8), (70, 29.2)), .35), hy[1])
    # faro en el casco
    cv.paint(Rc(44.5, 7.4, 55.5, 16.4, 2), ramp('#8c8c94', '#18141c', '#e8e8ee'), r=1.3, wl=.7, ol=.6)
    cv.paint(El(50, 12, 3.2, 3.2), ramp('#f6e0a0', '#6a4010', '#ffffff'), r=1.1, ol=.4, wl=0); cv.flat(El(50, 12, 1.9, 1.9), '#fffbe8')
    glow = lamp(50, 12, 15, 2.0); al = (glow * .5 * cv.a)[..., None]; cv.rgb = cv.rgb * (1 - al) + np.array([255., 210, 120]) * al
    # gafas protectoras en la frente (bajo el casco)
    strap = Pg([(27, 22.4), (48, 19.6), (69, 22.4), (69, 25.6), (48, 22.8), (27, 25.6)], True); cv.paint(strap, ramp('#2a2a36', '#08060c', '#7a7a8a'), r=.8, wl=.6, ol=.5)
    for sx in (-1, 1):
        fr = Rc(48 + sx * 8.6 - 6.2, 18.6, 48 + sx * 8.6 + 6.2, 27.6, 3.4); cv.paint(fr, ramp('#2e2e3a', '#06040a', '#8a8a9c'), r=.8, wl=.7, ol=.5)
        lens = Rc(48 + sx * 8.6 - 4.9, 19.8, 48 + sx * 8.6 + 4.9, 26.6, 2.8); cv.flat(lens, '#243a4a'); cv.flat(lens & (YP > 23.4) & (XP < 48 + sx * 8.6), '#315462')
        cv.flat(Ln([(48 + sx * 8.6 - 3.4, 21.4), (48 + sx * 8.6 - 1.0, 20.8)], .7) & lens, '#d8f4ff'); cv.flat(El(48 + sx * 8.6 + 2.6, 25.2, .6, .6) & lens, '#a8d8ec')
    cv.paint(Rc(46.2, 22, 49.8, 24.2, .6), ramp('#2e2e3a', '#06040a', '#8a8a9c'), r=.4, ol=.4, wl=.3)
    sweat(cv, ex, 64., 40.)
    return finish_char(cv, ex, dead)

# ------------------------------------------------------------------ LIA
def draw_lia(ex, dead=False):
    cv = Cv(); sk = skin_ramp('#c8946c', '#3c1424', '#fff0d8'); hr = ramp('#0e0b14', '#04030a', '#5a6c8c')
    sp = dict(sk=sk, ey=40., gap=7.4, my=57.4, lip='#5a5a8c', bc='#0a0810', bhl='#1c1828', iris=[hx('#2a1a10'), hx('#42281a'), hx('#7a5030')], ir=2.9,
              bw=1.6, arch=1.0, ns=.9, nw=.9, jaw=.44, frx=15.0, fry=22.5, lash=1, sclera='#dcd2d0', lines=.4, fcy=40.5, blush=None, outer=.2, ew=4.5, eh=2.7, bagA=.2)
    # pelo largo empapado detras
    back = Pg([(28, 44), (26, 26), (32, 14), (48, 9), (64, 14), (70, 26), (68, 44), (74, 62), (80, 80), (84, 96), (12, 96), (16, 80), (22, 62)], True)
    cv.paint(back, hr, r=3.2, wl=.5, tex=_NZ, texa=.04)
    strands(cv, back, lambda x, y: math.pi * .5 + (48 - x) * .006 + (-.25 if x > 48 else .25) * (y < 40), hr, n=420, ln=22, wd=.5, seed=21, dark=.35, light=.4)
    # manta termica dorada con arrugas
    gold = ramp('#c89a30', '#2a1204', '#fff0b0')
    tors = Pg([(0, 96), (0, 88), (5, 79), (20, 72), (34, 68), (62, 68), (76, 72), (91, 79), (96, 88), (96, 96)], True)
    cv.paint(tors, gold, r=3.4, gain=1.2, amb=.55, wl=.8, tex=_NZ, texa=.08)
    r_ = np.random.default_rng(31); cr_ = []
    for _ in range(26):
        x0 = r_.uniform(2, 94); y0 = r_.uniform(70, 94); ang = r_.uniform(-.4, 1.0) + (math.pi if r_.random() < .5 else 0); L_ = r_.uniform(5, 12)
        cr_.append([(x0, y0), (x0 + math.cos(ang) * L_ * .5, y0 + math.sin(ang) * L_ * .5 + r_.normal(0, 1)), (x0 + math.cos(ang) * L_, y0 + math.sin(ang) * L_)])
    folds(cv, tors, [Q(*c, n=6) for c in cr_], '#3a1a06', '#fff4c0', w=.5, off=(-.8, -.6))
    cv.soft(Ln(Q((6, 90), (22, 80), (40, 76)), 1.6) & tors, '#fff0b8', .0, 1, tors)
    glint = np.zeros((W, W), bool)
    for x, y in ((12, 84), (24, 76), (74, 80), (86, 86), (30, 90), (66, 74)): glint |= El(x, y, .8, .5)
    cv.flat(glint & tors, '#fffbe0')
    # camiseta bajo la manta + cuello
    cv.paint(Pg([(36, 69), (48, 77), (60, 69), (58, 96), (38, 96)], True), ramp('#44506a', '#0a0c18', '#9aaac8'), r=1.5, wl=.4, ol=.4)
    neck = Pg([(41.5, 52), (42, 70), (54, 70), (54.5, 52)]); cv.paint(neck, sk, r=2.5, wl=.5, ol=.5); cv.soft(Pg([(40, 52), (57, 52), (57, 63), (40, 63)]), sk[0], .6, 2.5, neck)
    lap = Pg([(26, 78), (38, 66), (46, 72), (44, 90), (30, 96), (20, 90)], True); lap2 = Pg([(70, 78), (58, 66), (50, 72), (52, 90), (66, 96), (76, 90)], True)
    cv.paint(lap, gold, r=1.2, gain=.9, wl=.9, tex=_NZ, texa=.1); cv.paint(lap2, gold, r=1.2, gain=.9, wl=.3, tex=_NZ, texa=.1)
    folds(cv, lap, [[(30, 80), (36, 74)], [(32, 88), (40, 82)]], '#3a1a06', '#fff4c0', w=.5); folds(cv, lap2, [[(66, 80), (60, 74)], [(64, 88), (56, 82)]], '#3a1a06', '#fff4c0', w=.5)
    F = head_common(cv, sp, ex, rp=sk)
    # palidez y labios azulados + humedad
    cv.soft(F, '#8aa0c0', .13, 1.5, F); cv.soft(El(48, 57.4, 6, 3), '#6a78b8', .35, 1.0, F)
    wet = np.zeros((W, W), bool)
    for x, y in ((39, 30), (44, 33.5), (54, 31), (58, 43)): wet |= El(x, y, .55, .8)
    cv.flat(wet & F, '#f0f4ff')
    for x, y in ((40.5, 53), (57, 50)): cv.flat(El(x, y, .45, .7) & F, '#b8d8ff')
    # pelo delantero: raya al medio, mechones pegados a mejillas
    hairf = Pg([(30.5, 50), (29, 30), (33, 19), (42, 13), (48, 12.5), (54, 13), (63, 19), (67, 30), (65.5, 50), (63, 38), (60, 30), (55, 25.5), (48, 24.5), (41, 25.5), (36, 30), (33, 38)], True)
    cv.paint(hairf, hr, r=2.2, wl=.9, ol=.6)
    strands(cv, hairf, lambda x, y: (math.pi * .5 + (x - 48) * -.045 * (1 if y > 20 else 0) - (.6 if x < 48 else -.6) * (y < 22)) if y > 20 else (math.pi * .5 + (48 - x) * .06 - .3), hr, n=300, ln=16, wd=.45, seed=22, dark=.3, light=.5)
    cv.flat(Ln(Q((48, 12.5), (48, 18), (47.6, 24.4)), .4), sk[2])      # raya
    for pts in ([(36, 30), (34, 40), (36.6, 50), (35, 60)], [(60, 30), (62, 40), (59.6, 50), (61, 60)], [(41, 26), (38.5, 36), (39.5, 46)]):
        cv.paint(Stroke(cr(pts, 5)[:-6], 2.0, .6), hr, r=.6, ol=.4, wl=.8)
    cv.flat(Ln(Q((33, 22), (31, 32), (32, 44)), .5), hr[-2]); cv.flat(Ln(Q((42, 14.4), (36, 18), (33, 25)), .5), hr[-2]); cv.flat(Ln(Q((55, 15), (60, 18), (64, 24)), .4), hr[-1])
    cv.flat(Ln(Q((34, 56), (33, 66), (36, 76)), .5), hr[-2])
    sweat(cv, ex, 63.5, 33.)
    return finish_char(cv, ex, dead)

# ------------------------------------------------------------------ hojas y preview
CHARS = dict(guia=draw_guia, medica=draw_medica, ing=draw_ing, lia=draw_lia)
LIA_EX = dict(neutral=dict(open=1.25, br=(-1.0, -1.8), m=(-.5, 0, 4.0), pup=.8, gaze=(-.3, .5), wet=1),
              preocupado=dict(open=1.3, br=(-1.4, -2.8), m=(-1.3, 0, 4.2), pup=.8, gaze=(-.4, .6), wet=1, sweat=0),
              enfadado=dict(open=.9, lidcut=.3, br=(1.0, 2.2), flat=.5, m=(-1.2, 1.6, 5.0, 1), wet=1),
              feliz=dict(open=.95, br=(-1., -1.2), m=(1.6, 2.4, 5.2, 1), wet=1, cheeks=1, gaze=(.2, 0)))

def build(rid, name):
    ex = dict(EX[name]); fn = CHARS[rid]
    if rid == 'lia' and name in LIA_EX: ex = dict(LIA_EX[name])
    if rid == 'lia' and name == 'feliz': ex['m'] = (1.8, 1.8, 5.2, 1)
    if rid == 'lia': ex.setdefault('wet', 1)
    return fn(ex, dead=(name == 'dead'))

def gen7():
    note = 'v7 gotico oscuro 96x96 (estilo Blasphemous); fondo transparente'
    import os
    for rid in CHARS:
        if os.environ.get('ONLY') and rid != os.environ['ONLY']: continue
        sh = Image.new('RGBA', (S * 4, S), (0, 0, 0, 0))
        for i, n in enumerate(SHEET): sh.alpha_composite(build(rid, n), (i * S, 0))
        save(sh, 'portrait_' + rid, cell=S, fw=S, fh=S, frames=4, cols=4, expressions=SHEET, note=note + '; hoja horizontal neutral, preocupado, enfadado, feliz')
        for n in ('alert', 'hurt', 'talk'): save(build(rid, n), 'portrait_%s_%s' % (rid, n), expression=n, note=note)
        save(build(rid, 'dead'), 'portrait_%s_dead' % rid, expression='dead', note=note + '; gris frio, ojos cerrados')

def preview7(path, sc=3):
    import os
    L = lambda n: Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
    cell = S * sc + 4; sheet = Image.new('RGBA', (8 * cell, 4 * cell), (34, 22, 30, 255))
    for r, rid in enumerate(CHARS):
        ims = [L('portrait_' + rid).crop((i * S, 0, i * S + S, S)) for i in range(4)] + [L('portrait_%s_%s' % (rid, k)) for k in ('alert', 'hurt', 'talk', 'dead')]
        for c, im in enumerate(ims):
            t = Image.new('RGBA', (S, S), (44, 30, 38, 255)); t.alpha_composite(im); sheet.alpha_composite(t.resize((S * sc, S * sc), Image.NEAREST), (c * cell, r * cell))
    sheet.convert('RGB').save(path)

if __name__ == '__main__':
    import os
    gen7(); preview7(os.path.join(OUT, '..', 'preview_cast7.png'))
