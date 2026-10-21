"""artlib: utilidades de pixel art procedural (numpy + Pillow) para tools/gen-sprites.py.
Técnicas: rampas de color con cambio de tono, dithering ordenado Bayer, ruido fbm con semilla,
sombreado por volumen (heightmap desenfocado), rim light, niebla dithered, reflejo de agua."""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'gen')
os.makedirs(OUT, exist_ok=True)
META = {}


def hx(s):
    s = s.lstrip('#'); return np.array([int(s[i:i+2], 16) for i in (0, 2, 4)], float)
def R(*cols): return np.array([hx(c) for c in cols])
def mix(a, b, t): return a + (b - a) * t

_B8 = np.array([[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
                [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]]) / 64 + 1/128
def bayer(h, w, ox=0, oy=0):
    return np.tile(_B8, (h // 8 + 2, w // 8 + 2))[oy:oy+h, ox:ox+w]

def rng(seed): return np.random.default_rng(seed)

def noise(w, h, seed, sx=16, sy=None, octv=4, pers=.5, wrapx=False, ridged=False):
    """fbm 0..1. sx,sy = periodo de la octava base en px. wrapx => tileable en X (w múltiplo del periodo ideal)."""
    sy = sy or sx; r = rng(seed); tot = np.zeros((h, w)); amp = 1; norm = 0
    for o in range(octv):
        px, py = max(sx / 2**o, 1.5), max(sy / 2**o, 1.5)
        gw = int(round(w / px)) if wrapx else int(math.ceil(w / px)) + 2
        gh = int(math.ceil(h / py)) + 2; gw = max(gw, 2)
        g = r.random((gh, gw))
        xs = np.arange(w) * (gw / w if wrapx else 1 / px); ys = np.arange(h) / py
        ix = np.floor(xs).astype(int); iy = np.floor(ys).astype(int); fx = xs - ix; fy = ys - iy
        fx = fx*fx*(3-2*fx); fy = fy*fy*(3-2*fy)
        ix1 = (ix + 1) % gw if wrapx else ix + 1; ix = ix % gw if wrapx else ix
        a = g[iy][:, ix]; b = g[iy][:, ix1]; c = g[iy+1][:, ix]; d = g[iy+1][:, ix1]
        v = (a*(1-fx) + b*fx) * (1-fy)[:, None] + (c*(1-fx) + d*fx) * fy[:, None]
        if ridged: v = 1 - np.abs(2*v - 1)
        tot += v * amp; norm += amp; amp *= pers
    t = tot / norm
    return t

def norm01(a):
    lo, hi = a.min(), a.max(); return (a - lo) / (hi - lo + 1e-9)

def ramp_map(v, cols, dw=.8, ox=0, oy=0, dither=True):
    """v 0..1 -> color de la rampa `cols` (n,3) con dither ordenado (dw=ancho de banda de dithering)."""
    h, w = v.shape; n = len(cols)
    pos = np.clip(v, 0, .99999) * (n - 1); lo = np.floor(pos).astype(int); fr = pos - lo
    if dither: hi = ((fr - .5) / dw + .5) > bayer(h, w, ox, oy)
    else: hi = fr > .5
    return cols[np.clip(lo + hi, 0, n - 1)]

def dmask(a, ox=0, oy=0):
    """alfa 0..1 -> máscara booleana con dither ordenado"""
    return a > bayer(a.shape[0], a.shape[1], ox, oy)

def lmask(a, levels=5):
    """cuantiza alfa en `levels` pasos con dither (para glow con paleta limitada) -> float"""
    h, w = a.shape; return np.floor(np.clip(a, 0, 1) * levels + bayer(h, w)) / levels


class Cv:
    """lienzo RGB float (h,w,3)"""
    def __init__(self, w, h, fill=(0, 0, 0)):
        self.w, self.h = w, h; self.a = np.zeros((h, w, 3)) + np.array(fill, float)
        self.yy, self.xx = np.mgrid[0:h, 0:w]
    def put(self, mask, col):
        col = np.asarray(col, float)
        if col.ndim == 3: self.a[mask] = col[mask]
        else: self.a[mask] = col
    def blend(self, alpha, col):  # mezcla suave (alpha float 0..1)
        col = np.asarray(col, float); al = np.clip(alpha, 0, 1)[..., None]
        self.a = self.a * (1 - al) + (col if col.ndim == 3 else col[None, None]) * al
    def glow(self, x, y, r, col, s=1., p=2., levels=6, sx=1., sy=1.):
        d = np.sqrt(((self.xx - x) / (r * sx))**2 + ((self.yy - y) / (r * sy))**2)
        a = np.clip(1 - d, 0, 1)**p * s; a = lmask(a, levels); self.blend(a, col)
    def add(self, alpha, col, levels=6):  # luz aditiva dithered
        a = lmask(alpha, levels); self.a = np.clip(self.a + a[..., None] * np.asarray(col, float) , 0, 255)
    def fog(self, dens, col, ox=0, oy=0):
        m = dmask(np.clip(dens, 0, 1), ox, oy); self.a[m] = np.asarray(col, float) if np.ndim(col) == 1 else col[m]
    def fog_soft(self, dens, col, levels=4):
        self.blend(lmask(dens, levels), col)
    def vignette(self, s=.55, col=(8, 4, 20), p=2.2):
        d = np.sqrt(((self.xx - self.w/2) / (self.w/2))**2 + ((self.yy - self.h/2) / (self.h/2))**2) / 1.35
        self.blend(lmask(np.clip(d, 0, 1)**p * s, 6), col)
    def img(self, colors=96):
        im = Image.fromarray(np.clip(self.a, 0, 255).astype(np.uint8), 'RGB')
        return im.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB') if colors else im


def poly(w, h, pts, ss=4):
    im = Image.new('L', (w*ss, h*ss), 0); ImageDraw.Draw(im).polygon([(x*ss, y*ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((w, h), Image.BOX)) > 127
def ell(w, h, cx, cy, rx, ry, ss=4):
    im = Image.new('L', (w*ss, h*ss), 0); ImageDraw.Draw(im).ellipse([(cx-rx)*ss, (cy-ry)*ss, (cx+rx)*ss, (cy+ry)*ss], fill=255)
    return np.asarray(im.resize((w, h), Image.BOX)) > 127
def rect(w, h, x0, y0, x1, y1):
    m = np.zeros((h, w), bool); m[max(int(y0), 0):max(int(y1), 0), max(int(x0), 0):max(int(x1), 0)] = True; return m
def line(w, h, pts, wd=1, ss=4):
    im = Image.new('L', (w*ss, h*ss), 0); ImageDraw.Draw(im).line([(x*ss, y*ss) for x, y in pts], fill=255, width=max(1, int(wd*ss)))
    return np.asarray(im.resize((w, h), Image.BOX)) > 127
def drawmask(w, h, fn, ss=4):
    """fn(draw, s) dibuja en lienzo ss veces mayor; devuelve máscara booleana"""
    im = Image.new('L', (w*ss, h*ss), 0); fn(ImageDraw.Draw(im), ss)
    return np.asarray(im.resize((w, h), Image.BOX)) > 127

def blur(m, r):
    im = Image.fromarray((np.asarray(m, float) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im, float) / 255

def shade(mask, cols, L=(-.6, -.7), r=2.0, amb=.42, gain=1.6, dw=.7, dither=True, ox=0, oy=0, tex=None, texamt=.12):
    """Color por volumen: heightmap = máscara desenfocada; lambert con luz L (hacia donde mira la luz, x,y)."""
    hgt = blur(mask, r) * r * 2
    gy, gx = np.gradient(hgt)
    lx, ly = L; ln = math.hypot(lx, ly) or 1; lx, ly = lx/ln, ly/ln
    lam = -(gx * lx + gy * ly) * gain  # superficie que mira a la luz => gradiente apunta contra L
    v = amb + lam
    if tex is not None: v = v + (tex - .5) * texamt * 2
    return ramp_map(np.clip(v, 0, 1), cols, dw=dw, ox=ox, oy=oy, dither=dither)

def rim(mask, L=(-1, -1), n=1):
    """borde de la máscara orientado hacia la luz (L = dirección DESDE donde llega la luz)."""
    lx, ly = int(np.sign(L[0])), int(np.sign(L[1]))
    sh = np.roll(np.roll(mask, -ly * n, 0), -lx * n, 1)
    # pixel en máscara cuyo vecino hacia la luz está fuera
    return mask & ~sh

def edge(mask, n=1):
    """contorno interior (px de la máscara con vecino 4 fuera)"""
    m = mask; e = np.zeros_like(m)
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        e |= m & ~np.roll(np.roll(m, dy, 0), dx, 1)
    return e

def dilate(mask, n=1):
    m = mask.copy()
    for _ in range(n):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m

def stars(cv, n, seed, ymax, cols=((255, 240, 220), (200, 220, 255)), twinkle=True):
    r = rng(seed)
    for _ in range(n):
        x, y = r.integers(0, cv.w), r.integers(0, ymax); c = np.array(cols[r.integers(0, len(cols))], float)
        cv.a[y, x] = mix(cv.a[y, x], c, r.choice((.4, .7, 1.)))

def snow(cv, n, seed, ymax=None, sizes=(1, 1, 1, 2), wind=.4, alpha=(.5, .8, 1.), col=(240, 236, 255), blurry=0):
    r = rng(seed); ymax = ymax or cv.h
    for _ in range(n):
        x, y = r.integers(0, cv.w), r.integers(0, ymax); s = sizes[r.integers(0, len(sizes))]; a = alpha[r.integers(0, len(alpha))]
        L = 1 + int(s * 1.5 * wind * 3) if blurry else 1
        for k in range(L):
            xx, yy = int(x - k * wind * 1.5) % cv.w, y - k
            if 0 <= yy < cv.h:
                for dx in range(s):
                    for dy in range(s):
                        if 0 <= yy+dy < cv.h and 0 <= xx+dx < cv.w:
                            cv.a[yy+dy, xx+dx] = mix(cv.a[yy+dy, xx+dx], np.array(col, float), a / (1 + k * .7))

def save(img, name, optimize=True, colors=None, **meta):
    """img: PIL RGBA/RGB. Guarda PNG optimizado (opcionalmente paleta indexada) y registra meta."""
    if colors:
        if img.mode == 'RGBA':
            q = img.quantize(colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        else: q = img.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        q.save(os.path.join(OUT, name + '.png'), optimize=True)
    else:
        img.save(os.path.join(OUT, name + '.png'), optimize=optimize)
    META[name] = dict(w=img.width, h=img.height, **meta)

def preview(names, path, cols=3, scale=2, bg=(30, 20, 50)):
    ims = [Image.open(os.path.join(OUT, n + '.png')).convert('RGBA') for n in names]
    cw = max(i.width for i in ims); ch = max(i.height for i in ims); rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGBA', (cols * (cw + 4), rows * (ch + 4)), bg + (255,))
    for k, i in enumerate(ims): sh.alpha_composite(i, ((k % cols) * (cw + 4), (k // cols) * (ch + 4)))
    sh = sh.resize((sh.width * scale, sh.height * scale), Image.NEAREST); sh.save(path)
