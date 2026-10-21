"""Bloques de escena reutilizables (cielo, montañas, pinos, cueva en perspectiva, agua con reflejo, personajes-silueta)."""
import math
import numpy as np
from artlib import *

# ---- rampas maestras (sombra fría violeta -> luz cálida)
SKY_DUSK = R('#0d0a26', '#1a1342', '#32205e', '#5d2f7c', '#9a3f86', '#d4587a', '#f08a5a', '#ffbe78', '#ffe6a8')
SKY_STORM = R('#07070f', '#10101e', '#1a1c32', '#2a2c48', '#3e4062', '#575a80', '#7a7ea0')
SKY_DAWN = R('#2a3a78', '#4a62a8', '#7a8cc8', '#b8a8d8', '#f0b8c0', '#ffc890', '#ffe0a0', '#fff4d0')
ROCK = R('#0b0818', '#150f2a', '#211a3c', '#312850', '#4a3d69', '#6b5a8c', '#9482b0', '#c0b0d8')
ROCK_WARM = R('#0b0818', '#1c1230', '#33203c', '#52304a', '#7a4558', '#a8606a', '#d88a78', '#f8c8a0')
SNOW = R('#3a3070', '#5a4c96', '#8878c0', '#b4a8e0', '#dcd2f4', '#f8f4ff')
WATER = R('#050c24', '#0a1a40', '#0d3560', '#14688a', '#24a0b0', '#60d4d0', '#b8f4ec')
CRYS_C = R('#12206a', '#1f3f9a', '#2a78c8', '#38b8e8', '#7ae8f4', '#e0ffff')
CRYS_V = R('#1e1058', '#3a1c90', '#5c34c8', '#8a5cf0', '#b898ff', '#f0e0ff')
WARM = R('#2a1020', '#6a2a28', '#c0582a', '#f0902e', '#ffc860', '#fff0b0')
PINE = R('#0a0818', '#120d28', '#1a1438', '#26204a', '#383064')
SKIN = R('#3a2040', '#6e3a48', '#a8604c', '#d08c68', '#ecb890', '#fcdcb8')
INK = hx('#0b0818')


def sky(cv, ramp, horizon, seed=1, warp=.05, power=1.3, top=0.0):
    v = np.clip((cv.yy - top) / (horizon - top), 0, 1)**power
    v = v + (noise(cv.w, cv.h, seed, 60, 12, 3) - .5) * warp
    cv.a[:] = ramp_map(np.clip(v, 0, 1), ramp, dw=.9)

def clouds(cv, seed, y0, y1, ramp, cover=.52, sun=(1, -.3), sx=70, sy=14, contrast=1.0, wrapx=False):
    n = noise(cv.w, cv.h, seed, sx, sy, 4, .55, wrapx=wrapx)
    band = np.clip(1 - np.abs((cv.yy - (y0 + y1) / 2) / ((y1 - y0) / 2)), 0, 1)**.7
    d = n * band
    m = d > (1 - cover) * .72 + .05
    # luz: diferencia con la nube desplazada hacia el sol
    sh = np.roll(np.roll(d, -int(sun[1] * 3), 0), -int(sun[0] * 4), 1)
    lit = np.clip(.5 + (d - sh) * 7 * contrast + (d - .5) * .9, 0, 1)
    cv.put(m, ramp_map(lit, ramp, dw=.6))
    return m

