"""Retratos 48x48 con 4 expresiones (neutral, preocupado, enfadado, feliz) -> hoja 192x48 por personaje."""
import math
import numpy as np
from artlib import *
from art_scenes import SKIN
S = 48; SS = 8
EXPR = ['neutral', 'preocupado', 'enfadado', 'feliz']
LT = (-1, -.85)

def M(fn): return drawmask(S, S, fn, SS)
def P(d, pts, s, fill=255): d.polygon([(x * s, y * s) for x, y in pts], fill=fill)
def E(d, cx, cy, rx, ry, s, fill=255): d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=fill)
def L_(d, pts, w, s, fill=255): d.line([(x * s, y * s) for x, y in pts], fill=fill, width=max(1, int(w * s)))

INK = hx('#150e28')

def skin_ramp(base, warm='#ffd8b0'):
    b = hx(base); return np.array([mix(b, hx('#1c0f40'), .75), mix(b, hx('#4a1c4a'), .5), mix(b, hx('#7a2e50'), .22), b, mix(b, hx(warm), .35), mix(b, hx('#fff0d8'), .62)])
def cloth_ramp(base):
    b = hx(base); return np.array([mix(b, hx('#120a30'), .8), mix(b, hx('#1c1050'), .55), mix(b, hx('#2a1470'), .28), b, mix(b, hx('#ffe0b0'), .3), mix(b, hx('#fff4d8'), .6)])

