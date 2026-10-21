"""ART v6: reparto "dibujado" (estilo ilustracion: formas claras, outline oscuro, cel-shading, ojos grandes con brillo).
Se dibuja a 8x (512px) con mascaras booleanas y se reduce a 64x64 con promedio de area (bordes suaves, no pixel-foto).
Genera: portrait_<guia|medica|ing|lia>[ _alert|_hurt|_talk|_dead ], pers_<marta|leo|hugo|sara>[ _hurt|_dead ], npc_*, dlg_frame, dlg_portrait_frame."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artlib import hx, save

S = 64; SS = 8; W = S * SS
INK = hx('#160c2a')

# ------------------------------------------------------------------ primitivas (mascaras bool W x W)
def _m(fn):
    im = Image.new('L', (W, W), 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 127
def cr(pts, n=7):
    P = np.array(pts, float); N = len(P); out = []
    for i in range(N):
        p0, p1, p2, p3 = P[(i - 1) % N], P[i], P[(i + 1) % N], P[(i + 2) % N]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return [tuple(p) for p in out]
def Pg(pts, sm=False):
    q = cr(pts) if sm else pts
    return _m(lambda d: d.polygon([(x * SS, y * SS) for x, y in q], fill=255))
def El(cx, cy, rx, ry): return _m(lambda d: d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=255))
def Ln(pts, w):
    def f(d):
        q = [(x * SS, y * SS) for x, y in pts]; d.line(q, fill=255, width=max(1, int(w * SS)), joint='curve'); r = w * SS / 2
        for x, y in (q[0], q[-1]): d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return _m(f)
def Rc(x0, y0, x1, y1, r): return _m(lambda d: d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS, fill=255))
def Rot(cx, cy, w, h, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return Pg([(cx + x * c - y * s, cy + x * s + y * c) for x, y in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))])
def Q(p0, p1, p2, n=14): return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]
def U(*ms):
    r = ms[0].copy()
    for m in ms[1:]: r |= m
    return r
YY, XX = np.mgrid[0:W, 0:W]; XP = XX / SS; YP = YY / SS

def dil(m, r):
    k = int(r * SS) * 2 + 1
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(min(k, 31)))) > 127
def col(c): return hx(c) if isinstance(c, str) else np.asarray(c, float)
def mix(a, b, t): a = col(a); return a + (col(b) - a) * t

class Cv:
    def __init__(s): s.rgb = np.zeros((W, W, 3)); s.a = np.zeros((W, W), bool)
    def part(s, m, c, ol=.85, sh=.34, hl=0., shc='#2a1068', sd=1.7, hlc='#fff2d0'):
        c = col(c)
        if ol: o = dil(m, ol); s.rgb[o] = INK; s.a |= o
        s.rgb[m] = c; s.a |= m
        if sh:
            d = int(sd * SS); sm = m & ~np.roll(m, (-d, -d), (0, 1)); s.rgb[sm] = mix(c, col(shc), sh)
        if hl:
            d = int(.9 * SS); lm = m & ~np.roll(m, (d, d), (0, 1)); lm &= ~(m & ~np.roll(m, (-int(sd * SS),) * 2, (0, 1)))
            s.rgb[lm] = mix(c, col(hlc), hl)
    def flat(s, m, c): s.rgb[m] = col(c); s.a |= m
    def tint(s, m, c, a): s.rgb[m] = mix(s.rgb[m], col(c), a)
    def cast(s, top, dx=0, dy=2.2, k=.38, c='#2a1068'):
        r = np.roll(top, (int(dy * SS), int(dx * SS)), (0, 1)) & ~top & s.a; s.rgb[r] = mix(s.rgb[r], col(c), k)
    def finish(s, light=True):
        a = s.a.astype(float); rgb = s.rgb.copy()
        if light:
            warm = np.clip((34 - XP) / 34, 0, 1) ** 1.3 * .20; cool = np.clip((XP - 36) / 28, 0, 1) ** 1.4 * .26
            rgb = mix(rgb, np.array([255., 150, 60]), warm[..., None]); rgb = mix(rgb, np.array([70., 150, 255]), cool[..., None])
        A = a.reshape(S, SS, S, SS).mean((1, 3)); C = (rgb * a[..., None]).reshape(S, SS, S, SS, 3).mean((1, 3)) / np.maximum(A[..., None], 1e-6)
        o = np.zeros((S, S, 4), np.uint8); o[..., :3] = np.clip(C, 0, 255).astype(np.uint8); o[..., 3] = np.clip(A * 255 + .5, 0, 255).astype(np.uint8)
        return Image.fromarray(o, 'RGBA')

def face_mask(sp):
    cx, cy, rx, ry, jw = 32., sp['cy'], sp['rx'], sp['ry'], sp['jaw']; pts = []
    for t in np.linspace(0, 2 * math.pi, 72, endpoint=False):
        y = cy + ry * math.sin(t); x = rx * math.cos(t)
        if y > cy: x *= 1 - jw * ((y - cy) / ry) ** 2
        pts.append((cx + x, y))
    return Pg(pts)

# ------------------------------------------------------------------ expresiones
EXP = dict(
    neutral=dict(eo=1., br=(0, 0), m=(1.0, 0, 3.0)),
    preocupado=dict(eo=1.05, br=(-.2, -2.6), m=(-1.2, 0, 2.6), sweat=1),
    enfadado=dict(eo=.9, lid=1, br=(.9, 3.0), m=(-1.3, 2.4, 3.6, 1)),
    asustado=dict(eo=1.35, pup=.55, br=(-2.2, -2.2), m=(-.6, 3.6, 3.0), tears=1),
    feliz=dict(arc=1, br=(-1.4, -.2), m=(2.4, 3.6, 4.6, 1, 1), blush=1),
    alert=dict(eo=1.4, pup=.55, br=(-2.6, -1.2), m=(0, 3.4, 2.0)),
    hurt=dict(chev=1, br=(.5, -2.8), m=(-1.6, 2.4, 3.8, 1), bruise=1),
    talk=dict(eo=1., br=(-.5, -.3), m=(1.0, 3.0, 3.2, 1)),
    dead=dict(shut=1, br=(1.0, -1.6), m=(-.3, 0, 2.8)),
)
SHEET_R = ['neutral', 'preocupado', 'enfadado', 'feliz']
SHEET_P = ['neutral', 'preocupado', 'asustado', 'feliz']

def eyes(cv, sp, e):
    ey, gap = sp['ey'], sp['gap']; er = sp.get('er', 1.); sk = sp['skin']
    for sx in (-1, 1):
        x = 32 + sx * gap; rx = 3.5 * er; ry = 4.3 * e.get('eo', 1.) * er
        if e.get('arc'):
            cv.flat(Ln(Q((x - 3.3, ey + 1.6), (x, ey - 3.0), (x + 3.3, ey + 1.6)), 1.3), INK)
            if sp.get('lash'): cv.flat(Ln([(x + sx * 3.3, ey + 1.5), (x + sx * 4.8, ey + .2)], .8), INK)
        elif e.get('shut'):
            cv.flat(Ln(Q((x - 3.2, ey - .4), (x, ey + 1.6), (x + 3.2, ey - .4)), 1.0), mix(INK, hx('#6a6a9a'), .35))
        elif e.get('chev'):
            cv.flat(Ln([(x - sx * 3.0, ey - 2.6), (x + sx * 2.6, ey + .2), (x - sx * 3.0, ey + 2.6)], 1.2), INK)
        else:
            wh = El(x, ey, rx, ry)
            if e.get('lid'):   # parpado cortado en diagonal (enfado): interior mas bajo
                cut = (YP > (ey - ry * .5) + (sx * (XP - x)) * -.55 * -1 + 0) if False else (YP > (ey - ry * .35 - sx * (XP - x) * -.0) + (-sx * (XP - x)) * .42 * -1)
                # linea: en el lado externo y=ey-ry*.7, en el interno y=ey-ry*.05
                t = np.clip(((-sx) * (XP - x) + rx) / (2 * rx), 0, 1)       # 0 externo ... 1 interno
                cut = YP > (ey - ry * .75) + t * ry * .8; wh = wh & cut
            cv.flat(wh, '#f4eef8'); cv.flat(wh & (YP < ey - ry * .45), '#d3c8e6')
            ix = x - sx * .15; iy = ey + .35; irx = 2.75 * er; iry = min(3.4 * er, ry * 1.0 + .6)
            ir = El(ix, iy, irx, iry) & wh; i3 = sp['iris']
            cv.flat(ir, i3[1]); cv.flat(ir & (YP < iy - .5), i3[0]); cv.flat(ir & (YP > iy + .8) & (np.abs(XP - ix) < irx * .7), i3[2])
            cv.flat(El(ix, iy + .1, 1.35 * e.get('pup', 1.) * er, 1.35 * e.get('pup', 1.) * er) & wh, '#0c0618')
            cv.flat(El(ix - 1.0, iy - 1.2, 1.1 * er, 1.1 * er) & wh, '#ffffff'); cv.flat(El(ix + 1.2, iy + 1.5, .55 * er, .55 * er) & wh, '#e4f6ff')
            top = [(x + (rx + .1) * math.cos(a), ey + (ry + .05) * math.sin(a)) for a in np.linspace(math.pi * 1.04, math.pi * 1.96, 12)]
            if e.get('lid'): top = [(px, (ey - ry * .75) + np.clip(((-sx) * (px - x) + rx) / (2 * rx), 0, 1) * ry * .8) for px, _ in top]
            cv.flat(Ln(top, 1.25), INK)
            cv.flat(Ln([(x - rx * .8, ey + ry + .3), (x, ey + ry + .6), (x + rx * .8, ey + ry + .3)], .45), mix(sk[1], INK, .35))
            if sp.get('lash'): cv.flat(Ln([(x + sx * (rx + .1), ey - ry * .5), (x + sx * (rx + 1.7), ey - ry * .5 - 1.6)], .85), INK)
            if e.get('tears'):
                cv.flat(El(x, ey + ry - .3, rx * .9, .9) & ~wh | (El(x, ey + ry - .2, rx * .8, .9)), '#9fe4ff')
                cv.flat(Ln([(x - sx * .3, ey + ry + .6), (x + sx * .7, ey + ry + 4.5), (x + sx * .3, ey + ry + 8)], 1.3), '#a6e8ff')
                cv.flat(Pg([(x + sx * .3, ey + ry + 8.8), (x + sx * 1.5, ey + ry + 10.4), (x + sx * .3, ey + ry + 11.6), (x - sx * .9, ey + ry + 10.4)], True), '#8cdcff')
                cv.flat(El(x + sx * .1, ey + ry + 10.1, .35, .5), '#ffffff')
        if e.get('blush') or sp.get('blush'):
            cv.tint(El(x + sx * 3.4, ey + 6.4, 2.9, 1.6) & cv.a, sp.get('blushc', '#ff4f7a'), .5 if e.get('blush') else .2)
    # cejas
    raise_, inner = e['br']; bw = sp.get('bw', 1.8)
    for sx in (-1, 1):
        x = 32 + sx * gap; by = ey - 6.3 + raise_ + sp.get('browlow', 0)
        o = (x + sx * 4.6, by + .2); i = (x - sx * 3.6, by + inner * .8 + .1); m = ((o[0] + i[0]) / 2, (o[1] + i[1]) / 2 - 1.0 + (inner > 1.2) * .8)
        cv.flat(Ln(Q(i, m, o, 10), bw), sp['bc'])
def nose(cv, sp):
    ey = sp['ey']; sk = sp['skin']; s = sp.get('ns', 1.)
    cv.flat(Ln([(33.0, ey + 3.4 * s), (34.0, ey + 6.2 * s), (32.2, ey + 6.9 * s)], .8), mix(sk[1], INK, .38))
    cv.tint(El(31.5, ey + 5.6 * s, .9, .7), '#fff0e0', .5)
def mouth(cv, sp, e):
    c, h, w = e['m'][:3]; teeth = e['m'][3] if len(e['m']) > 3 else 0; tongue = e['m'][4] if len(e['m']) > 4 else 0
    my = sp['my']; w *= sp.get('mw', 1.); ts = np.linspace(-1, 1, 27)
    up = [(32 + t * w, my + .5 * c - c * t * t) for t in ts]
    if sp.get('lippatch'): cv.flat(El(32, my + .3, w + .9, 1.9 + h * .5), sp['lip'])
    if h < .4:
        cv.flat(Ln(up, 1.0), mix(sp['lip'], INK, .62)); cv.flat(Ln([(32 + t * w * .7, my + .5 * c - c * t * t * 1 + 1.1) for t in np.linspace(-.7, .7, 9)], .7) if not sp.get('lippatch') else np.zeros((W, W), bool), mix(sp['lip'], hx('#ffffff'), .1))
        for sx in (-1, 1):
            if c > .5: cv.flat(El(32 + sx * (w + .8), my - .5 * c + .3, .5, .5), mix(sp['skin'][1], INK, .3))
        return
    lo = [(32 + t * w, my + .5 * c - c * t * t + h * (1 - t * t) ** .6) for t in ts]
    m = Pg(up + lo[::-1])
    cv.flat(dil(m, .55) & ~m, INK); cv.flat(m, '#4e0f2c')
    cv.flat(m & (YP > my + .5 * c + h * .45), '#c8365a')
    if tongue: cv.flat(m & (YP > my + .5 * c + h * .55) & (np.abs(XP - 32) < w * .55), '#ff7694')
    if teeth: cv.flat(m & (YP < my + .5 * c - c * ((XP - 32) / w) ** 2 + 1.5), '#fffaf2')
    cv.flat(Ln(up, .75), INK)

def accents(cv, sp, e, skin_mask):
    ey, gap = sp['ey'], sp['gap']
    if e.get('bruise'):
        cv.tint(El(32 + gap + 3.6, ey + 5.5, 3.0, 2.2) & skin_mask, '#8a4ab8', .6)
        cv.flat(Rot(32 - gap - 3.0, ey + 8.2, 5.6, 2.2, -32) & skin_mask, '#f6dcb4'); cv.flat(Ln([(32 - gap - 4.6, ey + 8.7), (32 - gap - 1.4, ey + 7.0)], .3), '#d8a878')
        cv.flat(Ln([(32 + gap + 2, ey - 7.5), (32 + gap + 4.5, ey - 5.4)], .6) & skin_mask, '#c8283c')
def sweat(cv, e, x=47.6, y=22.5):
    if e.get('sweat'):
        cv.part(Pg([(x, y - 2.6), (x + 1.7, y + .4), (x, y + 2.0), (x - 1.7, y + .4)], True), '#8cdcff', ol=.5, sh=.25)
        cv.flat(El(x - .4, y + .4, .4, .6), '#ffffff')

def head_base(cv, sp, e, ears=True):
    sk = sp['skin']; F = face_mask(sp)
    if ears:
        er = U(El(32 - sp['rx'] - .2, sp['ey'] + 1.5, 2.3, 3.5), El(32 + sp['rx'] + .2, sp['ey'] + 1.5, 2.3, 3.5)); cv.part(er, sk[0], sh=.3, shc=sk[1])
    cv.part(F, sk[0], sh=.45, shc=sk[1], sd=2.0, hl=.2, hlc=sk[2])
    return F

def _skin(b, s, h): return (b, s, h)

# ------------------------------------------------------------------ cuerpos comunes
def torso_pts(l=2, r=62, y0=47.5): return [(l, 64.5), (l + 1.5, 57), (l + 9, 51), (24, y0), (40, y0), (r - 9, 51), (r - 1.5, 57), (r, 64.5)]
def torso(cv, c, pts=None, sc='#2a1068', hl=.25, **k):
    m = Pg(pts or torso_pts(), True); cv.part(m, c, shc=sc, hl=hl, sd=2.2, **k); return m
def neck(cv, sp, y1=50.):
    m = Pg([(27, 36), (37, 36), (38.5, y1), (25.5, y1)]); cv.part(m, mix(col(sp['skin'][0]), col(sp['skin'][1]), .55), ol=.8, sh=0); return m

# ------------------------------------------------------------------ reparto
def asig(sp, **k): d = dict(cy=27.5, rx=13.2, ry=15., jaw=.32, ey=28.6, gap=6.5, my=37.6, bw=1.8, ns=1.); d.update(sp); d.update(k); return d

def draw_marta(e):
    cv = Cv(); sp = asig(dict(skin=('#f2bf9e', '#d98e88', '#fff0dc'), iris=['#2a6a4a', '#3f9a68', '#9ae0b0'], bc='#c4bedc', lip='#d9506c', gap=6.3, bw=1.6, blushc='#ff6a8a', blush=1))
    hair = ('#f0eef8', '#a39ccf', '#ffffff')
    back = U(El(32, 21, 16.2, 15.5), El(32, 8.5, 6.8, 6.2))
    cv.part(back, hair[0], shc=hair[1], sh=.5, sd=2.2)
    cv.flat(Ln(Q((27, 6.5), (32, 4.6), (37, 6.5)), .5), hair[1]); cv.flat(Ln(Q((28, 10.5), (32, 12), (36, 10.5)), .5), hair[1])
    cv.part(Pg([(0, 64.5), (1, 57), (8, 50.5), (22, 47.5), (42, 47.5), (56, 50.5), (63, 57), (64, 64.5)], True), '#33b4aa', shc='#124a7a', sd=2.2, hl=.2)
    nk = neck(cv, sp, 52)
    shawl = Pg([(0, 64.5), (0, 55), (7, 49), (20, 45.5), (28, 50), (32, 57), (36, 50), (44, 45.5), (57, 49), (64, 55), (64, 64.5)], True)
    cv.part(shawl, '#b2338a', shc='#4a1060', sd=2.4, hl=.25, hlc='#ff9ad0')
    for k in range(6):
        cv.flat(Ln([(2 + k * 11 - 6, 66), (14 + k * 11 - 6, 47)], .9) & shawl, '#f06ab0')
    cv.flat(Ln([(0, 62.6), (64, 62.6)], .6) & shawl, '#ffd890')
    cv.part(El(21.5, 54.5, 2.4, 2.4), '#ffd24a', ol=.6, shc='#b87a10'); cv.flat(El(21.5, 54.5, 1.0, 1.0), '#e8284a'); cv.flat(El(21.0, 54.0, .35, .35), '#ffffff')
    F = head_base(cv, sp, e)
    cv.cast(F, 0, 2.6, .35, '#7a2a50') if False else None
    eyes(cv, sp, e); nose(cv, sp)
    for sx in (-1, 1):   # arrugas: patas de gallo y sonrisa
        cv.flat(Ln([(32 + sx * 11.0, 27.6), (32 + sx * 12.3, 26.8)], .4), '#c27a78'); cv.flat(Ln([(32 + sx * 11.0, 29.4), (32 + sx * 12.4, 29.9)], .4), '#c27a78')
        cv.flat(Ln(Q((32 + sx * 5.6, 33.6), (32 + sx * 7.4, 37.0), (32 + sx * 5.8, 40.4), 8), .4), '#d08a88')
    mouth(cv, sp, e)
    fr = Pg([(15.4, 30), (15.0, 20), (18.6, 13), (26, 9.5), (32, 8.8), (38, 9.5), (45.4, 13), (49, 20), (48.6, 30), (45.4, 23), (40.5, 17.2), (35, 14.6), (32, 14.2), (29, 14.6), (23.5, 17.2), (18.6, 23)], True)
    cv.part(fr, hair[0], shc=hair[1], sh=.5, sd=2.0, hl=.3, ol=.7)
    for pts in ([(24, 15), (21, 20), (19.6, 26)], [(40, 15), (43, 20), (44.4, 26)], [(32, 13), (28, 12), (24, 13)]): cv.flat(Ln(Q(*pts), .45), hair[1])
    cv.part(Rot(32, 8.8, 1, 1, 0) | El(24.6, 8.4, 0, 0), hair[0]) if False else None
    for sx in (-1, 1):   # gafas de leer + montura dorada
        x = 32 + sx * sp['gap']; ring = El(x, sp['ey'] + .6, 5.0, 4.6)
        cv.tint(ring, '#cfeeff', .18); cv.flat(dil(ring, .5) & ~ring, '#e6a22a'); cv.flat(Ln([(x - sx * 2.4, sp['ey'] - 3.0), (x - sx * 3.6, sp['ey'] - 1.6)], .6), '#ffffff')
        cv.flat(Ln([(x + sx * 4.9, sp['ey'] - .6), (x + sx * 7.4, sp['ey'] - 1.2)], .5), '#e6a22a')
    cv.flat(Ln(Q((32 - 1.4, sp['ey'] + .1), (32, sp['ey'] - 1.1), (32 + 1.4, sp['ey'] + .1), 6), .55), '#e6a22a')
    cv.part(El(17.2, 36.0, 1.1, 1.5), '#ffd24a', ol=.4, sh=0)
    cv.part(El(46.8, 36.0, 1.1, 1.5), '#ffd24a', ol=.4, sh=0)
    sweat(cv, e); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_leo(e):
    cv = Cv(); sp = asig(dict(cy=30., rx=14.4, ry=14., jaw=.2, ey=31.2, gap=6.9, my=40.6, er=1.12, ns=.7, skin=('#f8c8a2', '#e29488', '#fff0dc'), iris=['#1c3a9a', '#3a74e8', '#9ad0ff'], bc='#6a3a1c', lip='#e0607a', bw=1.6, blush=1, blushc='#ff6a7a'))
    cv.part(Pg(torso_pts(10, 54, 48.5), True), '#2f7de8', shc='#1a2a9a', sd=2.2, hl=.25, hlc='#9ac8ff')
    for yy in (53.4, 57.6, 61.8): cv.flat(Ln([(0, yy), (64, yy)], 1.0) & Pg(torso_pts(10, 54, 48.5), True), '#f4f0ff')
    nk = neck(cv, sp, 52); cv.part(Pg([(24.5, 47.5), (32, 52.5), (39.5, 47.5), (37, 46), (27, 46)], True), '#ffd23a', ol=.6, shc='#c87a10')
    F = head_base(cv, sp, e)
    # flequillo y mechones debajo del casco
    tufts = Pg([(18.2, 33), (17.5, 24), (22, 22), (24, 27), (27, 23), (30, 28), (34, 23), (37.5, 28), (40, 23), (43, 27), (46, 22), (46.8, 25), (46.2, 33), (44.5, 28), (38, 21), (26, 21), (19.6, 28)])
    cv.part(tufts, '#7a4420', shc='#3a1a14', sd=1.4, hl=.25, hlc='#d88a4a', ol=.6)
    eyes(cv, sp, e); nose(cv, sp)
    for fx, fy in ((27.2, 36.2), (29.4, 37.2), (31.0, 36.0), (33.8, 36.0), (35.2, 37.2), (37.0, 36.2), (25.4, 38.0), (38.8, 38.0)): cv.flat(El(fx, fy - .3, .42, .42), '#c9674a')
    mouth(cv, sp, e)
    helm = Pg(cr([(10, 24), (9.5, 15), (16, 7.5), (32, 4.2), (48, 7.5), (54.5, 15), (54, 24)], 8)); brim = Rc(8, 20.8, 56, 25.2, 2.2)
    cv.cast(U(helm, brim), 0, 2.4, .5, '#5a1840')
    cv.part(helm, '#e8343c', shc='#8a1858', sd=2.4, hl=.35, hlc='#ff9a8a')
    cv.flat(Ln([(32, 4.6), (32, 21)], 2.6) & helm, '#ff5a58'); cv.flat(Ln([(23.6, 5.8), (14.5, 21)], 1.0) & helm, '#b02048'); cv.flat(Ln([(40.4, 5.8), (49.5, 21)], 1.0) & helm, '#b02048')
    cv.part(brim, '#c42a4a', shc='#6a1448', sd=1.2, hl=.2, ol=.8)
    st = [(21 + 5 * math.sin(a), 13.4 - 5 * math.cos(a)) for a in np.linspace(0, 2 * math.pi, 11)[:-1]]
    star = Pg([(21 + (5.3 if i % 2 == 0 else 2.3) * math.sin(i * math.pi / 5), 13.2 - (5.3 if i % 2 == 0 else 2.3) * math.cos(i * math.pi / 5)) for i in range(10)])
    cv.part(star, '#ffd23a', ol=.5, sh=.3, shc='#c87a10')
    for sx in (-1, 1): cv.flat(Ln([(32 + sx * 18.6, 25), (32 + sx * 19.2, 37), (32 + sx * 12.5, 45.5)], .9), '#2a2a52')
    cv.part(Rc(14.4, 44.2, 20, 47.2, .8), '#ffd24a', ol=.5, sh=.2)
    # linterna de juguete
    body = Rot(49.5, 58.5, 5.4, 11, 24); head = Rot(53.0, 51.0, 8.2, 4.8, 24 + 0)
    cv.part(body, '#ffd23a', shc='#c87a10', sd=1.0, hl=.3)
    hd = Pg([(52.5, 52.4), (56.5, 54.2), (59.8, 47.4), (55.4, 45.2)]); cv.part(hd, '#ff4a5a', shc='#8a1858', sd=1.0, hl=.3)
    cv.flat(Pg([(55.4, 46.0), (59.1, 47.8), (58.8, 48.6), (55.0, 46.8)]), '#fff6b0')
    cv.part(El(48, 60.4, 3.2, 2.8), '#f8c8a2', ol=.6, shc='#e29488', sh=.4)
    sweat(cv, e, 49.5, 31); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_hugo(e):
    cv = Cv(); sp = asig(dict(cy=28.8, rx=15.2, ry=14.2, jaw=.14, ey=30.2, gap=7.0, my=41.4, ns=1.25, skin=('#eea480', '#cf6c68', '#fff0d8'), iris=['#1c4a8a', '#3a8ad8', '#a0dcff'], bc='#b8380f', bw=2.4, lip='#ec7e6a', lippatch=1, mw=1.0, blush=1, blushc='#ff5a4a'))
    pack = Rc(2, 20, 62, 66, 11); roll = Rc(9, 12, 55, 24, 5.5)
    cv.part(roll, '#e8503a', shc='#7a1850', sd=2.0, hl=.3, hlc='#ffa090'); cv.part(pack, '#1b9aa8', shc='#0a3a7a', sd=2.6, hl=.28, hlc='#8af0f0')
    cv.flat(Ln([(14, 12.5), (14, 23.5)], 1.2), '#7a1850'); cv.flat(Ln([(50, 12.5), (50, 23.5)], 1.2), '#7a1850')
    cv.part(Pg(torso_pts(0, 64, 47.5), True), '#5aa832', shc='#1a5a4a', sd=2.4, hl=.25, hlc='#c8f070')
    for sx in (-1, 1): cv.part(Ln([(32 + sx * 18, 47.5), (32 + sx * 15.5, 65)], 4.6), '#2c2a48', ol=.7, sh=.2, shc='#0a0618')
    cv.flat(Ln([(15, 58.5), (49, 58.5)], 1.4), '#2c2a48'); cv.part(Rc(29.4, 56.4, 34.6, 60.6, 1), '#ffd24a', ol=.5, sh=.3, shc='#b87a10')
    cv.part(Pg([(22, 47), (26, 45.5), (32, 52), (38, 45.5), (42, 47), (38, 52), (32, 55), (26, 52)], True), '#e8e4f4', ol=.6, shc='#8a80c0')
    neck(cv, sp, 52)
    F = head_base(cv, sp, e)
    eyes(cv, sp, e); nose(cv, sp)
    cv.tint(El(32, sp['ey'] + 6.6, 1.5, 1.2), '#ff5a4a', .45)
    beard = Pg([(16.4, 30), (17, 41), (21, 48), (28, 52), (32, 52.8), (36, 52), (43, 48), (47, 41), (47.6, 30), (44.8, 36.4), (40, 38.4), (36, 37.4), (32, 38.2), (28, 37.4), (24, 38.4), (19.4, 36.4)], True)
    cv.part(beard, '#e0601e', shc='#a02a14', sd=2.0, hl=.35, hlc='#ffb050', ol=.8)
    for pts in ([(21, 41), (22, 46), (25, 49.4)], [(43, 41), (42, 46), (39, 49.4)], [(32, 46), (32, 49), (32, 51)], [(27, 41.5), (27.4, 46), (28.6, 49.6)], [(37, 41.5), (36.6, 46), (35.4, 49.6)]): cv.flat(Ln(Q(*pts), .5), '#a02a14')
    stash = Pg([(23.6, 38.8), (28, 36.4), (32, 37.8), (36, 36.4), (40.4, 38.8), (37, 40.2), (32, 39), (27, 40.2)], True); cv.part(stash, '#e8681e', shc='#a02a14', sd=1.0, hl=.35, hlc='#ffb050', ol=.55)
    mouth(cv, sp, e)
    beanie = Pg(cr([(13.4, 23), (14, 14), (21, 6.6), (32, 4.2), (43, 6.6), (50, 14), (50.6, 23)], 8))
    cuff = Rc(12.4, 15.4, 51.6, 23.0, 3.4)
    cv.cast(cuff, 0, 2.4, .5, '#1a1a60')
    cv.part(beanie, '#3a5ae0', shc='#1a1a7a', sd=2.4, hl=.3, hlc='#9ab0ff')
    for k in range(9): cv.flat(Ln([(17 + k * 3.8, 6 + abs(k - 4) * 1.2), (14 + k * 4.5, 16)], .4) & beanie, '#2a40b8')
    cv.part(cuff, '#f2f0ff', shc='#8a80d0', sd=1.6, hl=.2); 
    for k in range(10): cv.flat(Ln([(15.4 + k * 3.8, 16.2), (15.4 + k * 3.8, 22.2)], .45), '#b8b0ea')
    cv.flat(Ln([(13.5, 19.2), (50.5, 19.2)], .8) & cuff, '#e8503a')
    cv.part(El(32, 3.4, 4.2, 4.0), '#f2f0ff', shc='#8a80d0', sd=1.4, hl=.2)
    sweat(cv, e, 50.6, 27); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_sara(e):
    cv = Cv(); sp = asig(dict(cy=27.5, rx=12.8, ry=15., jaw=.4, ey=28.8, gap=6.4, my=37.8, ns=.9, skin=('#cd8d60', '#a05658', '#ffe0b0'), iris=['#3a1c18', '#6a3a28', '#c88a58'], bc='#2a1c3a', bw=1.5, lash=True, lip='#ff5a7a', blush=1, blushc='#ff4a6a'))
    tq = ('#20dcc8', '#0a8fb0', '#a8fff0')
    pad = Pg(torso_pts(1, 63, 47.5), True)
    cv.part(pad, '#f03a92', shc='#8a1a88', sd=2.2, hl=.3, hlc='#ff9ad0')
    cv.flat(Ln([(9, 51.5), (4, 66)], 2.4) & pad, '#f4f0ff'); cv.flat(Ln([(55, 51.5), (60, 66)], 2.4) & pad, '#f4f0ff')
    cv.flat(Ln([(32, 52), (32, 66)], .7), '#8a1a88'); cv.part(Rc(31, 55, 33, 58, .6), '#ffd24a', ol=.4, sh=0)
    for sx in (-1, 1): cv.part(Pg([(32 + sx * 4, 46), (32 + sx * 9.6, 44.6), (32 + sx * 11, 51.5), (32 + sx * 1, 53)]), '#ff58a8', ol=.7, shc='#8a1a88', hl=.3, sd=1.2)
    neck(cv, sp, 50)
    # trenzas turquesa
    for sx in (-1, 1):
        for i in range(8):
            x = 32 + sx * (15.6 + i * .32) + (.9 if i % 2 else -.9) * sx * .4; y = 31 + i * 4.1
            cv.part(El(x, y, 3.1 - i * .12, 2.6), tq[0], ol=.6, shc=tq[1], sd=1.0, hl=.35, hlc=tq[2])
        cv.part(El(32 + sx * 17.6, 64.2, 1.7, 1.5), '#ff3d8e', ol=.5, sh=0)
    cv.part(Pg([(32, 51), (20, 44.4), (19, 47), (32, 54), (45, 47), (44, 44.4)]), '#2b2b3d', ol=.5, sh=0) if False else None
    cv.flat(Ln(Q((20, 45), (32, 55.5), (44, 45), 16), 1.8), '#2b2b3d')
    for sx in (-1, 1):
        cu = Rc(32 + sx * 9.6 - 2.8, 46.0, 32 + sx * 9.6 + 2.8, 53.5, 1.8); cv.part(cu, '#ffd23a', ol=.8, shc='#c87a10', sd=1.0, hl=.3); cv.flat(Rc(32 + sx * 9.6 - 1.3, 47.6, 32 + sx * 9.6 + 1.3, 52.0, 1.0), '#2b2b3d')
    F = head_base(cv, sp, e)
    eyes(cv, sp, e); nose(cv, sp); mouth(cv, sp, e)
    hr = Pg([(15.6, 31), (15.0, 20), (18.4, 12.6), (26, 8.8), (33, 8.0), (41, 9.4), (47, 14), (49.2, 22), (48.4, 31), (46.4, 24), (42, 18), (36, 15.4), (30, 16.4), (24, 19.6), (19.4, 25)], True)
    cv.part(hr, '#2a1c3a', shc='#0a0618', sd=2.0, hl=.35, hlc='#7a6ad0', ol=.7)
    cv.flat(Pg([(34, 8.6), (41, 9.6), (47, 15), (44.4, 16), (39, 12.4)]) & hr, tq[0]); cv.flat(Pg([(18.2, 20), (20, 15.2), (22.4, 15.6), (20.4, 22)]) & hr, tq[0])
    cv.part(Pg([(15.2, 22.4), (32, 17.2), (48.8, 22.4), (49, 24.6), (32, 19.6), (15, 24.6)]), '#f4f0ff', ol=.7, shc='#9a90d8', sd=1.2)
    cv.flat(Ln(Q((16, 24.2), (32, 19.0), (48, 24.2)), .7), '#f03a92')
    sweat(cv, e, 49.6, 25); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_guia(e):
    cv = Cv(); sp = asig(dict(rx=13.6, jaw=.28, skin=('#dc9c6c', '#b25e58', '#ffe4bc'), iris=['#4a2810', '#7a4a22', '#d89a50'], bc='#221c3c', bw=2.1, lip='#c4705a', gap=6.6, my=37.8, ns=1.1))
    pad = Pg(torso_pts(), True); cv.part(pad, '#ff7a1a', shc='#a02a30', sd=2.3, hl=.3, hlc='#ffc060')
    for yy in (57.2,): cv.flat(Ln([(0, yy), (64, yy)], 1.7) & pad, '#eaf8ff'); cv.flat(Ln([(0, yy + 1.4), (64, yy + 1.4)], .5) & pad, '#9ac0d8')
    cv.flat(Ln([(14, 49.5), (9, 64)], 1.7) & pad, '#eaf8ff'); cv.flat(Ln([(50, 49.5), (55, 64)], 1.7) & pad, '#eaf8ff')
    neck(cv, sp, 50)
    for sx in (-1, 1): cv.part(Pg([(32 + sx * 3, 43), (32 + sx * 9.2, 40.8), (32 + sx * 11, 48.5), (32 + sx * 8, 53), (32 + sx * 1.4, 54)]), '#4a7aa8', ol=.8, shc='#1a2a68', sd=1.4, hl=.3, hlc='#a8dcff')
    cv.flat(Ln([(32, 54), (32, 65)], .7), '#a02a30')
    F = head_base(cv, sp, e)
    eyes(cv, sp, e); nose(cv, sp); mouth(cv, sp, e)
    st = F & (YP > 38.6) & (np.hypot(XP - 32, (YP - 35) * .85) > 8.3) & ~El(32, 39.4, 6, 3)
    cv.tint(st, '#3a2c58', .38)
    hr = Pg([(16.2, 29), (15.2, 20), (18.6, 12.4), (26, 8.2), (34, 7.6), (42, 9.6), (47.6, 14), (49, 21), (48.2, 29), (46.4, 22.6), (44, 17.6), (38, 14.8), (31, 14.0), (25, 15.2), (20, 18.6), (18.6, 25)], True)
    cv.part(hr, '#221c3c', shc='#080618', sd=2.0, hl=.45, hlc='#6a7af0', ol=.7)
    cv.flat(Ln(Q((22, 12), (30, 9.6), (38, 10.4)), .8), '#7a8af8'); cv.flat(Ln(Q((19, 18), (24, 14), (30, 13)), .5), '#4a52c8')
    cv.part(Pg([(15, 21.4), (32, 17.4), (49, 21.4), (49.2, 24.4), (32, 20.4), (14.8, 24.4)]), '#2e2e48', ol=.7, shc='#0a0618', sd=1.0)
    cv.part(Rc(26.6, 14.2, 37.4, 22.0, 2.2), '#b8c4e4', ol=.8, shc='#4a52a8', sd=1.2, hl=.4, hlc='#ffffff')
    cv.flat(El(32, 18.2, 2.9, 2.9), '#2e2e48'); cv.flat(El(32, 18.2, 2.2, 2.2), '#fff6a0'); cv.flat(El(31.4, 17.6, .8, .8), '#ffffff')
    cv.tint(El(32, 15, 14, 9) & ~El(32, 18.2, 3, 3) & cv.a, '#ffe890', .0)
    sweat(cv, e); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_medica(e):
    cv = Cv(); sp = asig(dict(rx=12.8, jaw=.4, skin=('#ac6a40', '#7a3a48', '#ffc890'), iris=['#0e5a38', '#2fb06a', '#9af0b8'], bc='#12081c', bw=1.5, lash=True, lip='#c44a6a', gap=6.3, ns=.95))
    hair = ('#2e1a3a', '#10081e', '#8a56b8')
    puff = U(El(32, 11.5, 11, 8.6), El(19.5, 18, 6, 6.2), El(44.5, 18, 6, 6.2), El(23, 10.5, 6, 6), El(41, 10.5, 6, 6), El(16.6, 27, 4.4, 6), El(47.4, 27, 4.4, 6), El(32, 19, 15, 10))
    cv.part(puff, hair[0], shc=hair[1], sd=2.2, hl=.4, hlc=hair[2])
    for (cx, cy) in ((26, 7), (36, 6.4), (18.5, 15), (45.5, 15), (31, 12), (22, 22), (42, 22)): cv.flat(Ln(Q((cx - 2, cy + 1), (cx, cy - 1.4), (cx + 2, cy + 1)), .5), hair[1])
    pad = Pg(torso_pts(), True); cv.part(pad, '#1fcaa0', shc='#0a6a7a', sd=2.2, hl=.25, hlc='#b0fff0')
    for sx in (-1, 1): cv.part(Pg([(32 + sx * 5.5, 64.5), (32 + sx * 3, 50), (32 + sx * 8, 45.6), (32 + sx * 17, 47.5), (32 + sx * 31, 55), (32 + sx * 31.5, 64.5)], True) & ~El(32, 64, 4, 18) if False else Pg([(32 + sx * 7, 64.5), (32 + sx * 6, 54), (32 + sx * 9, 46.4), (32 + sx * 18, 46.8), (32 + sx * 31, 53), (32 + sx * 31.5, 64.5)], True), '#f6f2ff', shc='#9a8ad8', sd=2.2, hl=.2, ol=.8)
    neck(cv, sp, 50)
    cv.flat(Ln([(25.6, 44.6), (32, 52.6), (38.4, 44.6)], 1.6), '#1fcaa0') if False else None
    cv.part(Pg([(26, 46), (32, 55.4), (38, 46), (37, 45.4), (32, 51), (27, 45.4)]), '#1fcaa0', ol=.6, sh=0)
    cv.flat(Ln(Q((25.2, 45.5), (23.6, 58), (30, 62)), 1.0), '#33304c'); cv.flat(Ln(Q((38.8, 45.5), (40.4, 58), (34, 62)), 1.0), '#33304c')
    cv.part(El(32, 62.2, 2.4, 2.4), '#c8cce8', ol=.6, shc='#5a5aa8', sd=.9, hl=.4, hlc='#ffffff')
    cv.part(Rc(11, 55, 21, 63, 1.2), '#ffffff', ol=.6, shc='#9a8ad8', sd=1.0); cv.flat(Rc(15.2, 56, 16.8, 62, .2), '#e03048'); cv.flat(Rc(13, 58, 19, 59.6, .2), '#e03048')
    F = head_base(cv, sp, e)
    eyes(cv, sp, e); nose(cv, sp); mouth(cv, sp, e)
    fr = Pg([(16.4, 27), (16.0, 20), (19, 14.8), (25.6, 12.4), (32, 11.8), (38.4, 12.4), (45, 14.8), (48, 20), (47.6, 27), (45.4, 21.4), (40, 17.4), (32, 16.4), (24, 17.4), (18.6, 21.4)], True)
    cv.part(fr, hair[0], shc=hair[1], sd=1.6, hl=.4, hlc=hair[2], ol=.6)
    for (cx, cy) in ((22, 14.6), (29, 12.8), (37, 12.6), (43.5, 15)): cv.flat(Ln(Q((cx - 1.8, cy + .6), (cx, cy - 1.2), (cx + 1.8, cy + .6)), .45), hair[1])
    cv.part(Pg(cr([(15.8, 21), (32, 16.6), (48.2, 21), (48.4, 24.2), (32, 19.8), (15.6, 24.2)], 6)), '#a24cf0', ol=.7, shc='#4a1a98', sd=1.2, hl=.35, hlc='#e0b0ff')
    for bx_, ang_ in ((16.2, -25), (22.6, 25)): cv.part(Rot(bx_ - 1.5 + (bx_ > 20) * 0, 15.8, 5.4, 3.6, ang_) if False else El(bx_, 15.6, 3.2, 2.2), '#c26cff', ol=.6, shc='#4a1a98', sd=1.0, hl=.3, hlc='#f0c8ff')
    cv.part(El(19.4, 16.0, 1.5, 1.5), '#a24cf0', ol=.5, sh=0)
    for sx in (-1, 1): cv.flat(Ln(Q((32 + sx * 15.6, 33.4), (32 + sx * 18.6, 35.2), (32 + sx * 15.6, 38)), .6), '#ffd24a')
    sweat(cv, e); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_ing(e):
    cv = Cv(); sp = asig(dict(cy=27.8, rx=14.2, ry=14.8, jaw=.22, ey=29.2, gap=6.9, my=41.0, ns=1.15, skin=('#eaa886', '#c0687a', '#ffe0c0'), iris=['#1a3a6a', '#3a78c8', '#9acaf8'], bc='#8a86a8', bw=2.3, lip='#d07c70', lippatch=1, mw=.95))
    pad = Pg(torso_pts(0, 64), True); cv.part(pad, '#f4ecd8', shc='#8a7ac8', sd=2.2, hl=.2)
    bib = Pg([(10, 64.5), (14, 55), (22, 50.5), (42, 50.5), (50, 55), (54, 64.5)], True); cv.part(bib, '#2e63e0', shc='#16308a', sd=2.2, hl=.3, hlc='#8ab0ff')
    for sx in (-1, 1): cv.part(Ln([(32 + sx * 10.4, 51), (32 + sx * 14, 46.6)], 4.2), '#2e63e0', ol=.7, shc='#16308a', sh=.3)
    for sx in (-1, 1): cv.part(El(32 + sx * 10.4, 52.2, 1.5, 1.5), '#ffd24a', ol=.5, shc='#b87a10')
    cv.part(Rc(26, 56, 38, 62, 1.2), '#2e63e0', ol=.6, shc='#16308a', sd=.8); cv.flat(Ln([(26.6, 58), (37.4, 58)], .5), '#8ab0ff')
    neck(cv, sp, 51)
    for sx in (-1, 1): cv.part(Pg([(32 + sx * 2, 52), (32 + sx * 7.6, 43.6), (32 + sx * 13, 49.6), (32 + sx * 11, 51.8)]), '#f6f0e0', ol=.7, shc='#8a7ac8', sd=1.2)
    F = head_base(cv, sp, e)
    eyes(cv, sp, e); nose(cv, sp)
    cv.tint(El(32, sp['ey'] + 6.4, 1.6, 1.2), '#ff6a5a', .4)
    beard = Pg([(17.4, 31), (18, 40), (22, 46), (28, 49.4), (32, 50.2), (36, 49.4), (42, 46), (46, 40), (46.6, 31), (44.6, 37), (40, 38.8), (36, 37.8), (32, 38.6), (28, 37.8), (24, 38.8), (19.4, 37)], True)
    cv.part(beard, '#c4c0d8', shc='#6c6a9a', sd=2.0, hl=.4, hlc='#ffffff', ol=.8)
    for pts in ([(22, 40), (23, 44), (26, 46.6)], [(42, 40), (41, 44), (38, 46.6)], [(32, 44), (32, 47), (32, 48.4)]): cv.flat(Ln(Q(*pts), .5), '#8a86b8')
    cv.part(Pg([(24, 38.4), (28, 36.6), (32, 37.6), (36, 36.6), (40, 38.4), (37, 39.6), (32, 38.6), (27, 39.6)], True), '#d0ccea', ol=.5, shc='#6c6a9a', sd=1.0, hl=.3)
    mouth(cv, sp, e)
    dome = Pg(cr([(13.6, 22), (14.4, 14), (21, 7.4), (32, 5.2), (43, 7.4), (49.6, 14), (50.4, 22)], 8)); brim = Rc(11, 19.4, 53, 24, 2.2)
    cv.cast(U(dome, brim), 0, 2.4, .5, '#5a2a30')
    cv.part(dome, '#ffd21e', shc='#d6720c', sd=2.4, hl=.4, hlc='#fffbb0')
    for dx in (-2.4, 2.4): cv.flat(Ln([(32 + dx, 5.6), (32 + dx * 1.5, 19.5)], 1.6) & dome, '#ffe65a' if dx < 0 else '#e8a812')
    cv.part(brim, '#f2b412', shc='#a85a0a', sd=1.2, hl=.3, hlc='#fff08a')
    cv.part(Rc(26.4, 9.6, 37.6, 17.4, 2), '#5a6280', ol=.8, shc='#1a2048', sd=1.2, hl=.4, hlc='#c8d4ff')
    cv.flat(El(32, 13.6, 2.7, 2.7), '#fff6a0'); cv.flat(El(31.4, 13, .8, .8), '#ffffff')
    sweat(cv, e, 51, 27); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def draw_lia(e):
    cv = Cv(); sp = asig(dict(cy=27.5, rx=12.4, ry=15., jaw=.42, ey=29.4, gap=6.3, my=38.2, ns=.9, er=1.08, skin=('#f8dacd', '#d5a0b0', '#fff4ea'), iris=['#1c4a9a', '#4a8ae0', '#b4e0ff'], bc='#141a48', bw=1.5, lash=True, lip='#b8688a'))
    hair = ('#2e3d84', '#121850', '#86aaff')
    back = Pg([(14, 25), (13, 14), (20, 8), (32, 6.6), (44, 8), (51, 14), (50, 25), (53, 40), (51, 58), (13, 58), (11, 40)], True)
    cv.part(back, hair[0], shc=hair[1], sd=2.4, hl=.3, hlc=hair[2])
    bl = Pg([(0, 64.5), (0, 54), (6, 48), (16, 44.5), (25, 42.5), (32, 48), (39, 42.5), (48, 44.5), (58, 48), (64, 54), (64, 64.5)], True)
    neck(cv, sp, 48)
    cv.part(bl, '#f4c430', shc='#b8601e', sd=2.4, hl=.3, hlc='#fff6b8')
    for poly_, c_ in (([(4, 56), (14, 49), (12, 62)], '#fffbe0'), ([(20, 46), (30, 44), (28, 54)], '#c8d8ff'), ([(44, 46), (56, 50), (48, 58)], '#fffbe0'), ([(52, 58), (62, 56), (58, 66)], '#c8d8ff'), ([(30, 56), (40, 52), (36, 66)], '#e89a28'), ([(8, 64), (24, 56), (26, 66)], '#e89a28')):
        cv.flat(Pg(poly_) & bl, c_)
    cv.flat(Ln([(0, 52), (64, 66)], .4) & bl, '#8a5018'); cv.flat(Ln([(64, 52), (0, 66)], .4) & bl, '#8a5018')
    F = head_base(cv, sp, e)
    cv.tint(El(32 - sp['gap'], 34.2, 4.6, 1.5) | El(32 + sp['gap'], 34.2, 4.6, 1.5), '#7a5ab0', .4)
    cv.tint(El(41, 38, 2.6, 1.6) & F, '#6a4a3a', .45)
    eyes(cv, sp, e); nose(cv, sp); mouth(cv, sp, e)
    cv.tint(El(32, 38.9, 3.0, 1.3) & F, '#6a78d0', .0)
    fr = Pg([(15.2, 34), (14.6, 20), (18.4, 12.4), (26, 8.6), (33, 7.8), (41, 9.2), (47, 14), (49.4, 22), (48.8, 34), (46.6, 23), (41.6, 17.4), (36, 14.6), (31, 15.4), (24.6, 19), (19.4, 25)], True)
    cv.part(fr, hair[0], shc=hair[1], sd=2.0, hl=.4, hlc=hair[2], ol=.7)
    for pts in ([(19.6, 24), (20.2, 34), (22.4, 42)], [(44.4, 24), (43.6, 34), (41.8, 41)]): cv.part(Ln(Q(*pts), 1.7), hair[0], ol=.5, shc=hair[1], sd=.8)
    cv.flat(Ln(Q((24, 13), (31, 10.5), (40, 11.6)), .7), hair[2]); cv.flat(Ln(Q((19, 20), (21, 16.4), (25, 14.6)), .5), hair[2])
    sweat(cv, e); accents(cv, sp, e, F)
    return cv.finish(not e.get('shut'))

def deadify(im):
    a = np.asarray(im).astype(float); g = (a[..., :3] * [.3, .59, .11]).sum(-1) / 255
    g = .12 + g ** 1.05 * .78
    lo, hi = np.array([22., 30, 58]), np.array([168., 186, 214]); o = lo + (hi - lo) * g[..., None]
    out = np.dstack([o, a[..., 3]]); return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

RESC = dict(guia=draw_guia, medica=draw_medica, ing=draw_ing, lia=draw_lia)
PERS = dict(marta=draw_marta, leo=draw_leo, hugo=draw_hugo, sara=draw_sara)

def gen_portraits6():
    note = 'v6 dibujado 64x64; fondo transparente'
    for role, fn in RESC.items():
        sh = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
        for i, ex in enumerate(SHEET_R): sh.alpha_composite(fn(EXP[ex]), (i * 64, 0))
        save(sh, 'portrait_' + role, cell=64, fw=64, fh=64, frames=4, cols=4, expressions=SHEET_R, note=note + '; hoja horizontal neutral, preocupado, enfadado, feliz')
        for ex in ('alert', 'hurt', 'talk'): save(fn(EXP[ex]), 'portrait_%s_%s' % (role, ex), expression=ex, note=note)
        save(deadify(fn(EXP['dead'])), 'portrait_%s_dead' % role, expression='dead', note=note + '; escala de grises azul frio, ojos cerrados, sin brillo (final: personas que murieron)')
    for pid, fn in PERS.items():
        sh = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
        for i, ex in enumerate(SHEET_P): sh.alpha_composite(fn(EXP[ex]), (i * 64, 0))
        save(sh, 'pers_' + pid, cell=64, fw=64, fh=64, frames=4, cols=4, expressions=SHEET_P, note=note + '; hoja neutral, preocupado, asustado/llorando, aliviado/feliz')
        save(fn(EXP['hurt']), 'pers_%s_hurt' % pid, expression='hurt', note=note)
        save(deadify(fn(EXP['dead'])), 'pers_%s_dead' % pid, expression='dead', note=note + '; escala de grises azul frio, ojos cerrados, sin brillo')

# ------------------------------------------------------------------ marcos de dialogo (9-slice)
PAL = dict(k='#0c0618', v='#7a4cc8', l='#e2d4ff', d='#3a2070', f='#1c0e36', g='#e8b84c', G='#fff0a8')
RING = 'kvldffffff'
ORN = {(4, 4): 'G', (5, 4): 'g', (6, 4): 'g', (7, 5): 'g', (4, 5): 'g', (4, 6): 'g', (5, 7): 'g', (6, 6): 'g', (2, 2): 'G'}
def gen_dlg_frame():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); px = im.load()
    def put(x, y, ch):
        if ch != '.': px[x, y] = tuple(int(v) for v in hx(PAL[ch])) + (255,)
    def cell(x, y):   # 0..9 esquina sup-izq
        if (x, y) in ((0, 0), (1, 0), (0, 1)): return '.'
        if (x, y) == (1, 1): return 'k'
        return ORN.get((x, y), RING[min(x, y)])
    for y in range(24):
        for x in range(24):
            qx, qy = min(x, 23 - x), min(y, 23 - y)
            if qx < 10 and qy < 10: ch = cell(qx, qy)
            else: ch = RING[min(qx, qy, 9)]
            put(x, y, ch)
    save(im, 'dlg_frame', slice=10, note='9-slice 24x24 slice=10: esquinas 10x10 con filigrana dorada (px 4..7), bordes 4px estirables (tinta/violeta/claro fino/oscuro), centro violeta oscuro liso. Esquinas con 3 px transparentes (redondeo)')

def gen_portrait_frame():
    n = 16; r = 5.0; im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); px = im.load()
    cols_ = ['#0c0618', '#e2d4ff', '#7a4cc8', '#1c0e36']
    for y in range(n):
        for x in range(n):
            qx, qy = abs(x + .5 - n / 2) - (n / 2 - r), abs(y + .5 - n / 2) - (n / 2 - r)
            sd = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r     # <0 dentro
            d = int(-sd)
            if sd > 0 or d >= 4: continue
            px[x, y] = tuple(int(v) for v in hx(cols_[max(d, 0)])) + (255,)
    for x, y in ((2, 2), (13, 2), (2, 13), (13, 13)): px[x, y] = tuple(int(v) for v in hx('#e8b84c')) + (255,)
    save(im, 'dlg_portrait_frame', slice=6, note='9-slice 16x16 slice=6 (borde 4px: tinta, claro, violeta, sombra). Centro TRANSPARENTE: dibujar el retrato detras (ya recortado a rect redondeado). Esquinas redondeadas con tachuela dorada')

# ------------------------------------------------------------------ sprites mini 16x24 (2 frames -> 32x24, fw=16)
def px_sprite(spec, f):
    a = np.zeros((24, 16, 4), np.uint8)
    def r(x0, y0, x1, y1, c):   # inclusivo
        c = tuple(int(v) for v in hx(c)) + (255,)
        a[y0:y1 + 1, x0:x1 + 1] = c
    def p(x, y, c): r(x, y, x, y, c)
    spec(r, p)
    if f:   # respiracion: torso+cabeza bajan 1 px, piernas fijas
        up = a[:20].copy(); a[1:20] = up[:19]; a[0] = 0
    # contorno
    al = a[..., 3] > 0; o = np.zeros_like(al)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): o |= np.roll(np.roll(al, dy, 0), dx, 1)
    o &= ~al; o[0, :] = False if False else o[0, :]
    ink = np.array(list(int(v) for v in hx('#160c2a')) + [255], np.uint8); a[o] = ink
    return a
def legs(r, c1, c2, shoe='#2a1c3a', x0=5):
    r(x0, 19, x0 + 2, 22, c1); r(x0 + 4, 19, x0 + 6, 22, c1); r(x0 + 4, 19, x0 + 4, 22, c2); r(x0 - 1, 23, x0 + 2, 23, shoe); r(x0 + 4, 23, x0 + 7, 23, shoe)
def head(r, p, y, skin='#f2bf9e', sh='#d98e88', w=6, x0=5):
    r(x0, y, x0 + w - 1, y + 5, skin); r(x0 + w - 1, y + 1, x0 + w - 1, y + 5, sh)
    p(x0 + 1, y + 3, '#160c2a'); p(x0 + w - 2, y + 3, '#160c2a'); r(x0 + 2, y + 5, x0 + w - 3, y + 5, '#d9506c') if False else None

def sp_marta(r, p):
    r(5, 18, 10, 22, '#6a3a9a'); legs(r, '#4a3a6a', '#2a1c4a'); r(3, 11, 12, 18, '#b2338a'); r(3, 11, 12, 11, '#f06ab0'); r(10, 12, 12, 18, '#7a1f70'); r(4, 14, 11, 14, '#f06ab0')
    r(4, 5, 11, 6, '#f0eef8'); r(6, 3, 9, 4, '#f0eef8'); r(5, 7, 10, 10, '#f2bf9e'); r(10, 8, 10, 10, '#d98e88'); r(4, 6, 4, 8, '#f0eef8'); r(11, 6, 11, 8, '#d0cce8')
    p(6, 8, '#160c2a'); p(9, 8, '#160c2a'); r(5, 7, 7, 7, '#e6a22a'); r(8, 7, 10, 7, '#e6a22a'); p(7, 10, '#d9506c'); p(8, 10, '#d9506c'); p(2, 14, '#f2bf9e'); p(13, 14, '#f2bf9e')
def sp_leo(r, p):
    legs(r, '#3a5ab8', '#1a2a78', x0=5)
    r(5, 14, 10, 18, '#2f7de8'); r(5, 16, 10, 16, '#f4f0ff'); r(10, 14, 10, 18, '#1a4ab8'); r(3, 15, 4, 17, '#f8c8a2'); r(11, 15, 12, 17, '#f8c8a2')
    r(11, 15, 13, 18, '#ffd23a'); p(13, 14, '#fff6b0')
    r(5, 9, 10, 13, '#f8c8a2'); r(10, 10, 10, 13, '#e29488'); r(5, 9, 6, 9, '#7a4420'); r(9, 9, 10, 9, '#7a4420')
    p(6, 11, '#160c2a'); p(9, 11, '#160c2a'); p(7, 13, '#e0607a'); p(8, 13, '#e0607a'); p(5, 12, '#c9674a'); p(10, 12, '#c9674a')
    r(3, 5, 12, 8, '#e8343c'); r(4, 3, 11, 4, '#e8343c'); r(7, 3, 8, 8, '#ff5a58'); r(3, 8, 12, 8, '#9a1848'); r(10, 4, 11, 7, '#c42a4a'); p(5, 5, '#ffd23a')
def sp_hugo(r, p):
    legs(r, '#6a4a2a', '#3a2418', x0=4); r(8, 19, 10, 22, '#6a4a2a') if False else None
    r(0, 8, 15, 19, '#1b9aa8'); r(0, 8, 15, 9, '#e8503a'); r(12, 10, 15, 19, '#0a6a88'); r(2, 11, 5, 18, '#2c8a98')
    r(3, 11, 12, 18, '#5aa832'); r(10, 11, 12, 18, '#2a7a3a'); r(4, 11, 5, 18, '#2c2a48'); r(10, 11, 11, 18, '#2c2a48'); p(7, 15, '#ffd24a')
    r(4, 6, 11, 10, '#eea480'); r(10, 7, 11, 10, '#cf6c68'); p(6, 8, '#160c2a'); p(9, 8, '#160c2a'); r(4, 9, 11, 11, '#e0601e'); r(10, 9, 11, 11, '#a02a14'); r(6, 9, 9, 9, '#e8681e')
    r(4, 3, 11, 5, '#3a5ae0'); r(4, 5, 11, 5, '#f2f0ff'); r(5, 2, 10, 2, '#3a5ae0'); p(7, 1, '#f2f0ff'); p(8, 1, '#f2f0ff'); r(10, 3, 11, 4, '#1a1a7a')
def sp_sara(r, p):
    legs(r, '#2a2a4a', '#161630', x0=5)
    r(4, 12, 11, 18, '#f03a92'); r(10, 12, 11, 18, '#9a1a88'); r(3, 13, 3, 17, '#f4f0ff'); r(12, 13, 12, 17, '#9a1a88'); r(7, 12, 8, 13, '#2b2b3d'); r(4, 12, 5, 13, '#ffd23a'); r(10, 12, 11, 13, '#ffd23a')
    r(3, 9, 3, 17, '#20dcc8') if False else None; r(2, 9, 3, 17, '#20dcc8'); r(12, 9, 13, 17, '#0a8fb0'); p(2, 18, '#ff3d8e'); p(13, 18, '#ff3d8e')
    r(5, 6, 10, 11, '#cd8d60'); r(10, 7, 10, 11, '#a05658'); r(4, 3, 11, 6, '#2a1c3a'); r(5, 2, 10, 2, '#2a1c3a'); r(4, 6, 5, 7, '#2a1c3a'); r(5, 5, 10, 5, '#f4f0ff'); r(9, 3, 10, 4, '#20dcc8')
    p(6, 8, '#160c2a'); p(9, 8, '#160c2a'); p(7, 10, '#ff5a7a'); p(8, 10, '#ff5a7a')
NPC = dict(marta=sp_marta, leo=sp_leo, hugo=sp_hugo, sara=sp_sara)
def gen_npcs():
    for pid, fn in NPC.items():
        sh = Image.new('RGBA', (32, 24), (0, 0, 0, 0))
        for f in (0, 1): sh.alpha_composite(Image.fromarray(px_sprite(fn, f), 'RGBA'), (f * 16, 0))
        save(sh, 'npc_' + pid, fw=16, fh=24, cols=2, frames=2, fps=2, anchorX=8, anchorY=23, baseY=23, note='mini 16x24, 2 frames idle (respirar). Base en la ULTIMA fila (y=23); anclar en (8,23)')

def gen6():
    gen_portraits6(); gen_dlg_frame(); gen_portrait_frame(); gen_npcs()


def preview6(path):
    """contact sheet x3: filas = personajes; columnas = expresiones, hurt, dead (+alert,talk rescatistas); abajo NPCs y marcos"""
    import os
    from artlib import OUT
    L = lambda n: Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
    rows = []
    for pid in PERS: rows.append([L('pers_' + pid).crop((i * 64, 0, i * 64 + 64, 64)) for i in range(4)] + [L('pers_%s_hurt' % pid), L('pers_%s_dead' % pid)])
    for rid in RESC: rows.append([L('portrait_' + rid).crop((i * 64, 0, i * 64 + 64, 64)) for i in range(4)] + [L('portrait_%s_%s' % (rid, k)) for k in ('hurt', 'dead', 'alert', 'talk')])
    sc = 3; cw = 66 * sc; sheet = Image.new('RGBA', (8 * cw, 8 * cw + 90 * sc), (44, 30, 70, 255))
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            t = Image.new('RGBA', (64, 64), (60, 44, 96, 255)); t.alpha_composite(im); sheet.alpha_composite(t.resize((64 * sc, 64 * sc), Image.NEAREST), (c * cw, r * cw))
    y = 8 * cw + 6
    for k, pid in enumerate(NPC):
        n = L('npc_' + pid)
        for f in (0, 1):
            t = Image.new('RGBA', (16, 24), (60, 44, 96, 255)); t.alpha_composite(n.crop((f * 16, 0, f * 16 + 16, 24))); sheet.alpha_composite(t.resize((16 * sc * 2, 24 * sc * 2), Image.NEAREST), (k * 2 * 16 * 6 + f * 96 + 6 * k * 0, y))
    # maqueta de dialogo con 9-slice
    def nine(im, sl, w, h):
        o = Image.new('RGBA', (w, h), (0, 0, 0, 0)); sw, sh_ = im.size; xs = [0, sl, sw - sl, sw]; xd = [0, sl, w - sl, w]; ys = [0, sl, sh_ - sl, sh_]; yd = [0, sl, h - sl, h]
        for i in range(3):
            for j in range(3):
                p = im.crop((xs[i], ys[j], xs[i + 1], ys[j + 1])); dw, dh = xd[i + 1] - xd[i], yd[j + 1] - yd[j]
                if dw > 0 and dh > 0: o.alpha_composite(p.resize((dw, dh), Image.NEAREST), (xd[i], yd[j]))
        return o
    box = Image.new('RGBA', (170, 60), (40, 70, 60, 255)); box.alpha_composite(nine(L('dlg_frame'), 10, 170, 60), (0, 0))
    pf = nine(L('dlg_portrait_frame'), 6, 48, 48); pt = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); pt.alpha_composite(L('pers_marta').crop((0, 0, 64, 64)).resize((48, 48), Image.LANCZOS))
    box.alpha_composite(pt, (10, 6)); box.alpha_composite(pf, (10, 6))
    sheet.alpha_composite(box.resize((170 * sc, 60 * sc), Image.NEAREST), (8 * cw - 170 * sc - 6, y))
    sheet.convert('RGB').save(path)