def mountains(cv, base, amp, seed, ramp, sun=1, snowline=.6, snowramp=SNOW, fogcol=None, fog=0., sx=90, detail=.5, ridged=True, top_snow=True, bright=1.):
    """cadena montañosa; luz desde `sun` (+1 derecha / -1 izquierda). Devuelve máscara."""
    w, h = cv.w, cv.h
    prof1 = noise(w, 1, seed, sx, 1, 4, .5, ridged=ridged)[0]
    prof = base - amp * (prof1 ** 1.25)
    mask = cv.yy >= prof[None, :]
    h2 = noise(w, h, seed + 7, 9, 26, 4, .5, ridged=True)
    hh = (cv.yy - prof[None, :])  # profundidad bajo cresta
    height = np.clip(1 - hh / (amp * 1.1), 0, 1)
    gx = np.gradient(blur(h2 * mask, 1.2), axis=1)
    facet = np.gradient(blur(h2, 2.0), axis=1) * sun
    v = .46 + facet * 9 * detail + (height - .4) * .5
    v = np.clip(v * bright, 0, 1)
    cols = ramp_map(v, ramp, dw=.75)
    cv.put(mask, cols)
    if top_snow:
        sm = mask & (height > snowline + .25 * (.5 - h2)) & (hh < amp * (1 - snowline) * .7 + 24 * h2 - 8) & (facet * sun > -.0015)
        cv.put(sm, ramp_map(np.clip(.4 + facet * 10 * detail + (height - .6), 0, 1), snowramp, dw=.7))
    # luz rasante en la cresta
    top = mask & ~np.roll(mask, 1, 0)
    cv.put(top & (height > .2), mix(cols, hx('#fff0d8'), .35) if False else ramp[-1])
    if fog and fogcol is not None:
        cv.fog_soft(np.clip((1 - height) ** 2 * fog + fog * .1, 0, 1) * mask, fogcol, 5)
    return mask

def pine_mask(w, h, x, ybase, ht, wd=None, tiers=None, seed=0, lean=0):
    wd = wd or ht * .42; tiers = tiers or max(3, int(ht / 7)); r = np.random.default_rng(seed + int(x))
    def f(d, s):
        d.rectangle([(x - max(wd*.07, .5)) * s, (ybase - ht * .12) * s, (x + max(wd*.07, .5)) * s, ybase * s], fill=255)
        for k in range(tiers):
            t0 = k / tiers; ty = ybase - ht + ht * (t0 * .86) ; wk = wd * (.28 + .72 * ((k + 1) / tiers))
            by = ty + ht * .86 / tiers * 1.9
            jx = r.uniform(-.6, .6)
            pts = [(x + jx + lean * (1 - t0), ty)]
            pts += [(x - wk * .5 + jx * .3, by - 1.0), (x - wk * .5 * .55, by - 2.2 - r.uniform(0, 1.2)), (x, by - 0.6)]
            pts += [(x + wk * .5 * .55, by - 2.2 - r.uniform(0, 1.2)), (x + wk * .5 + jx * .3, by - 1.0)]
            d.polygon([(a * s, b * s) for a, b in pts], fill=255)
    return drawmask(w, h, f, 3)

def forest(cv, ybase, hmin, hmax, n, seed, ramp, L=(.8, -.4), rimcol=None, fogcol=None, fog=0., xs=None, snow=True, lean=0.0):
    r = np.random.default_rng(seed); m = np.zeros((cv.h, cv.w), bool)
    for i in range(n):
        x = r.uniform(-4, cv.w + 4) if xs is None else xs[i % len(xs)] + r.uniform(-3, 3)
        ht = r.uniform(hmin, hmax); yb = ybase + r.uniform(-4, 5)
        m |= pine_mask(cv.w, cv.h, x, yb, ht, seed=seed + i, lean=lean)
    tex = noise(cv.w, cv.h, seed, 5, 5, 2)
    cols = shade(m, ramp, L=(L[0], L[1]), r=1.8, amb=.38, gain=2.2, tex=tex, texamt=.25, dw=.6)
    cv.put(m, cols)
    if snow:  # nieve en los bordes superiores de cada piso
        up = m & ~np.roll(m, 1, 0)
        up |= m & ~np.roll(m, 2, 0) & (tex > .55)
        cv.put(up, SNOW[3] * .55 + ramp[3] * .45)
    if rimcol is not None:
        sx = int(np.sign(L[0])); rm = m & ~np.roll(m, -sx, 1)
        cv.put(rm, rimcol)
    if fog: cv.fog(np.clip(fog * (1 - (cv.yy - (ybase - hmax)) / (hmax + 8)), 0, 1) * m, fogcol)
    return m