def face_features(cv, expr, cx=24, ey=22.5, eye_col=None, brow_col=None, mouth_y=32.2, lash=False, eyew=3.1, gap=6.2, glow=False):
    """ojos, cejas y boca según expresión (dibujados con máscaras 8x)"""
    sclera = hx('#f4ecf8'); iris = eye_col if eye_col is not None else hx('#2a1830')
    brow_col = brow_col if brow_col is not None else hx('#2a1620')
    for sx in (-1, 1):
        ex = cx + sx * gap
        inner = -sx  # lado interior hacia el centro
        if glow and expr == 'feliz':
            cv.put(M(lambda d, s: L_(d, [(ex - eyew, ey + .8), (ex - eyew * .5, ey - .6), (ex + eyew * .5, ey - .6), (ex + eyew, ey + .8)], 1.3, s)), hx('#ffd060')); continue
        if expr == 'feliz':
            # ojos cerrados sonrientes (arco hacia arriba)
            m = M(lambda d, s: L_(d, [(ex - eyew, ey + .8), (ex - eyew * .5, ey - .6), (ex + eyew * .5, ey - .6), (ex + eyew, ey + .8)], 1.15, s))
            cv.put(m, hx('#2a1620'))
            cv.put(M(lambda d, s: E(d, ex + sx * -.2, ey + 2.7, 2.3, 1.1, s)), mix(hx('#d88070'), hx('#ffb0a0'), .3) * 0 + hx('#e8908a'))
            by = ey - 3.6; slope = -.4
        else:
            op = {'neutral': 1.0, 'preocupado': 1.2, 'enfadado': .62}[expr]
            ry = 2.0 * op + .2
            if glow:
                m = M(lambda d, s: E(d, ex, ey, eyew, ry, s)); cv.put(m, hx('#ffd060'))
                cv.put(M(lambda d, s: E(d, ex, ey, eyew * .55, ry * .6, s)), hx('#fff4c0')); continue
            m = M(lambda d, s: E(d, ex, ey, eyew, ry, s)); cv.put(m, sclera)
            # sombra del párpado superior (más en enfadado)
            lid = M(lambda d, s: E(d, ex, ey - ry * (.9 if expr != 'enfadado' else .35), eyew + .6, ry * .9, s)) & m
            cv.put(lid, hx('#cfc0dc'))
            ix = ex + (.5 if expr != 'preocupado' else -.2) * -sx * 0 + .3
            im = M(lambda d, s: E(d, ix, ey + (.25 if expr == 'neutral' else .15), 1.7, min(1.9, ry), s)) & m
            cv.put(im, iris); cv.put(M(lambda d, s: E(d, ix + .2, ey + .25, .85, .85, s)) & m, hx('#0a0614'))
            cv.put(M(lambda d, s: E(d, ix - .6, ey - .6, .55, .55, s)) & m, hx('#ffffff'))
            # contorno de párpado
            cv.put(edge(m) & (cv.yy < ey + .5), hx('#2a1620'))
            if lash: cv.put(M(lambda d, s: L_(d, [(ex - eyew - .2, ey - .2), (ex - eyew - 1.2, ey - 1.2)] if sx < 0 else [(ex + eyew + .2, ey - .2), (ex + eyew + 1.2, ey - 1.2)], .6, s)), hx('#2a1620'))
            by = ey - 3.6 - (1.4 if expr == 'preocupado' else 0) + (.4 if expr == 'enfadado' else 0)
            slope = {'neutral': -.15, 'preocupado': -2.6, 'enfadado': 3.0}[expr]
        # ceja: extremo interior vs exterior
        xi, xo = ex + inner * (eyew + .3), ex - inner * (eyew + .6)
        yi = by + slope * .9 * (1 if expr != 'feliz' else 1); yo = by - slope * .5
        if expr == 'feliz': yi, yo = by + 1, by - .2
        cv.put(M(lambda d, s: L_(d, [(xi, yi), ((xi + xo) / 2, min(yi, yo) - .6), (xo, yo)], 1.9 if expr == 'enfadado' else 1.5, s)), brow_col)
    # nariz (sombra suave)
    cv.put(M(lambda d, s: L_(d, [(cx + .6, ey + 3.2), (cx + 1.7, ey + 6.2), (cx - .2, ey + 6.5)], .7, s)), mix(cv.a[int(ey + 6), cx], hx('#6a2a40'), .5)) if False else None
    if glow:
        if expr == 'feliz': cv.put(M(lambda d, s: L_(d, [(cx - 4, mouth_y), (cx, mouth_y + 2.4), (cx + 4, mouth_y)], .8, s)), hx('#f0b040'))
        return
    # boca
    my = mouth_y; lip = hx('#a8384c'); dk = hx('#4a1020')
    if expr == 'neutral':
        cv.put(M(lambda d, s: L_(d, [(cx - 3, my), (cx, my + .35), (cx + 3, my)], .9, s)), lip)
    elif expr == 'preocupado':
        cv.put(M(lambda d, s: L_(d, [(cx - 3, my + 1.1), (cx - 1.3, my), (cx + 1.3, my), (cx + 3, my + 1.1)], .95, s)), lip)
        cv.put(M(lambda d, s: E(d, cx, my + .9, 1.6, .7, s)), dk)
    elif expr == 'enfadado':
        cv.put(M(lambda d, s: L_(d, [(cx - 3.6, my + 1.5), (cx - 1.5, my + .1), (cx + 1.5, my + .1), (cx + 3.6, my + 1.5)], 1.05, s)), lip)
        cv.put(M(lambda d, s: P(d, [(cx - 2.2, my + .35), (cx + 2.2, my + .35), (cx + 1.6, my + 1.3), (cx - 1.6, my + 1.3)], s)), dk)
        cv.put(M(lambda d, s: L_(d, [(cx - 1.8, my + .7), (cx + 1.8, my + .7)], .6, s)), hx('#e8dce8'))
    else:  # feliz
        m = M(lambda d, s: P(d, [(cx - 4, my - .4), (cx + 4, my - .4), (cx + 2.6, my + 2.6), (cx, my + 3.4), (cx - 2.6, my + 2.6)], s))
        cv.put(m, dk); cv.put(m & (cv.yy < my + 1.2), hx('#f8f0f4')); cv.put(m & (cv.yy >= my + 2.1), hx('#c0485a'))
        cv.put(M(lambda d, s: L_(d, [(cx - 4.3, my - .8), (cx - 3.7, my + .6)], .8, s)), lip); cv.put(M(lambda d, s: L_(d, [(cx + 4.3, my - .8), (cx + 3.7, my + .6)], .8, s)), lip)
        cv.put(edge(m) & (cv.yy < my + 1), lip)

