"""Retratos v4 64x64: guia (Nico), medica (Ona), ing (Ivan), lia. Luz de linterna calida desde la izquierda + relleno frio a la derecha.
portrait_<rol>      = hoja 256x64 (fw=64): neutral, preocupado, enfadado, feliz  (compatible con ui.js/hud.js: x=i*fw)
portrait_<rol>_<alert|hurt|talk> = 64x64 sueltas."""
import math
import numpy as np
from PIL import Image
from artlib import *
S = 64; SS = 8
INK = hx('#150e28')
LD = (-1, -.35)

def P(pts): return lambda d, s: d.polygon([(x * s, y * s) for x, y in pts], fill=255)
def E(cx, cy, rx, ry): return lambda d, s: d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)
def L(pts, w): return lambda d, s: d.line([(x * s, y * s) for x, y in pts], fill=255, width=max(1, int(w * s)), joint='curve')
def M(*fs): return drawmask(S, S, lambda d, s: [f(d, s) for f in fs], SS)
YY, XX = np.mgrid[0:S, 0:S]

def prof(kp, cx=32.):
    ys = np.arange(kp[0][0], kp[-1][0] + .001, .25); hw = np.interp(ys, [k[0] for k in kp], [k[1] for k in kp])
    hw = np.convolve(np.pad(hw, 6, mode='edge'), np.ones(13) / 13, 'valid')[:len(ys)]
    return M(P([(cx - h, y) for y, h in zip(ys, hw)] + [(cx + h, y) for y, h in zip(ys[::-1], hw[::-1])]))

def ramp5(base, shadow='#2a1450', warm='#ffe0b0', n=6):
    b = hx(base); return np.array([mix(b, hx(shadow), .8), mix(b, hx(shadow), .55), mix(b, hx(shadow), .25), b, mix(b, hx(warm), .32), mix(b, hx('#fffbe8'), .62)])