def mist(cv, y0, y1, seed, col, dens=.5, sx=80, sy=10, drift=0):
    n = noise(cv.w, cv.h, seed, sx, sy, 3, .55)
    band = np.clip(1 - np.abs((cv.yy - (y0 + y1) / 2) / ((y1 - y0) / 2)), 0, 1)
    cv.fog_soft(np.clip((n - .35) * 2.2, 0, 1) * band * dens, col, levels=5)

def sun_glow(cv, x, y, col=(255, 190, 110), r=110, big=.65, disc=True):
    cv.glow(x, y, r, col, s=big, p=2.2, levels=7)
    cv.glow(x, y, r * .35, (255, 225, 160), s=.8, p=1.6, levels=6)
    if disc:
        cv.put(ell(cv.w, cv.h, x, y, 9, 9), hx('#fff4d0'))

def rays(cv, x, y, ang0, ang1, n, seed, col, strength=.25, length=300, levels=4):
    """haces volumétricos (god rays) desde un punto"""
    r = np.random.default_rng(seed)
    a = np.arctan2(cv.yy - y, cv.xx - x); d = np.hypot(cv.xx - x, cv.yy - y)
    tot = np.zeros((cv.h, cv.w))
    for _ in range(n):
        c = r.uniform(ang0, ang1); wd = r.uniform(.02, .07); s = r.uniform(.4, 1)
        tot += np.exp(-((a - c) / wd) ** 2) * s
    tot *= np.clip(1 - d / length, 0, 1) ** 1.2
    cv.add(np.clip(tot, 0, 1) * strength, np.array(col, float) * .55, levels)

def figure(cv, x, y, h, body, light=(1, -1), lamp=True, face=1, seed=0, hat=None, skin=None, pack=False, pose=0, rimcol=None):
    """silueta de rescatador con volumen (x,y = pies). h px. face=+1 mira a la derecha."""
    W, H = cv.w, cv.h
    s = h / 24.0
    def X(v): return x + face * v * s
    def Y(v): return y - (24 - v) * s
    parts = {}
    def f(d, ss):
        def P(pts): return [(X(a) * ss, Y(b) * ss) for a, b in pts]
        # piernas
        d.polygon(P([(-3, 16), (-0.5, 16), (-1.2 + pose * .6, 24), (-4 + pose * .6, 24)]), fill=255)
        d.polygon(P([(0.3, 16), (3, 16), (3.4 - pose * .6, 24), (.4 - pose * .6, 24)]), fill=255)
        # torso con hombros
        d.polygon(P([(-4.6, 10.2), (-2.6, 8.3), (2.6, 8.3), (4.6, 10.2), (3.4, 17), (-3.4, 17)]), fill=255)
        d.rectangle([X(-1)*ss if face>0 else X(1)*ss, Y(7.4)*ss, X(1)*ss if face>0 else X(-1)*ss, Y(8.8)*ss], fill=255)
        # brazo
        d.polygon(P([(-4.8, 9.6), (-2.8, 9.2), (-1.6 + pose, 16.4), (-3.6 + pose, 16.4)]), fill=255)
        if pack: d.polygon(P([(-6.4, 9), (-3.6, 9), (-3.6, 16.5), (-6.4, 16)]), fill=255)
        # cabeza
        d.ellipse([ (X(-2.6))*ss if face>0 else X(2.6)*ss, Y(2.6)*ss, (X(2.6))*ss if face>0 else X(-2.6)*ss, Y(8.8)*ss], fill=255)
    m = drawmask(W, H, f, 4)
    ys = np.where(m.any(1))[0];
    cols = shade(m, body, L=(light[0], light[1]), r=max(h / 14, 1.2), amb=.34, gain=2.4, dw=.5)
    cv.put(m, cols)
    # cabeza con piel
    hm = ell(W, H, X(0), Y(5.7), 2.7 * s, 3.1 * s)
    if skin is None: cv.put(hm, shade(hm, body, L=(light[0], light[1]), r=max(h / 14, 1.2), amb=.3, gain=2.4, dw=.5))
    if skin is not None:
        cv.put(hm, shade(hm, skin, L=(light[0], light[1]), r=max(h / 14, 1.2), amb=.35, gain=2.4, dw=.5))
    if hat is not None:
        hmask = ell(W, H, X(0), Y(5.0), 3.2 * s, 3.4 * s) & (cv.yy < Y(4.7))
        cv.put(hmask, shade(hmask, hat, L=(light[0], light[1]), r=max(h / 16, 1), amb=.4, gain=2.2, dw=.5))
        if lamp: cv.put(rect(W, H, X(2.2 if face > 0 else -3.2), Y(5.1), X(3.2) if face > 0 else X(-2.2), Y(5.1) + max(1, 1.4 * s)), hx('#fff4c0'))
    if rimcol is not None:
        sx = int(np.sign(light[0])); rm = (m | hm) & ~np.roll(m | hm, sx, 1)
        rm &= (cv.yy < y) ; cv.put(rm, rimcol)
    return m | hm