def finish(cv, silhouette, rimcol, rim_side=1):
    """contorno de color + rim light"""
    out = dilate(silhouette, 1) & ~silhouette
    # contorno: tinte oscuro del color de la zona vecina
    oc = np.zeros_like(cv.a); cnt = np.zeros((S, S, 1))
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        oc += np.roll(np.roll(cv.a, dy, 0), dx, 1) * np.roll(np.roll(silhouette, dy, 0), dx, 1)[..., None]; cnt += np.roll(np.roll(silhouette, dy, 0), dx, 1)[..., None]
    avg = oc / np.maximum(cnt, 1)
    ocol = avg * .22 + INK * .78
    cv.put(out, ocol)
    if rimcol is not None:
        rm = silhouette & ~np.roll(silhouette, -rim_side, 1)
        cv.put(rm, mix(cv.a, np.asarray(rimcol, float), .75)[rm] if False else mix(cv.a[rm], np.asarray(rimcol, float), .7)) if False else None
        sel = rm; cv.a[sel] = mix(cv.a[sel], np.asarray(rimcol, float), .7)
    return out | silhouette

def draw_char(name, expr):
    cv = Cv(S, S); cv.a[:] = 0
    cfg = CHARS[name]
    sk = skin_ramp(cfg['skin'], cfg.get('warm', '#ffd8b0'))
    cl = cloth_ramp(cfg['cloth'])
    # --- hombros / ropa
    bm = M(lambda d, s: P(d, [(1, 48), (4, 41), (14, 37.5), (34, 37.5), (44, 41), (47, 48)], s))
    cv.put(bm, shade(bm, cl, L=LT, r=4, amb=.42, gain=1.8, dw=.55, tex=noise(S, S, 3, 4, 4, 2), texamt=.1))
    cfg['cloth_fn'](cv, M, cl)
    # --- cuello
    nm = M(lambda d, s: P(d, [(19.5, 33), (28.5, 33), (30, 40), (18, 40)], s))
    cv.put(nm & ~bm | nm & (cv.yy < 40), shade(nm, sk, L=LT, r=2.5, amb=.3, gain=1.4, dw=.55))
    cv.put(nm & (cv.yy < 37.5) & (cv.yy > 33) , sk[1] if False else shade(nm, sk[:3], L=(0, 1), r=1.5, amb=.2, gain=.5, dw=.5)[nm & (cv.yy < 37.5) & (cv.yy > 33)])
    cfg['back_fn'](cv, M, cl, sk) if 'back_fn' in cfg else None
    # --- cabeza
    hm = M(lambda d, s: (E(d, 24, 22.5, 10.6, 12.6, s), E(d, 24, 27, 9.2, 10.4, s), E(d, 14, 24, 1.4, 2.6, s), E(d, 34, 24, 1.4, 2.6, s)))
    hm = M(lambda d, s: (E(d, 24, 21.5, 10.6, 12.4, s), E(d, 24, 27.5, 9.0, 9.6, s), E(d, 13.4, 24, 1.5, 3, s), E(d, 34.6, 24, 1.5, 3, s)))
    tex = noise(S, S, 5, 3, 3, 2)
    cv.put(hm, shade(hm, sk, L=LT, r=5.2, amb=.62, gain=1.15, dw=.6, tex=tex, texamt=.06))
    # pómulos/mejillas rubor
    cv.put(M(lambda d, s: (E(d, 17.5, 28, 2.4, 1.4, s), E(d, 30.5, 28, 2.4, 1.4, s))) & hm, mix(cv.a, hx('#e07a78'), .28)[M(lambda d, s: (E(d, 17.5, 28, 2.4, 1.4, s), E(d, 30.5, 28, 2.4, 1.4, s))) & hm]) if cfg.get('blush', True) else None
    # sombra bajo la barbilla sobre el cuello
    cv.put(nm & (cv.yy > 33) & (cv.yy < 36), mix(cv.a[34, 24], hx('#2a1040'), .45) if False else sk[1])
    # orejas
    cfg['hair_back'](cv, M, hm) if 'hair_back' in cfg else None
    face_features(cv, expr, eye_col=hx(cfg['eye']) if 'eye' in cfg else None, brow_col=hx(cfg['brow']) if 'brow' in cfg else None, lash=cfg.get('lash', False), glow=cfg.get('glow', False))
    cfg['front_fn'](cv, M, hm, sk, cl, expr)
    sil = cfg['sil'](M) | hm | bm | nm if 'sil' in cfg else hm | bm | nm
    alpha = (cv.a.sum(2) > 0)
    allm = alpha | sil
    finish(cv, allm, hx(cfg['rim']), 1)
    out = np.zeros((S, S, 4), np.uint8); out[..., :3] = np.clip(cv.a, 0, 255).astype(np.uint8)
    full = allm | dilate(allm, 1)
    out[..., 3] = np.where(full, 255, 0)
    return Image.fromarray(out, 'RGBA')