def lit(h, amb=.5, gain=1.5, L3=(-.8, -.3, .55)):
    gy, gx = np.gradient(h); n = np.stack([-gx, -gy, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    l = np.array(L3, float); l /= np.linalg.norm(l); lam = n @ l; return amb + (lam - l[2]) * gain
def dome(cx, cy, rx, ry, depth=9):
    q = 1 - ((XX - cx) / rx) ** 2 - ((YY - cy) / ry) ** 2; return np.sqrt(np.clip(q, 0, 1)) * depth
def hblur(m, r, depth=1.): return blur(m, r) * r * 2 * depth
def sh(m, dy=0, dx=0, r=1.0): return blur(np.roll(np.roll(m, dy, 0), dx, 1), r)

class Pt:
    def __init__(s): s.rgb = np.zeros((S, S, 3)); s.A = np.zeros((S, S), bool)
    def paint(s, m, ramp, v, dw=.55): c = ramp_map(np.clip(v, 0, .999), ramp, dw=dw); s.rgb[m] = c[m]; s.A |= m
    def flat(s, m, col): s.rgb[m] = hx(col) if isinstance(col, str) else col; s.A |= m
    def tint(s, m, col, a): c = hx(col) if isinstance(col, str) else col; s.rgb[m] = mix(s.rgb[m], c, a)
    def seam(s, top, under, k=.55):
        e = dilate(top, 1) & ~top & under & s.A; s.rgb[e] = s.rgb[e] * k + INK * (1 - k) * .6
    def finish(s):
        sil = s.A; out = dilate(sil, 1) & ~sil; out[0, :] = out[:, 0] = out[:, -1] = out[-1, :] = False
        oc = np.zeros((S, S, 3)); cnt = np.zeros((S, S, 1))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            m = np.roll(np.roll(sil, dy, 0), dx, 1); oc += np.roll(np.roll(s.rgb, dy, 0), dx, 1) * m[..., None]; cnt += m[..., None]
        s.rgb[out] = (oc / np.maximum(cnt, 1) * .2 + INK * .8)[out]
        # luz: calido a la izquierda, relleno frio a la derecha (aditivo con dither)
        warm = np.clip((34 - XX) / 40, 0, 1) ** 1.3 * .55 + np.clip(1 - np.hypot(XX - 6, YY - 26) / 34, 0, 1) ** 2 * .3
        cool = np.clip((XX - 36) / 26, 0, 1) ** 1.5 * .45
        a = lmask(warm, 5)[..., None] * np.array([46, 24, 0.]) ; b = lmask(cool, 4)[..., None] * np.array([0, 18, 52.])
        s.rgb[sil] = np.clip(s.rgb + a + b, 0, 255)[sil]
        rm = sil & ~np.roll(sil, -1, 1)   # rim frio en el borde derecho
        s.rgb[rm] = mix(s.rgb[rm], hx('#8ad8f0'), .45)
        lm = sil & ~np.roll(sil, 1, 1) & (YY < 56)   # rim calido en el borde izquierdo
        s.rgb[lm] = mix(s.rgb[lm], hx('#ffc070'), .35)
        o = np.zeros((S, S, 4), np.uint8); o[..., :3] = np.clip(s.rgb, 0, 255).astype(np.uint8); o[..., 3] = np.where(sil | out, 255, 0)
        return Image.fromarray(o, 'RGBA')

# ---------------------------------------------------------------- expresiones
#  open: apertura ojo; arc/squint: ojos especiales; bro: (alzada, inclinacion interior+arriba); m: (curva, apertura, ancho, dientes)
EXP = dict(
    neutral=dict(open=1., bro=(0, 0), m=(.25, 0, 3.2, 0)),
    preocupado=dict(open=1.15, bro=(1.2, 2.3), m=(-.9, .5, 2.6, 0)),
    enfadado=dict(open=.62, bro=(-1.0, -2.4), m=(-.7, 1.1, 3.6, 1)),
    feliz=dict(open=.2, arc=1, bro=(1.2, .3), m=(1.5, 2.2, 4.4, 1)),
    alert=dict(open=1.5, bro=(2.4, 1.2), m=(0, 1.9, 2.0, 0), pup=.7),
    hurt=dict(open=.2, squint=1, bro=(.8, 3), m=(-1.1, 1.8, 3.8, 1)),
    talk=dict(open=1., bro=(.5, 0), m=(.4, 2.6, 3.4, 1)),
)

def features(P_, skin, e, sp):
    """ojos, cejas, boca. sp: gap, ey, my, iris(3 col), brow, lash, heavy, lipc"""
    gap, ey, my = sp['gap'], sp['ey'], sp['my']; dark = hx('#241420'); skd = skin[1]
    for sx in (-1, 1):
        x = 32 + sx * gap
        if e.get('arc'):
            P_.flat(M(L([(x - 3.1, ey + 1.1), (x - 1.4, ey - .7), (x + 1.4, ey - .7), (x + 3.1, ey + 1.1)], 1.15)), dark)
            P_.tint(M(E(x, ey + 2.9, 2.6, 1.0)), '#e07070', .38)
        elif e.get('squint'):
            P_.flat(M(L([(x + sx * 2.8, ey - 1.8), (x - sx * 1.6, ey + .1), (x + sx * 2.8, ey + 1.9)], 1.1)), dark)
        else:
            ry = 2.1 * e['open'] + .15; rx = 3.5
            scl = M(E(x, ey, rx, ry)); P_.flat(scl, '#f2eaf0')
            P_.flat(scl & (YY < ey - ry * .35), '#c9bcd2')           # sombra del parpado
            P_.flat(scl & (np.abs(XX - x) > rx - 1.1), '#d8cce0')    # esquinas en sombra
            pr = e.get('pup', 1.); ix = x - sx * .2
            iris = M(E(ix, ey + .1, 2.0, 2.0)) & scl; i3 = sp['iris']
            P_.flat(iris, i3[1]); P_.flat(iris & (YY < ey - .4), i3[0]); P_.flat(iris & (YY > ey + .9) & (np.abs(XX - ix) < 1.4), i3[2])
            P_.flat(M(E(ix, ey + .1, .95 * pr + .15, .95 * pr + .15)) & scl, '#0c0612')
            P_.flat(M(E(ix - .9, ey - .8, .62, .62)) & scl, '#ffffff'); P_.flat(M(E(ix + .9, ey + .9, .35, .35)) & scl & iris, '#ffffff'.replace('f', 'e', 1) if False else '#d8f0ff')
            if sp.get('heavy'):
                lid = M(E(x, ey - ry * .55, rx + .8, ry * .95)) & ~M(E(x, ey + ry * .7, rx, ry))
                P_.paint(lid, skin, np.full((S, S), .34)); scl = scl & ~lid
                P_.flat(edge(M(E(x, ey, rx, ry))) & (YY <= ey - ry * .1), dark)
            else:
                P_.flat(edge(scl) & (YY <= ey), dark)
            P_.flat(edge(scl) & (YY > ey) & (np.abs(XX - x) < rx - .6), skin[1])
            if sp.get('lash'): P_.flat(M(L([(x + sx * (rx + .2), ey - .4), (x + sx * (rx + 1.4), ey - 1.5)], .75)), dark)
            P_.tint(M(E(x, ey - ry - 1.4, rx - .4, .55)), skin[0], .45)    # pliegue del parpado
        # ceja
        raise_, slant = e['bro']; by = ey - 4.6 - raise_ + sp.get('browlow', 0)
        xo, xi = x + sx * 4.4, x - sx * 3.6
        pts = [(xi, by - slant * .5), ((xi + xo) / 2, by - 1.0 - slant * .1), (xo, by + .4 + slant * .3)]
        if sp.get('brow_curve'): pts = [(xi, by - slant * .5 + .4), ((xi + xo) / 2, by - 1.5 - slant * .1), (xo, by + 1.0 + slant * .3)]
        P_.flat(M(L(pts, sp.get('browW', 1.5))), sp['brow'])
        P_.tint(M(L([(a, b + .9) for a, b in pts], .8)), skin[0], .0)
    # boca
    cv, op, w, teeth = e['m']; w *= sp.get('mw', 1.); lc = sp['lip']; lcd = mix(lc, INK, .45)
    cols = {}
    for xi_ in range(int(round(32 - w)), int(round(32 + w)) + 1):
        t = (xi_ - 32) / max(w, .1)
        if abs(t) > 1.0: continue
        k = 1 - t * t
        yu = my - cv * (t * t) * .5 + cv * .5 * 0
        yu = my + cv * .55 * (1 - k) * -1 + cv * .35
        yl = yu + op * k ** .7
        yu_i, yl_i = int(round(yu)), int(round(max(yl, yu)))
        if op < .45:
            P_.rgb[yu_i, xi_] = lcd; P_.A[yu_i, xi_] = True
            if abs(t) < .72: P_.rgb[yu_i + 1, xi_] = mix(lc, hx('#fff0f0'), .12 if xi_ < 32 else 0); P_.A[yu_i + 1, xi_] = True
            if abs(t) < .72: P_.rgb[yu_i - 1, xi_] = mix(skin[2], lcd, .35); P_.A[yu_i - 1, xi_] = True
        else:
            P_.rgb[yu_i - 1, xi_] = mix(lc, lcd, .4); P_.A[yu_i - 1, xi_] = True
            for yy in range(yu_i, yl_i + 1):
                c = hx('#3a0c1c')
                if teeth and yy <= yu_i + 1 and abs(t) < .8: c = hx('#f4eef0') if xi_ > 32 - w * .5 else hx('#d8ccd8')
                elif yy >= yl_i - 1 and yl_i - yu_i >= 2: c = hx('#b04860')
                P_.rgb[yy, xi_] = c; P_.A[yy, xi_] = True
            P_.rgb[yl_i + 1, xi_] = mix(lc, hx('#ffd8d0'), .22 if xi_ < 34 else 0); P_.A[yl_i + 1, xi_] = True
            if abs(t) > .72: P_.rgb[yl_i + 1, xi_] = lcd
    P_.flat(M(E(32 - w - .4, my + cv * .35 + .1, .5, .5)), mix(lcd, INK, .3)); P_.flat(M(E(32 + w + .4, my + cv * .35 + .1, .5, .5)), mix(lcd, INK, .3))
    if e.get('arc'):  # mejillas sonrojadas
        pass

def skin_v(face, sp, hair_shadow=None, extra=0):
    cy = sp.get('fcy', 29); h = dome(32, cy, 14.5, 19, 12) * face
    v = lit(h, amb=.52, gain=1.9, L3=(-.85, -.3, .6))
    v += np.clip((32 - XX) / 26, -1, 1) * .07
    ey, gap, my = sp['ey'], sp['gap'], sp['my']
    nose = M(P([(33.0, ey - 1), (35.6, ey + 6), (34.8, ey + 7.4), (32.6, ey + 7.4)]))
    v -= blur(nose, .9) * .22
    v += blur(M(L([(30.7, ey), (30.2, ey + 5.6)], 1.3)), .8) * .12                     # puente iluminado
    v += blur(M(E(31.3, ey + 6.6, 1.5, 1.0)), .6) * .22                                 # punta de la nariz
    v -= blur(M(E(32, ey + 8.6, 4.2, 1.1)), .8) * .20                                   # sombra bajo la nariz
    v -= blur(M(E(32 - gap, ey - .5, 5.2, 3.6), E(32 + gap, ey - .5, 5.2, 3.6)), 1.4) * sp.get('socket', .14)
    v -= blur(M(E(32, my + 4.4, 2.6, 1.2)), .8) * .16                                   # debajo del labio
    v += blur(M(E(32 - gap - 2, ey + 4, 3.6, 2.4)), 1.2) * .10                          # pomulo iluminado
    if hair_shadow is not None: v -= blur(np.roll(hair_shadow, 2, 0), 1.2) * .38
    return v + extra

SKINMASK = None

def body_and_head(P_, sp, face_kp):
    pass

# ================================================================= personajes
def hair_tex(seed, sx=2.4, sy=9): return noise(S, S, seed, sx, sy, 3)

def draw_guia(e):
    P_ = Pt(); sp = dict(gap=6.4, ey=29.5, my=40.4, iris=[hx('#3a2412'), hx('#6a4220'), hx('#a8743a')], brow=hx('#2a1a14'), lip=hx('#b8685c'), browW=1.9, socket=.16)
    skin = ramp5('#c98a62', '#3a1a4a')
    # torso (chaqueta naranja)
    torso = M(P([(0, 64), (1, 57), (6, 52), (16, 48.5), (25, 46.5), (39, 46.5), (48, 48.5), (58, 52), (63, 57), (64, 64)]))
    org = ramp5('#e8742a', '#2a1060', '#ffd890')
    v = lit(hblur(torso, 4, 1.5), amb=.52, gain=1.4) + np.clip((32 - XX) / 40, -1, 1) * .12
    v += (noise(S, S, 11, 5, 4, 2) - .5) * .12
    v -= blur(M(L([(22, 54), (16, 64)], 2.6), L([(46, 55), (50, 64)], 2.6)), 1.3) * .2   # pliegues
    P_.paint(torso, org, v, dw=.5)
    # arneses / tira reflectante
    P_.paint(M(P([(10, 51), (14, 49.5), (27, 64), (20, 64)])), ramp5('#2c2a3e', '#0c0618', '#8a88b0'), np.full((S, S), .5) + (32 - XX) / 120)
    P_.flat(M(L([(8, 58.5), (56, 58.5)], 1.6)) & torso, '#d8f0f4'); P_.flat(M(L([(8, 59.5), (56, 59.5)], .8)) & torso, '#8ab4c8')
    P_.flat(M(L([(8, 58.5), (56, 58.5)], 1.6)) & torso & (XX > 40), '#9ab4c8')
    # cuello + cuello alto
    neck = M(P([(26, 36), (38, 36), (39.5, 49), (24.5, 49)]))
    face = prof([(14, 0), (15.5, 5), (18, 8.5), (23, 10.8), (28, 11.9), (34, 12.1), (38, 11.6), (42, 10.6), (45.5, 8.4), (47.8, 4.6), (49.2, 0)])
    nv = lit(hblur(neck, 3), amb=.46, gain=1.6) - blur(np.roll(face, 3, 0), 1.6) * .5
    P_.paint(neck, skin, nv)
    flc = ramp5('#6a4a38', '#1a0c20', '#d8b090'); fl = lambda s_: M(P([(32 - s_ * 11, 43.5), (32 - s_ * 6.6, 41.5), (32 - s_ * 4.2, 47.5), (32 - s_ * 6, 52), (32 - s_ * 16, 50.6)]))
    for s_ in (-1, 1):
        m = fl(s_); P_.paint(m, flc, lit(hblur(m, 2.5), amb=.5, gain=1.3) + (noise(S, S, 5, 1.6, 1.6, 2) - .5) * .35 + (.08 if s_ < 0 else -.04), dw=.8)
    for s_ in (-1, 1): P_.paint(M(P([(32 + s_ * 4, 46.5), (32 + s_ * 10.8, 43.8), (32 + s_ * 12.8, 49.4), (32 + s_ * 15.4, 50.2), (32 + s_ * 7, 52.6)])), org, np.full((S, S), .5) + (.14 if s_ < 0 else -.1), dw=.4)
    P_.flat(M(L([(32, 49), (32, 64)], .9)), '#2a1c30'); P_.flat(M(E(32, 50.2, .8, .8)), '#d8d4e8')
    # cabeza
    ears = M(E(17.2, 31, 2.3, 3.6), E(46.8, 31, 2.3, 3.6)); P_.paint(ears, skin, np.full((S, S), .5) + (32 - XX) / 80)
    hat = M(E(32, 15.4, 16.2, 13), P([(15.8, 14), (48.2, 14), (49.4, 22.6), (14.6, 22.6)])) & (YY < 22.8)
    cuff = M(P([(14.4, 15.6), (49.6, 15.6), (50, 23.2), (14, 23.2)])) & hat
    cuff = cuff & ~(YY < 16.2 + 3.0 * (np.abs(XX - 32) / 17) ** 2 - 1.2) | (cuff & (YY < 15.6 + 0))
    cuff = M(P([(14.2, 17.5), (32, 16.4), (49.8, 17.5), (50.2, 24), (32, 24.6), (13.8, 24)]))
    hat_top = hat & ~cuff
    sideburn = M(P([(18.2, 24), (21.2, 24), (21.6, 32), (19.6, 33.6), (18.4, 30)]), P([(45.8, 24), (42.8, 24), (42.4, 32), (44.4, 33.6), (45.6, 30)]))
    face = face & ~(YY < 8) | (face & (YY >= 8))
    fv = skin_v(face, sp, hair_shadow=cuff)
    P_.paint(face, skin, fv)
    # cejas/ojos/nariz/boca encima de la piel
    features(P_, skin, e, sp)
    # barba de pocos dias (sombra azulada en mandibula)
    stub = face & (((YY > 37.5) & (np.hypot(XX - 32, (YY - 36) * .75) > 8.2)) | ((YY > 44) & (XX > 24) & (XX < 40))) & ~M(E(32, 40.6, 5.2, 1.8))
    P_.tint(stub & (noise(S, S, 3, 1.4, 1.4, 1) > .38), '#3a2830', .5); P_.tint(stub, '#4a3040', .22)
    # gorro
    wool = ramp5('#2c6e78', '#0c1030', '#9ae0d8')
    wv = lit(hblur(hat, 4, 1.4), amb=.5, gain=1.3) + np.clip((32 - XX) / 40, -1, 1) * .12
    knit = ((XX + YY) % 3 == 0) * .05 + ((XX - YY) % 3 == 0) * .03
    P_.paint(hat_top, wool, wv + knit, dw=.4)
    cv_ = ramp5('#e8742a', '#2a1060', '#ffd890')
    P_.paint(cuff, cv_, lit(hblur(cuff, 2.2), amb=.5, gain=1.3) + (np.clip((32 - XX) / 40, -1, 1) * .12) + (((XX % 2) == 0) * .06), dw=.4)
    P_.flat(cuff & (YY == 17) & (XX < 38), '#ffc070') if False else None
    P_.paint(sideburn, ramp5('#4a2c1c', '#1a0c18', '#a8704a'), np.full((S, S), .5) + hair_tex(4) * .3, dw=.8)
    P_.seam(cuff, face, .5)
    # linterna frontal
    lamp = M(P([(26.6, 14.8), (37.4, 14.8), (37.4, 22), (26.6, 22)]))
    P_.paint(lamp, ramp5('#7a809a', '#10102a', '#e0e8ff'), lit(hblur(lamp, 1.6), amb=.5, gain=1.8) + (32 - XX) / 40)
    P_.flat(M(P([(28.6, 16.4), (35.4, 16.4), (35.4, 20.4), (28.6, 20.4)])), '#fff2b0'); P_.flat(M(P([(29.6, 17.2), (34.4, 17.2), (34.4, 19.6), (29.6, 19.6)])), '#ffffff')
    P_.flat(M(P([(26.6, 14.8), (37.4, 14.8), (37.4, 15.8), (26.6, 15.8)])), '#c8d0ec')
    P_.rgb[lamp & (YY == 22) & (XX < 28)] = hx('#40445e')
    gl = np.clip(1 - np.hypot((XX - 32) / 14, (YY - 18) / 11), 0, 1) ** 1.6
    P_.rgb = np.clip(P_.rgb + (lmask(gl * .6, 5) * P_.A)[..., None] * np.array([90, 58, 12.]), 0, 255)
    P_.seam(lamp, cuff, .6)
    return P_.finish()

def draw_medica(e):
    P_ = Pt(); sp = dict(gap=6.0, ey=30, my=40.8, iris=[hx('#143a2a'), hx('#2f7a52'), hx('#7ac898')], brow=hx('#1e1018'), lip=hx('#9a3a4a'), lash=True, browW=1.3, mw=.95, socket=.10)
    skin = ramp5('#8a5a3e', '#2a1040', '#ffc890')
    hair_r = ramp5('#2c1c2c', '#0a0618', '#9a7098')
    # trenza detras (cae por el hombro izquierdo de la imagen)
    hairback = M(P([(14.5, 20), (49.5, 20), (51, 36), (46, 46), (18, 46), (13, 36)]))
    torso = M(P([(0, 64), (1, 57), (6, 52), (16, 48.5), (25, 46.5), (39, 46.5), (48, 48.5), (58, 52), (63, 57), (64, 64)]))
    scrub = ramp5('#2f9a8a', '#0c1038', '#b8f4e0')
    v = lit(hblur(torso, 4, 1.5), amb=.52, gain=1.4) + np.clip((32 - XX) / 40, -1, 1) * .12 + (noise(S, S, 12, 5, 4, 2) - .5) * .1
    P_.paint(torso, scrub, v, dw=.5)
    vest = M(P([(5, 64), (7, 54), (15, 49.5), (25, 47.5), (28, 52), (31, 64)]), P([(59, 64), (57, 54), (49, 49.5), (39, 47.5), (36, 52), (33, 64)]))
    vst = ramp5('#f0ece8', '#32245a', '#ffffff')
    P_.paint(vest, vst, lit(hblur(vest, 3.5, 1.5), amb=.58, gain=1.4) + np.clip((32 - XX) / 36, -1, 1) * .14 + (noise(S, S, 9, 5, 5, 2) - .5) * .08, dw=.5)
    P_.seam(vest, torso, .5)
    # cruz roja en el pecho (lado iluminado)
    P_.flat(M(P([(14.5, 54), (25.5, 54), (25.5, 64), (14.5, 64)])) & vest, '#e8e4ee')
    P_.flat(M(P([(18.4, 55), (21.6, 55), (21.6, 64), (18.4, 64)]), P([(15.6, 58.0), (24.4, 58.0), (24.4, 61.0), (15.6, 61.0)])) & vest, '#d02a3c')
    P_.flat(M(P([(18.4, 55), (21.6, 55), (21.6, 56), (18.4, 56)]), P([(15.6, 58.0), (24.4, 58.0), (24.4, 58.8), (15.6, 58.8)])) & vest, '#f45868')
    P_.flat(M(L([(8.5, 61), (28, 61)], .6)) & vest & ~M(P([(15.6, 58.0), (24.4, 58.0), (24.4, 61.0), (15.6, 61.0)])), '#a8c8d0') if False else None
    # estetoscopio
    P_.flat(M(L([(24, 48.4), (24.6, 54), (28, 58.6), (33.5, 60)], 1.1)) & ~M(E(30, 49, 7, 3)), '#38344c')
    P_.paint(M(E(33.5, 60, 2.3, 2.3)), ramp5('#b8bcd0', '#10102a', '#ffffff'), np.full((S, S), .5) + (32 - XX) / 18); P_.flat(M(E(32.9, 59.4, .7, .7)), '#ffffff')
    neck = M(P([(27, 36), (37, 36), (38.5, 49), (25.5, 49)]))
    face = prof([(15, 0), (16, 4.5), (18.5, 8.3), (23, 10.6), (28, 11.6), (34, 11.7), (38, 11.0), (42, 9.1), (45.5, 6.0), (47.6, 2.6), (48.6, 0)])
    P_.paint(neck, skin, lit(hblur(neck, 3), amb=.46, gain=1.6) - blur(np.roll(face, 3, 0), 1.6) * .5)
    collar = M(P([(25, 46), (39, 46), (36, 51.5), (32, 54.5), (28, 51.5)]))
    P_.paint(collar, scrub, np.full((S, S), .42) + (32 - XX) / 80, dw=.4)
    # pelo trasero + trenza
    P_.paint(hairback, hair_r, lit(hblur(hairback, 4, 1.2), amb=.4, gain=1.2) - .1, dw=.8)
    seg = [(17.5 - i * .5 + (1.2 if i % 2 else -.6), 36 + i * 3.8) for i in range(8)]
    for i, (bx, by) in enumerate(seg):
        m = M(E(bx, by, 3.6 - i * .15, 2.9)); hv = lit(hblur(m, 1.6, 1.4), amb=.52, gain=1.6) + (32 - XX) / 30 * .15 + (.1 if i % 2 else -.04)
        P_.paint(m, hair_r, hv, dw=.5); P_.seam(m, hairback | torso, .5)
    P_.flat(M(E(seg[-1][0], seg[-1][1] + 2.4, 2.2, 1.6)), '#d8a030'); P_.flat(M(E(seg[-1][0] - .7, seg[-1][1] + 2, .7, .5)), '#fff0a0')
    ears = M(E(17.4, 31.5, 2.0, 3.2), E(46.6, 31.5, 2.0, 3.2)); P_.paint(ears, skin, np.full((S, S), .5) + (32 - XX) / 80)
    # pelo recogido hacia atras con raya
    hair = M(E(32, 21, 16.4, 14)) & (YY < 17.5 + 5.5 * ((XX - 32) / 15.5) ** 2 + (np.abs(XX - 32) < 1.0) * 0 - (XX - 32) * .15) & (YY < 30)
    hair = hair & ~(M(E(32, 29, 12.4, 15.5)) & (YY > 16.5 + 5.0 * ((XX - 32) / 12) ** 2))
    hair = M(P([(15.4, 30), (14.8, 21), (18, 13), (25, 9.2), (32, 8.4), (39, 9.2), (46, 13), (49.2, 21), (48.6, 30), (45, 30), (44.5, 20.5), (40, 15.6), (36, 15.0), (33, 14.7), (31, 14.7), (28, 15.0), (24, 15.8), (19.6, 20.5), (19, 30)]))
    fv = skin_v(face, sp, hair_shadow=hair)
    P_.paint(face, skin, fv)
    features(P_, skin, e, sp)
    hv = lit(hblur(hair, 3.4, 1.4), amb=.5, gain=1.5) + (hair_tex(6, 8, 2.2) - .5) * .5 * 0 + (np.clip((32 - XX) / 28, -1, 1) * .12)
    strands = np.sin((XX - 32) * .5 + np.cos(YY * .2) * 3 + (YY - 8) * .12) * .5 + .5
    P_.paint(hair, hair_r, hv + (strands - .5) * .28, dw=.6)
    P_.flat(hair & (hv > .66) & (strands > .55), '#b890b0')
    P_.flat(M(L([(32, 14.8), (31.6, 8.8)], .6)) & hair, '#080414')   # raya
    P_.seam(hair, face, .5)
    # diadema / goma turquesa
    band = M(P([(14.6, 21), (18, 14.5), (21, 12), (22.4, 14.8), (19.4, 19), (17.4, 23)])) & False
    P_.flat(M(E(31, 9.6, 1.0, .7)) & False, '#38c8b8')
    P_.paint(M(P([(41.8, 11), (47, 15.5), (48.4, 19.5), (46, 19.5), (44, 15.5), (40.5, 12.6)])), ramp5('#2fc0b0', '#0c1038', '#d8fff0'), np.full((S, S), .48) + (32 - XX) / 80, dw=.3)
    return P_.finish()

def draw_ing(e):
    P_ = Pt(); sp = dict(gap=6.9, ey=30, my=41.4, iris=[hx('#1c3a50'), hx('#3a78a0'), hx('#8ac0d8')], brow=hx('#3a3438'), lip=hx('#b0645c'), browW=2.1, socket=.18, mw=.9)
    skin = ramp5('#d89a78', '#3a1448', '#ffd8b0')
    torso = M(P([(0, 64), (0, 58), (4, 52.5), (14, 49), (24, 46.8), (40, 46.8), (50, 49), (60, 52.5), (64, 58), (64, 64)]))
    cov = ramp5('#4a6a94', '#0a0c34', '#c8e4ff')
    v = lit(hblur(torso, 4, 1.5), amb=.52, gain=1.4) + np.clip((32 - XX) / 40, -1, 1) * .12 + (noise(S, S, 13, 5, 4, 2) - .5) * .1
    P_.paint(torso, cov, v, dw=.5)
    # tirantes con reflectante amarillo
    for s_ in (-1, 1):
        m = M(P([(32 + s_ * 10, 47.5), (32 + s_ * 15, 49), (32 + s_ * 20, 64), (32 + s_ * 13.5, 64)]))
        P_.paint(m, ramp5('#e8b020', '#3a1040', '#fff4a0'), np.full((S, S), .54) + (32 - XX) / 100 + (YY % 4 < 2) * .05, dw=.3)
        P_.flat(M(L([(32 + s_ * 12.4, 53), (32 + s_ * 16.2, 53)], 1.0)), '#e8f4f8') if False else None
    P_.flat(M(L([(10, 58.5), (54, 58.5)], 1.0)) & torso & ~M(L([(32 - 15, 47), (32 - 20, 64)], 4), L([(32 + 15, 47), (32 + 20, 64)], 4)), '#cfe8ee') if False else None
    # cuello de camisa
    neck = M(P([(25.4, 36), (38.6, 36), (40.5, 49), (23.5, 49)]))
    face = prof([(14, 0), (15.5, 5.5), (18.5, 9.4), (23, 11.6), (28, 12.6), (34, 12.9), (38, 12.5), (42, 11.8), (45.5, 10.2), (48, 6.6), (49.2, 2.2), (49.8, 0)])
    P_.paint(neck, skin, lit(hblur(neck, 3), amb=.44, gain=1.6) - blur(np.roll(face, 4, 0), 1.8) * .55)
    for s_ in (-1, 1):
        m = M(P([(32 + s_ * 2, 52), (32 + s_ * 7.6, 43.6), (32 + s_ * 13, 49.6), (32 + s_ * 12, 52), (32 + s_ * 6, 54)]))
        P_.paint(m, ramp5('#e8e4d8', '#2a1850', '#ffffff'), np.full((S, S), .52) + (.12 if s_ < 0 else -.08), dw=.4)
    ears = M(E(16.4, 32, 2.4, 3.6), E(47.6, 32, 2.4, 3.6)); P_.paint(ears, skin, np.full((S, S), .5) + (32 - XX) / 80)
    hat_dome = M(E(32, 17.2, 17.2, 14.6)) & (YY < 22)
    brim = M(P([(12.6, 20.6), (32, 18.6), (51.4, 20.6), (52.2, 23.6), (32, 25.6), (11.8, 23.6)]))
    fv = skin_v(face, sp, hair_shadow=brim)
    P_.paint(face, skin, fv)
    # barba corta + bigote (encima de la piel; la boca queda libre)
    beard = face & (((YY > 37.5) & (np.hypot(XX - 32, (YY - 34) * .8) > 9.4)) | ((YY > 43.6))) | (face & (YY > 36.4) & (YY < 38.6) & (np.abs(XX - 32) < 7) & (np.abs(XX - 32) > .01))
    beard = beard & ~M(E(32, 40.6, 5.0, 2.8)) | M(P([(25, 37), (39, 37), (37, 38.6), (32, 37.8), (27, 38.6)])) & face
    bd = ramp5('#4a4448', '#14102a', '#a8a0b0'); bv = lit(hblur(beard, 3, 1.2), amb=.5, gain=1.2) + np.clip((32 - XX) / 36, -1, 1) * .1 + (noise(S, S, 4, 1.3, 1.3, 2) - .5) * .5
    P_.paint(beard, bd, bv, dw=.9)
    features(P_, skin, e, sp)
    # gafas protectoras
    strap = M(P([(13.5, 27.6), (50.5, 27.6), (50.5, 31.6), (13.5, 31.6)]))
    P_.paint(strap & ~face, ramp5('#3a3c4c', '#0a0a1c', '#9098b8'), np.full((S, S), .45) + (32 - XX) / 100, dw=.3)
    P_.paint(strap & face & False, bd, np.full((S, S), .4))
    for sx in (-1, 1):
        x = 32 + sx * sp['gap']
        fr = M(P([(x - 5.8, 26.4), (x + 5.8, 26.4), (x + 6.4, 31), (x + 5.2, 34), (x - 5.2, 34), (x - 6.4, 31)]))
        lens = M(P([(x - 4.7, 27.4), (x + 4.7, 27.4), (x + 5.3, 31), (x + 4.4, 33), (x - 4.4, 33), (x - 5.3, 31)]))
        P_.paint(fr & ~lens, ramp5('#4a4e66', '#0a0a24', '#b0b8d8'), np.full((S, S), .5) + (32 - XX) / 70 + (YY < 29) * .06, dw=.3)
        P_.tint(lens, '#9ae8f8', .22)
        P_.flat(lens & (np.abs((XX - x) + (YY - 28) * 1.2 - 3) < .7) & (YY > 27) & (YY < 32), '#d8faff') if True else None
        P_.rgb[lens & (YY == 28) & (np.abs(XX - x + 2.8) < 1.5)] = hx('#e8fcff')
    P_.flat(M(L([(32 - sp['gap'] + 6, 29.6), (32 + sp['gap'] - 6, 29.6)], 1.3)), '#4a4e66'); P_.flat(M(L([(32 - sp['gap'] + 6, 29.0), (32 + sp['gap'] - 6, 29.0)], .6)), '#9098b8')
    # casco amarillo
    hy = ramp5('#f2c424', '#4a1048', '#fff8b0')
    dv = lit(hblur(hat_dome | brim, 4.5, 1.5), amb=.52, gain=1.45) + np.clip((32 - XX) / 36, -1, 1) * .16
    P_.paint(hat_dome & ~brim, hy, dv + (noise(S, S, 8, 6, 6, 2) - .5) * .06, dw=.45)
    P_.paint(brim, hy, np.full((S, S), .5) + np.clip((32 - XX) / 36, -1, 1) * .22 - (YY - 22) * .05, dw=.4)
    P_.flat(M(L([(31.4, 3.6), (31.4, 16)], 1.4)) & hat_dome & ~brim, '#fff0a0') if False else None
    for dx in (-1.7, 1.7): P_.paint(M(L([(32 + dx, 5.6), (32 + dx * 1.3, 16.4)], 1.7)) & hat_dome & ~brim, hy, np.full((S, S), .62 + (-.14 if dx > 0 else .1)), dw=.3)
    P_.flat(hat_dome & ~brim & (YY == 9) & (XX < 28) & (XX > 21), '#fffbd0') if False else None
    P_.seam(brim, face, .45)
    lamp = M(P([(26.8, 9.0), (37.2, 9.0), (37.2, 15.6), (26.8, 15.6)]))
    P_.paint(lamp, ramp5('#7a809a', '#10102a', '#e0e8ff'), lit(hblur(lamp, 1.6), amb=.5, gain=1.8) + (32 - XX) / 40)
    P_.flat(M(P([(28.6, 10.6), (35.4, 10.6), (35.4, 14.4), (28.6, 14.4)])), '#fff2b0'); P_.flat(M(P([(29.8, 11.4), (34.2, 11.4), (34.2, 13.6), (29.8, 13.6)])), '#ffffff')
    P_.seam(lamp, hat_dome, .5)
    gl = np.clip(1 - np.hypot((XX - 32) / 14, (YY - 12.5) / 10), 0, 1) ** 1.6
    P_.rgb = np.clip(P_.rgb + (lmask(gl * .6, 5) * P_.A)[..., None] * np.array([90, 58, 12.]), 0, 255)
    return P_.finish()

def draw_lia(e):
    e = dict(e)
    P_ = Pt(); sp = dict(gap=6.2, ey=30.5, my=41.0, iris=[hx('#2a3a50'), hx('#4a6a8c'), hx('#98b8d0')], brow=hx('#2a1c28'), lip=hx('#b8706c'), lash=True, heavy=True, browW=1.3, socket=.26, mw=.9)
    skin = ramp5('#e2b8a4', '#2a1450', '#ffe8d0')
    hair_r = ramp5('#3a2a3c', '#080818', '#8ab0d0')
    hairback = M(P([(13.4, 22), (50.6, 22), (53, 38), (50, 54), (14, 54), (11, 38)]))
    torso = M(P([(0, 64), (1, 57), (6, 52), (16, 48.5), (25, 46.5), (39, 46.5), (48, 48.5), (58, 52), (63, 57), (64, 64)]))
    P_.paint(torso, ramp5('#4a5a78', '#0c1038', '#b8d0f0'), lit(hblur(torso, 4, 1.5), amb=.5, gain=1.3) + (32 - XX) / 80, dw=.5)
    neck = M(P([(27, 36), (37, 36), (38.5, 50), (25.5, 50)]))
    face = prof([(15, 0), (16.2, 4.5), (18.8, 8.4), (23, 10.6), (28, 11.4), (34, 11.5), (38, 10.8), (42, 9), (45, 6.2), (47.2, 2.8), (48.2, 0)])
    P_.paint(hairback & ~face & ~torso, hair_r, lit(hblur(hairback, 4, 1.2), amb=.4, gain=1.2) - .06, dw=.8)
    P_.paint(neck, skin, lit(hblur(neck, 3), amb=.44, gain=1.6) - blur(np.roll(face, 3, 0), 1.6) * .5)
    # manta termica: dorada/plateada arrugada
    blanket = M(P([(0, 64), (0, 56), (5, 50.5), (14, 47), (23, 44.5), (27, 46), (32, 50), (37, 46), (41, 44.5), (50, 47), (59, 50.5), (64, 56), (64, 64)]))
    fo = ramp5('#c8a850', '#2a1050', '#fffff0')
    facet = noise(S, S, 21, 4.5, 4.5, 3, ridged=True)
    ang = np.sin((XX * .8 + YY * 1.1) * .55) * .5 + np.sin((XX * 1.3 - YY * .7) * .42) * .5
    bv = lit(hblur(blanket, 4, 1.8), amb=.5, gain=1.2) + np.clip((32 - XX) / 36, -1, 1) * .12 + (facet - .5) * .42 + ang * .1
    P_.paint(blanket, fo, bv, dw=.25)
    P_.flat(blanket & (bv > .86), '#fffbe8')
    P_.tint(blanket & (XX > 42), '#7ab0e0', .22)
    P_.paint(M(P([(22, 45), (26, 43.5), (30, 48.5), (32, 52), (34, 48.5), (38, 43.5), (42, 45), (36, 52), (32, 55.4), (28, 52)])), fo, np.full((S, S), .38) + (32 - XX) / 80 + (facet - .5) * .5, dw=.3)
    P_.flat(M(L([(24, 45), (28, 49), (32, 53)], .7)), '#6a5028'); P_.flat(M(L([(40, 45), (36, 49), (32, 53)], .7)), '#6a5028')
    ears = M(E(17.6, 31.5, 2.0, 3.2), E(46.4, 31.5, 2.0, 3.2)); P_.paint(ears, skin, np.full((S, S), .5) + (32 - XX) / 80)
    hair = M(P([(14.6, 38), (13.8, 22), (17, 13), (24, 8.6), (32, 8.0), (40, 8.6), (47, 13), (50.2, 22), (49.4, 38), (47.4, 40), (45.4, 33), (44.6, 24), (41, 17.6), (36, 15.0), (32.6, 14.5), (28.5, 15.2), (23, 17.8), (19.6, 24), (18.6, 33), (16.4, 40)]))
    sv = skin_v(face, sp, hair_shadow=hair); sv -= .0
    P_.paint(face, skin, sv)
    # ojeras y palidez fria, mejilla manchada
    P_.tint(M(E(32 - sp['gap'], 34.0, 4.4, 1.5), E(32 + sp['gap'], 34.0, 4.4, 1.5)), '#7a5a90', .38)
    P_.tint(M(E(32 + 8.6, 37.4, 2.8, 1.8)) & face, '#4a3430', .38); P_.tint(M(L([(21, 39), (23.4, 41.6)], .9)) & face, '#b04858', .7)
    P_.tint(M(E(32, 36.2, 1.8, 1.2)), '#e07078', .22)
    features(P_, skin, e, sp)
    P_.tint(M(P([(28.6, 40.6), (35.4, 40.6), (35.4, 42.6), (28.6, 42.6)])) & face, '#6a78b0', .18)
    hv = lit(hblur(hair, 3.2, 1.4), amb=.46, gain=1.4) + np.clip((32 - XX) / 28, -1, 1) * .08
    strands = np.sin((XX - 32) * .62 + np.cos(YY * .24) * 3.4 + (YY - 8) * .1) * .5 + .5
    P_.paint(hair, hair_r, hv + (strands - .5) * .3, dw=.6)
    wet = hair & (strands > .84) & (hv > .5); P_.flat(wet, '#9ad0f0')
    P_.flat(hair & (XX < 24) & (hv > .62) & (strands > .62), '#6a8cb0')
    for (a, b) in ((20.5, 28.6), (44.5, 28.0)):   # mechones mojados pegados
        P_.paint(M(L([(a, 24), (a + (.9 if a < 32 else -.9), b), (a + (.3 if a < 32 else -.3), b + 5)], 1.5)) & face, hair_r, np.full((S, S), .42), dw=.5)
    P_.flat(M(L([(32, 14.8), (31.3, 8.8)], .6)) & hair, '#06040e')
    P_.seam(hair, face, .45)
    for (a, b) in ((24, 30), (42, 31)): P_.rgb[int(b)+8, a] = hx('#bfe8ff') if False else P_.rgb[int(b)+8, a]
    return P_.finish()

DRAW = dict(guia=draw_guia, medica=draw_medica, ing=draw_ing, lia=draw_lia)
SHEET = ['neutral', 'preocupado', 'enfadado', 'feliz']; EXTRA = ['alert', 'hurt', 'talk']

def gen_portraits4():
    for role, fn in DRAW.items():
        sh = Image.new('RGBA', (S * 4, S), (0, 0, 0, 0))
        for i, ex in enumerate(SHEET): sh.alpha_composite(fn(EXP[ex]), (i * S, 0))
        save(sh, 'portrait_' + role, cell=S, fw=S, fh=S, frames=4, cols=4, expressions=SHEET, note='v4 64x64: hoja horizontal neutral, preocupado, enfadado, feliz (x=i*64). Fondo transparente')
        for ex in EXTRA:
            save(fn(EXP[ex]), 'portrait_%s_%s' % (role, ex), expression=ex, note='64x64 suelta; fondo transparente')