def beam(cv, x, y, ang, spread, length, col, strength=.5, face=1, levels=6, p=1.0, noise_seed=None):
    """cono de luz de linterna (aditivo, dithered) con ruido volumétrico"""
    dx, dy = cv.xx - x, cv.yy - y; d = np.hypot(dx, dy) + 1e-6
    a = np.arctan2(dy, dx); da = np.abs(((a - ang + math.pi) % (2 * math.pi)) - math.pi)
    inten = np.clip(1 - da / spread, 0, 1) ** 1.3 * np.clip(1 - d / length, 0, 1) ** p
    if noise_seed is not None: inten *= .7 + .6 * noise(cv.w, cv.h, noise_seed, 20, 12, 3)
    cv.add(np.clip(inten * strength, 0, 1), np.array(col, float) * .6, levels)
    return inten

def water_reflect(cv, wy, tint, seed=0, mixamt=.62, ripple=2.2, dark=.55, sky_fres=None, shimmer=None, levels=5):
    """Agua con reflejo: refleja lo que hay sobre wy, distorsiona con ondas, oscurece y tiñe; líneas de brillo."""
    h, w = cv.h, cv.w
    src = cv.a.copy(); tint = np.asarray(tint, float)
    n1 = noise(w, h, seed, 40, 3, 3)
    for y in range(int(wy), h):
        d = y - wy
        sy = int(wy - d * 1.0 - 1)
        if sy < 0: break
        off = (np.sin(d * .9 + np.arange(w) * .05 + seed) * ripple * (.3 + d / 30) + (n1[y] - .5) * ripple * 3)
        sx = np.clip((np.arange(w) + off.astype(int)), 0, w - 1)
        row = src[sy, sx]
        fres = np.clip(.5 + d / (h - wy + 1) * .6, 0, 1)
        row = mix(row * dark, tint, (1 - mixamt) * (.5 + .5 * fres))
        cv.a[y] = row
    # destellos horizontales
    r = np.random.default_rng(seed + 3)
    for _ in range(int(w * (h - wy) / 120)):
        x = r.integers(0, w); y = int(wy + 1 + r.exponential((h - wy) / 3))
        if y < h:
            L = int(r.integers(2, 9)); col = (shimmer if shimmer is not None else hx('#bff4ec'))
            for k in range(L):
                if x + k < w: cv.a[y, x + k] = mix(cv.a[y, x + k], col, .75 if k not in (0, L-1) else .4)
    # línea de orilla
    cv.a[int(wy)] = mix(cv.a[int(wy)], hx('#9ef0e4'), .35)