# ---- definiciones por personaje
def guia_cloth(cv, M_, cl):
    cl2 = cloth_ramp('#e0713a'); b = M_(lambda d, s: P(d, [(1, 48), (4, 41), (14, 37.5), (34, 37.5), (44, 41), (47, 48)], s))
    cv.put(b, shade(b, cl2, L=LT, r=4, amb=.45, gain=1.8, dw=.55))
    col = M_(lambda d, s: (P(d, [(14, 37.5), (24, 42), (34, 37.5), (31, 36), (24, 39), (17, 36)], s)))
    cv.put(col, shade(col, cloth_ramp('#f6e8c8'), L=LT, r=2, amb=.5, gain=1.5, dw=.5))
    cv.put(M_(lambda d, s: L_(d, [(24, 41), (24, 48)], .9, s)), hx('#3a2418'))
    cv.put(M_(lambda d, s: L_(d, [(8, 45), (12, 42)], .8, s)), cloth_ramp('#e0713a')[5])
def guia_front(cv, M_, hm, sk, cl, expr):
    # barba de pocos días (dither) en la parte baja de la cara
    low = hm & (cv.yy > 28.5) & ~M_(lambda d, s: E(d, 24, 31.5, 4.4, 2.2, s))
    stub = low & (bayer(S, S) < .62 - (cv.yy - 28) * .04)
    cv.put(stub, mix(sk[2], hx('#3a2a38'), .55))
    # nariz + sombra
    cv.put(M_(lambda d, s: E(d, 24.6, 26.2, 1.6, 1.3, s)) & hm, sk[4]); cv.put(M_(lambda d, s: L_(d, [(25.4, 22), (25.8, 26.4)], .7, s)) & hm, sk[2])
    # gorro de lana verde azulado con puño
    gm = M_(lambda d, s: (E(d, 24, 14, 12.2, 9.5, s),)) & (cv.yy < 17.5)
    cv.put(gm, shade(gm, cloth_ramp('#2fb0a8'), L=LT, r=3, amb=.46, gain=2.0, dw=.55, tex=noise(S, S, 8, 2, 2, 1), texamt=.18))
    cuff = M_(lambda d, s: P(d, [(11.4, 15), (36.6, 15), (36.2, 18.6), (11.8, 18.6)], s))
    cv.put(cuff, shade(cuff, cloth_ramp('#f6e8c8'), L=LT, r=1.6, amb=.5, gain=1.6, dw=.5))
    for x in range(12, 37, 2): cv.put(M_(lambda d, s: L_(d, [(x, 15.4), (x, 18.4)], .35, s)), cloth_ramp('#f6e8c8')[1])
    cv.put(M_(lambda d, s: E(d, 24, 5.2, 2.2, 2.2, s)), cloth_ramp('#f6e8c8')[4])  # borla
    # cejas pobladas
    # patillas
    cv.put(M_(lambda d, s: (P(d, [(12.6, 18.6), (14.5, 18.6), (14.5, 27), (13.4, 27)], s), P(d, [(33.5, 18.6), (35.4, 18.6), (34.6, 27), (33.5, 27)], s))), hx('#4a3430'))
GUIA = dict(skin='#e8b48a', cloth='#e0713a', cloth_fn=guia_cloth, front_fn=guia_front, rim='#5ae8e0', brow='#3a2418',
            sil=lambda M_: M_(lambda d, s: (E(d, 24, 14, 12.2, 9.5, s), E(d, 24, 5.2, 2.2, 2.2, s))))