def cave_tunnel(cv, vp, seed, ramp, R0=(34, 24), warp=.35, wall_light=1.0, lamp=(0.0, 0.0), irreg=.28, tex_scale=18, far_col=None, torch=None):
    """Túnel en perspectiva: coordenadas polares alrededor del punto de fuga. Devuelve (mask_pared, t, ang)."""
    w, h = cv.w, cv.h; vx, vy = vp
    dx = (cv.xx - vx) / 1.0; dy = (cv.yy - vy)
    r = np.hypot(dx, dy) + 1e-6; ang = np.arctan2(dy, dx)
    # radio de la boca lejana irregular en función del ángulo
    na = np.interp(ang, np.linspace(-math.pi, math.pi, 64), noise(64, 1, seed, 6, 1, 2, wrapx=True)[0])
    na2 = np.interp(ang, np.linspace(-math.pi, math.pi, 64), noise(64, 1, seed + 5, 12, 1, 2, wrapx=True)[0])
    R_ = (R0[0] * (np.cos(ang)**2) + R0[1] * (np.sin(ang)**2)) * (1 + (na - .5) * irreg * 2 + (na2 - .5) * irreg)
    t = r / R_  # 1 = borde de la boca lejana, crece hacia cámara
    # textura roca: (ángulo, log profundidad)
    u = (ang + math.pi) / (2 * math.pi) * tex_scale * 6
    vv = np.log(np.maximum(t, .05)) * tex_scale
    # ruido 2D por muestreo de tabla grande
    tab = noise(256, 256, seed + 11, 22, 22, 4, .55, wrapx=True)
    tab2 = noise(256, 256, seed + 12, 9, 9, 3, .5, wrapx=True)
    iu = (u.astype(int)) % 256; iv = (vv.astype(int) * 3) % 256
    tex = tab[iv, iu] * .65 + tab2[iv, iu] * .35
    # luz: caída con la profundidad; zona cercana (t grande) oscura por viñeteo natural; luz de lámpara en el centro
    depth_light = np.clip(1.15 - np.log(np.maximum(t, 1)) * .55, 0, 1)
    v = (.18 + tex * .55) * (.35 + depth_light * wall_light) + (tex - .5) * .25
    # facetas direccionales (luz arriba-izquierda)
    fx = np.gradient(blur(tex, 1.0), axis=1) * -6 - np.gradient(blur(tex, 1.0), axis=0) * 6
    v = v + fx * .35 * depth_light
    return ramp_map(np.clip(v, 0, 1), ramp, dw=.7), t, ang, tex

def stalactites(cv, n, seed, y0, ramp, ymax=60, wmin=3, wmax=9, hmin=10, hmax=40, L=(-1, -.5), from_top=True, region=None, sizescale=1.0):
    r = np.random.default_rng(seed); m = np.zeros((cv.h, cv.w), bool)
    for _ in range(n):
        x = r.uniform(0, cv.w) if region is None else r.uniform(*region)
        wd = r.uniform(wmin, wmax) * sizescale; ht = r.uniform(hmin, hmax) * sizescale
        if from_top:
            pts = [(x - wd / 2, y0 - 2), (x + wd / 2, y0 - 2), (x + r.uniform(-.8, .8), y0 + ht)]
        else:
            pts = [(x - wd / 2, y0 + 2), (x + wd / 2, y0 + 2), (x + r.uniform(-.8, .8), y0 - ht)]
        m |= poly(cv.w, cv.h, pts, 3)
    cols = shade(m, ramp, L=L, r=1.4, amb=.4, gain=2.0, dw=.6, tex=noise(cv.w, cv.h, seed, 5, 8, 2), texamt=.25)
    cv.put(m, cols)
    return m