def medica_cloth(cv, M_, cl):
    wc = cloth_ramp('#ece8f4'); b = M_(lambda d, s: P(d, [(1, 48), (4, 41), (14, 37.5), (34, 37.5), (44, 41), (47, 48)], s))
    cv.put(b, shade(b, wc, L=LT, r=4, amb=.5, gain=1.6, dw=.55))
    cv.put(M_(lambda d, s: P(d, [(16, 37.5), (24, 44), (32, 37.5), (30, 37), (24, 41), (18, 37)], s)), cloth_ramp('#2c8c8c')[3])
    cv.put(M_(lambda d, s: (P(d, [(33.5, 42), (39.5, 42), (39.5, 44), (33.5, 44)], s), P(d, [(35.5, 40), (37.5, 40), (37.5, 46), (35.5, 46)], s))), hx('#d8283c'))
    # fonendoscopio
    cv.put(M_(lambda d, s: L_(d, [(17, 38), (15, 44), (18, 47)], .6, s)), hx('#2a2a3a')); cv.put(M_(lambda d, s: E(d, 18.5, 46.5, 1.3, 1.3, s)), hx('#b8bcd0'))
def medica_back(cv, M_, cl, sk):
    hb = M_(lambda d, s: (E(d, 24, 21, 13.2, 14.2, s), P(d, [(11, 20), (37, 20), (38.5, 40), (9.5, 40)], s)))
    hr = np.array([hx('#0a0614'), hx('#1c1018'), hx('#2e1a20'), hx('#4a2c2c'), hx('#7a4c40'), hx('#b08068')])
    cv.put(hb, shade(hb, hr, L=LT, r=3.5, amb=.4, gain=2.0, dw=.55, tex=noise(S, S, 9, 2, 5, 2), texamt=.2))
    cv.put(M_(lambda d, s: E(d, 24, 5.5, 4.4, 3.8, s)), shade(M_(lambda d, s: E(d, 24, 5.5, 4.4, 3.8, s)), hr, L=LT, r=1.6, amb=.5, gain=2.0, dw=.55))
MEDICA_HAIR = np.array([hx('#0a0614'), hx('#1c1018'), hx('#2e1a20'), hx('#4a2c2c'), hx('#7a4c40'), hx('#b08068')])
def medica_front(cv, M_, hm, sk, cl, expr):
    fr = M_(lambda d, s: (E(d, 24, 14.5, 11.4, 6.6, s),)) & (cv.yy < 17.5) & ~M_(lambda d, s: P(d, [(24, 8), (14, 22), (10, 22), (10, 8)], s)) | M_(lambda d, s: P(d, [(24, 8.5), (35.4, 14), (36, 20), (31, 17.5), (24, 15)], s))
    fr = M_(lambda d, s: (E(d, 24, 14.2, 11.6, 7.4, s),)) & (cv.yy < 18)
    # raya al medio y flequillo lateral
    cv.put(fr, shade(fr, MEDICA_HAIR, L=LT, r=2.8, amb=.46, gain=2.2, dw=.55, tex=noise(S, S, 10, 5, 2, 2), texamt=.2))
    side = M_(lambda d, s: (P(d, [(12.2, 14), (16, 14), (14.2, 25), (12.4, 25)], s), P(d, [(32, 14), (35.8, 14), (35.6, 25), (33.8, 25)], s)))
    cv.put(side, MEDICA_HAIR[2]); cv.put(side & (cv.xx < 14), MEDICA_HAIR[4])
    cv.put(M_(lambda d, s: L_(d, [(25, 7.5), (22.5, 12), (17, 17.5)], .5, s)), MEDICA_HAIR[4]);
    cv.put(M_(lambda d, s: L_(d, [(26, 8), (30, 12), (34, 17)], .5, s)), MEDICA_HAIR[1])
    # cinta turquesa
    cb = M_(lambda d, s: P(d, [(12.8, 12.6), (35.2, 12.6), (35.8, 14.6), (12.2, 14.6)], s))
    cv.put(cb, shade(cb, cloth_ramp('#2c8c8c'), L=LT, r=1.4, amb=.5, gain=1.8, dw=.5))
    cv.put(M_(lambda d, s: E(d, 31.5, 13.6, 1.1, 1.1, s)), hx('#d8283c'))
    # nariz
    cv.put(M_(lambda d, s: E(d, 24.6, 26.4, 1.5, 1.2, s)) & hm, sk[4]); cv.put(M_(lambda d, s: L_(d, [(25.2, 23), (25.6, 26.6)], .6, s)) & hm, sk[2])
MEDICA = dict(skin='#b97a56', cloth='#ece8f4', cloth_fn=medica_cloth, back_fn=medica_back, front_fn=medica_front, rim='#5ae8e0', brow='#1c1018', lash=True, warm='#ffc890',
              sil=lambda M_: M_(lambda d, s: (E(d, 24, 21, 13.2, 14.2, s), P(d, [(11, 20), (37, 20), (38.5, 40), (9.5, 40)], s), E(d, 24, 5.5, 4.4, 3.8, s))))

def ing_cloth(cv, M_, cl):
    c = cloth_ramp('#7c849c'); b = M_(lambda d, s: P(d, [(1, 48), (4, 41), (14, 37.5), (34, 37.5), (44, 41), (47, 48)], s))
    cv.put(b, shade(b, c, L=LT, r=4, amb=.45, gain=1.8, dw=.55, tex=noise(S, S, 4, 3, 3, 2), texamt=.1))
    # tirantes azules y cinta reflectante
    for x0 in (14, 31):
        sm = M_(lambda d, s, x0=x0: P(d, [(x0, 38), (x0 + 3.4, 38), (x0 + 4.4, 48), (x0 + .6, 48)], s)); cv.put(sm, shade(sm, cloth_ramp('#2f55a8'), L=LT, r=1.5, amb=.5, gain=1.5, dw=.5))
    cv.put(M_(lambda d, s: P(d, [(5, 44.5), (43, 44.5), (43.5, 46), (4.6, 46)], s)), hx('#f0e060'))
def ing_front(cv, M_, hm, sk, cl, expr):
    # barba corta castaña + bigote
    beard = hm & (cv.yy > 27.5) & ~M_(lambda d, s: E(d, 24, 31.6, 4.2, 2.3, s)) | (hm & (cv.yy > 25.2) & (cv.yy < 28.6) & M_(lambda d, s: (E(d, 19.5, 28, 5.5, 3, s), E(d, 28.5, 28, 5.5, 3, s))) & ~M_(lambda d, s: E(d, 24, 28.2, 3, 2.4, s)))
    br = np.array([hx('#1c1010'), hx('#2e1a14'), hx('#4a2c20'), hx('#6a4430'), hx('#8a6040')])
    cv.put(beard & hm, shade(beard & hm, br, L=LT, r=2.6, amb=.5, gain=1.6, dw=.55, tex=noise(S, S, 12, 2, 2, 1), texamt=.3))
    cv.put(M_(lambda d, s: E(d, 24.6, 26, 1.7, 1.3, s)) & hm, sk[4])
    # mechones bajo el casco
    cv.put(M_(lambda d, s: (P(d, [(12.8, 17), (15, 17), (14.6, 24), (13.2, 24)], s), P(d, [(33, 17), (35.2, 17), (34.8, 24), (33.4, 24)], s))), br[2])
    # casco amarillo
    hmk = M_(lambda d, s: (E(d, 24, 14.5, 12.4, 9.6, s),)) & (cv.yy < 16.8)
    yc = cloth_ramp('#f0c020')
    cv.put(hmk, shade(hmk, yc, L=LT, r=3.4, amb=.5, gain=2.2, dw=.55))
    ridge = M_(lambda d, s: P(d, [(22.2, 3.8), (25.8, 3.8), (26.4, 11), (21.6, 11)], s)); cv.put(ridge, shade(ridge, yc, L=LT, r=1, amb=.6, gain=1.6, dw=.5))
    brim = M_(lambda d, s: P(d, [(10.4, 15.2), (37.6, 15.2), (39, 18), (9, 18)], s)); cv.put(brim, shade(brim, yc, L=(0, -1), r=1.2, amb=.4, gain=1.6, dw=.5))
    cv.put(M_(lambda d, s: L_(d, [(9.5, 17.8), (38.5, 17.8)], .6, s)), yc[1])
    # linterna frontal
    lm = M_(lambda d, s: P(d, [(20, 9), (28, 9), (28, 14), (20, 14)], s)); cv.put(lm, hx('#3a3a4a')); cv.put(M_(lambda d, s: E(d, 24, 11.5, 2.6, 2.2, s)), hx('#fff6c0')); cv.put(M_(lambda d, s: E(d, 23.4, 11, 1.1, .9, s)), hx('#ffffff'))
    # gafas de seguridad sobre el casco
    gl = M_(lambda d, s: P(d, [(11, 6.2), (37, 6.2), (36, 9.4), (12, 9.4)], s)) & hmk
    cv.put(gl, hx('#4a5a7a'))
    cv.put(M_(lambda d, s: (E(d, 17, 8, 3, 1.3, s), E(d, 31, 8, 3, 1.3, s))) , hx('#9ae0f0')) if False else None