def crystal_cluster(cv, x, y, h, ramp, seed, n=5, glow_col=(60, 200, 240), glow=.6, spread=.5, glowr=None):
    """racimo de cristales facetados con luz propia"""
    r = np.random.default_rng(seed); W, H = cv.w, cv.h
    if glow: cv.glow(x, y - h * .5, glowr or h * 2.2, glow_col, s=glow, p=2.0, levels=6)
    ms = []
    for i in range(n):
        ang = (i / max(n - 1, 1) - .5) * 2 * spread + r.uniform(-.12, .12)
        L_ = h * r.uniform(.5, 1.0) * (1 - abs(i - n / 2) / (n) * .6); wd = L_ * r.uniform(.17, .26)
        bx = x + r.uniform(-h * .18, h * .18)
        tx, ty = bx + math.sin(ang) * L_, y - math.cos(ang) * L_
        px, py = math.cos(ang), math.sin(ang)
        pts = [(bx - px * wd, y + py * wd), (bx + px * wd, y - py * wd), (bx + px * wd * .85 + (tx - bx) * .82, y - py * wd * .85 + (ty - y) * .82), (tx, ty), (bx - px * wd * .85 + (tx - bx) * .82, y + py * wd * .85 + (ty - y) * .82)]
        m = poly(W, H, pts, 4); ms.append(m)
        cols = shade(m, ramp[:-1], L=(-.7, -.7), r=max(wd * .5, 1.2), amb=.5, gain=2.2, dw=.45)
        cv.put(m, cols)
        e = edge(m); cv.put(e & (cv.xx < (bx + tx) / 2 + 1), ramp[-2])
        # faceta brillante (arista central)
        cv.put(line(W, H, [(bx, y - 1), (tx, ty + 1)], .8) & m, ramp[-1] if i % 2 == 0 else ramp[-2])
        cv.put(ell(W, H, tx, ty, .9, .9) & m, hx('#ffffff'))
    return ms

def sparkle(cv, x, y, s, col=(255, 255, 255)):
    c = np.asarray(col, float)
    cv.a[int(y), int(x)] = c
    for k in range(1, s + 1):
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            xx, yy = int(x + dx), int(y + dy)
            if 0 <= xx < cv.w and 0 <= yy < cv.h: cv.a[yy, xx] = mix(cv.a[yy, xx], c, 1 - k / (s + 1) * .7)

def particles(cv, n, seed, region, col, size=1, alpha=(.4, .8)):
    r = np.random.default_rng(seed)
    for _ in range(n):
        x = int(r.uniform(region[0], region[2])); y = int(r.uniform(region[1], region[3])); a = r.uniform(*alpha)
        if 0 <= x < cv.w - size and 0 <= y < cv.h - size:
            cv.a[y:y+size, x:x+size] = mix(cv.a[y:y+size, x:x+size], np.asarray(col, float), a)


def rock_surface(w, h, seed, ramp, L=(-1, -.8), strata=.35, sx=26, sy=12, amb=.4, gain=7., ao=.5):
    """color de roca facetada con estratos: float RGB (h,w,3)"""
    n = noise(w, h, seed, sx, sy, 5, .55, ridged=True)
    st = noise(w, h, seed + 1, sx * 3, 5, 3)
    hgt = n * .7 + st * strata
    gy, gx = np.gradient(blur(hgt, 1.1))
    lx, ly = L; ln = math.hypot(lx, ly)
    lam = -(gx * lx + gy * ly) / ln * gain
    big = noise(w, h, seed + 2, 70, 50, 2)
    v = amb + lam * .6 + (n - .5) * .4 + (big - .5) * ao
    return ramp_map(np.clip(v, 0, 1), ramp, dw=.7), hgt, v


def tunnel_scene(cv, vp, seed, ramp, R0=(60, 42), irreg=.3, wall_light=1.0, mistcol=(40, 70, 110), far=None, fogk=1.0, n=9, bright=1.0, smin=.1):
    """compone cueva en perspectiva; `far` = array RGB que se ve por el fondo."""
    if far is None: far = np.zeros((cv.h, cv.w, 3)) + np.asarray(mistcol, float)
    cv.a[:] = far
    holes = cave_ribs(cv, vp, seed, ramp, n=n, smin=smin, base=R0, mistcol=mistcol, irreg=irreg, wall_light=wall_light, fogk=fogk, bright=bright)
    return ~holes[0], holes