ING = dict(skin='#f0c8a0', cloth='#7c849c', cloth_fn=ing_cloth, front_fn=ing_front, rim='#5ae8e0', brow='#4a2c20', warm='#ffd0a0', eye='#2a4a6a',
           sil=lambda M_: M_(lambda d, s: (E(d, 24, 14.5, 12.4, 9.6, s), P(d, [(9, 15.2), (39, 15.2), (39, 18), (9, 18)], s), P(d, [(22.2, 3.8), (25.8, 3.8), (26.4, 11), (21.6, 11)], s))))

def lia_cloth(cv, M_, cl):
    c = cloth_ramp('#e0713a'); b = M_(lambda d, s: P(d, [(1, 48), (4, 41), (14, 37.5), (34, 37.5), (44, 41), (47, 48)], s))
    cv.put(b, shade(b, c, L=LT, r=4, amb=.46, gain=1.8, dw=.55, tex=noise(S, S, 14, 3, 3, 2), texamt=.15))
    for y in (42, 45): cv.put(M_(lambda d, s, y=y: L_(d, [(5, y), (22, y + 1), (43, y)], .8, s)), c[4])  # franjas manta
    cv.put(M_(lambda d, s: L_(d, [(24, 40), (24, 48)], .6, s)), c[1])
LIA_HAIR = np.array([hx('#1c0810'), hx('#3a1218'), hx('#5e1c1c'), hx('#8a2e24'), hx('#b8503a'), hx('#e88a5a')])
def lia_back(cv, M_, cl, sk):
    hb = M_(lambda d, s: (E(d, 24, 21, 12.6, 13.6, s), P(d, [(11.4, 20), (36.6, 20), (37, 36), (33, 38), (15, 38), (11, 36)], s)))
    cv.put(hb, shade(hb, LIA_HAIR, L=LT, r=3.5, amb=.4, gain=2.0, dw=.55, tex=noise(S, S, 15, 2, 5, 2), texamt=.25))
def lia_front(cv, M_, hm, sk, cl, expr):
    fr = M_(lambda d, s: (E(d, 24, 14.5, 11.8, 7.8, s),)) & (cv.yy < 18.4)
    cv.put(fr, shade(fr, LIA_HAIR, L=LT, r=2.6, amb=.48, gain=2.2, dw=.55, tex=noise(S, S, 16, 4, 2, 2), texamt=.25))
    for pts in ([(24, 7), (20, 12), (13, 20)], [(26, 8), (31, 13), (36, 21)], [(18, 9), (16, 17)]):
        cv.put(M_(lambda d, s, pts=pts: L_(d, pts, .55, s)), LIA_HAIR[5 if pts[0][0] == 24 else 4])
    cv.put(M_(lambda d, s: (P(d, [(12.4, 15), (15.6, 15), (14, 27), (12.4, 27)], s), P(d, [(32.4, 15), (35.6, 15), (35.6, 27), (34, 27)], s))), LIA_HAIR[3])
    # vendaje en la frente
    bd = M_(lambda d, s: P(d, [(12.4, 12.8), (35.6, 12.2), (36, 16), (12, 16.6)], s))
    cv.put(bd, shade(bd, cloth_ramp('#ece8f4'), L=LT, r=1.4, amb=.55, gain=1.6, dw=.5)); cv.put(M_(lambda d, s: E(d, 30.4, 14.4, 1.4, 1.4, s)), hx('#d8283c')); cv.put(M_(lambda d, s: E(d, 30.2, 14.2, .6, .6, s)), hx('#ff8080'))
    cv.put(M_(lambda d, s: L_(d, [(12.4, 14.7), (35.8, 14.2)], .3, s)), hx('#a8a0c0'))
    # mancha de tierra y nariz
    cv.put(M_(lambda d, s: E(d, 19, 29.5, 2.2, 1.0, s)) & hm, mix(sk[2], hx('#4a3a38'), .5))
    cv.put(M_(lambda d, s: E(d, 24.6, 26.2, 1.4, 1.1, s)) & hm, sk[4]); cv.put(M_(lambda d, s: L_(d, [(25.2, 23.2), (25.6, 26.4)], .55, s)) & hm, sk[2])
    # ojeras
    cv.put(M_(lambda d, s: (E(d, 17.8, 25.4, 3, .8, s), E(d, 30.2, 25.4, 3, .8, s))) & hm, mix(sk[2], hx('#6a3a70'), .4))