_DIG = {'1': '010 110 010 010 111', '2': '111 001 111 100 111', '3': '111 001 111 001 111', '4': '101 101 111 001 001', '5': '111 100 111 001 111'}
def digit(cv, ch, x, y, col, s=1):
    for r, row in enumerate(_DIG[ch].split()):
        for c, v in enumerate(row):
            if v == '1':
                cv.a[int(y + r * s):int(y + (r + 1) * s), int(x + c * s):int(x + (c + 1) * s)] = np.asarray(col, float)


def cave_ribs(cv, vp, seed, ramp, n=9, smin=.1, smax=1.9, base=(64, 46), mistcol=(30, 54, 96), irreg=.3, wall_light=1.0, fogk=1.0, bright=1.0):
    """Cueva en perspectiva por 'costillas' de roca apiladas (lejos->cerca). cv.a debe contener el fondo lejano."""
    w, h = cv.w, cv.h; vx, vy = vp
    dx = cv.xx - vx; dy = cv.yy - vy; ang = np.arctan2(dy, dx); rr = np.hypot(dx, dy)
    grid = np.linspace(-math.pi, math.pi, 97)
    rl = np.random.default_rng(seed)
    holes = []
    for k in range(n):
        f = k / (n - 1); s = smin * (smax / smin) ** f
        prof = noise(96, 1, seed + k * 3, 9, 1, 3, wrapx=True)[0]; prof = np.append(prof, prof[0])
        prof2 = noise(96, 1, seed + k * 3 + 1, 24, 1, 2, wrapx=True)[0]; prof2 = np.append(prof2, prof2[0])
        na = np.interp(ang, grid, prof) - .5; nb = np.interp(ang, grid, prof2) - .5
        rx, ry = base[0] * s, base[1] * s
        Rk = (rx * ry) / np.sqrt((ry * np.cos(ang)) ** 2 + (rx * np.sin(ang)) ** 2) * (1 + na * irreg * 2.2 + nb * irreg * .8)
        holes.append(rr < Rk)
    tex = [rock_surface(w, h, seed + 100 + j * 7, ramp, L=(-1, -.8), strata=.35, sx=20, sy=14, amb=.34, gain=6., ao=.35) for j in range(3)]
    for k in range(n):
        f = k / (n - 1); wallm = ~holes[k]
        col, hgt, v = tex[k % 3]
        # luz de la lámpara: más clara cerca del borde del hueco; más oscura lejos del eje
        near_edge = blur(holes[k].astype(float), 4 + 5 * f)
        lampv = np.clip(near_edge * 1.7 - .35, 0, 1)
        depthv = (.66 - .36 * f) * bright; vv = np.clip(depthv + (v - .5) * (.95 - .3 * f) + lampv * .3 * (1 - f * .5) * wall_light, 0, 1)
        colk = ramp_map(vv, ramp, dw=.7)
        cv.put(wallm, colk)
        # borde del hueco: labio iluminado arriba-izq, sombra abajo-der
        ring = dilate(holes[k], 2) & wallm
        ring1 = dilate(holes[k], 1) & wallm
        top = ring & ~np.roll(np.roll(dilate(holes[k], 2), 2, 0), 1, 1) | (ring1 & (np.gradient(blur(holes[k].astype(float), 1.5), axis=0) > .05))
        ceil = cv.yy < vy + 6
        cv.put(ring1 & ceil, ramp[-3]); cv.put(ring1 & ~ceil, ramp[1]); cv.put((ring & ~ring1) & ~ceil, ramp[0])
        # niebla atmosférica por profundidad (más intensa cuanto más lejos)
        cv.fog_soft((1 - f) ** 1.5 * wallm * .45 * fogk, mistcol, 6)
    return holes