LIA = dict(skin='#f0d0c0', cloth='#e0713a', cloth_fn=lia_cloth, back_fn=lia_back, front_fn=lia_front, rim='#ffc070', brow='#6a2a18', lash=True, warm='#ffe0c8', eye='#3a5a4a',
           sil=lambda M_: M_(lambda d, s: (E(d, 24, 21, 13, 14, s), P(d, [(11, 20), (37, 20), (39, 38), (36, 41), (12, 41), (9, 38)], s))))

def dir_cloth(cv, M_, cl):
    c = cloth_ramp('#4a2a7a'); b = M_(lambda d, s: P(d, [(0, 48), (3, 41), (13, 36), (35, 36), (45, 41), (48, 48)], s))
    cv.put(b, shade(b, c, L=LT, r=4, amb=.4, gain=1.8, dw=.55, tex=noise(S, S, 17, 3, 3, 2), texamt=.15))
    cv.put(M_(lambda d, s: L_(d, [(10, 42), (17, 37), (24, 44), (31, 37), (38, 42)], .7, s)), hx('#f0b040'))  # ribete dorado
    cv.put(M_(lambda d, s: E(d, 24, 44, 2.2, 2.2, s)), hx('#f0b040')); cv.put(M_(lambda d, s: E(d, 24, 44, 1.1, 1.1, s)), hx('#fff0b0'))
def dir_back(cv, M_, cl, sk):
    pass
def dir_front(cv, M_, hm, sk, cl, expr):
    hood = M_(lambda d, s: (E(d, 24, 21, 15, 17.5, s), P(d, [(9, 24), (39, 24), (43, 41), (5, 41)], s))) & ~M_(lambda d, s: E(d, 24, 24.5, 9.6, 11.5, s))
    cc = cloth_ramp('#4a2a7a')
    cv.put(hood, shade(hood, cc, L=LT, r=4, amb=.4, gain=1.9, dw=.55, tex=noise(S, S, 18, 3, 3, 2), texamt=.12))
    # interior de la capucha: sombra casi negra con velo
    inner = hm & ~hood
    cv.put(inner, ramp_map(np.clip(.08 + noise(S, S, 19, 4, 4, 2) * .15, 0, 1), np.array([hx('#0a0614'), hx('#1c1038'), hx('#2e1a58')]), dw=.7))
    # máscara dorada (media cara): sólo marcar con un resplandor sutil de contorno
    cv.put(M_(lambda d, s: (L_(d, [(15, 29), (24, 35), (33, 29)], .7, s))) & inner, hx('#8a6a30'))
    face_features(cv, expr, glow=True)
DIR = dict(skin='#3a2858', cloth='#4a2a7a', cloth_fn=dir_cloth, front_fn=dir_front, rim='#f0b040', glow=True, brow='#f0b040', blush=False,
           sil=lambda M_: M_(lambda d, s: (E(d, 24, 21, 15, 17.5, s), P(d, [(9, 24), (39, 24), (43, 41), (5, 41)], s))))

CHARS = dict(guia=GUIA, medica=MEDICA, ing=ING, lia=LIA, director=DIR)

def gen_portraits():
    for name in CHARS:
        sh = Image.new('RGBA', (S * 4, S), (0, 0, 0, 0))
        for i, e in enumerate(EXPR): sh.paste(draw_char(name, e), (i * S, 0))
        save(sh, 'portrait_' + name, cell=S, fw=S, fh=S, frames=4, cols=4, expressions=EXPR, note='fila única: neutral, preocupado, enfadado, feliz (x=i*48)')
