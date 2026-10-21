"""v13: ilustraciones de FINAL 480x270 (end_good_1..3, end_bad_1..3), panoramicas para Ken Burns.
Uso: python3 tools/art_ends13.py  (escribe assets/gen/end_*.png, actualiza meta.json y preview)."""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from art_scenes import *
W, H = 480, 270
NOTE = 'ilustracion de final 480x270 (mas ancha que 16:9) para Ken Burns/paneo; sin alfa'
SIL = (12, 9, 28)


# ------------------------------------------------------------------ personas
def _r(hexc, grade, sil, silc, k=1.):
    c = hx(hexc); dk = hx('#1c0f40'); lt = hx('#ffe0b0')
    cols = [mix(c, dk, .62), mix(c, dk, .36), c, mix(c, lt, .3)]
    out = []
    for q in cols:
        if grade: q = mix(q, np.array(grade[0], float), grade[1]) * grade[2]
        if sil: q = mix(q, np.array(silc, float), sil * k)
        out.append(np.clip(q, 0, 255))
    return np.array(out)

KINDS = dict(
    mateo=dict(top='#b8702e', pants='#4a4a5c', boot='#4a2c1c', hair='#4a2c1c', skin='#e0a674', acc='#c83a48'),
    elena=dict(top='#f2eeea', pants='#46607a', boot='#4a3a40', hair='#241c30', skin='#f2d0b4', acc='#d8283c', under='#8aa0b8'),
    samuel=dict(top='#3a6cc0', pants='#2e56a0', boot='#5a3a28', hair='#f6c820', skin='#9a6440', acc='#f6c820'),
    lia=dict(top='#e8b832', pants='#4a5a8a', boot='#3a3048', hair='#1c1828', skin='#dba078', acc='#e8b832'))

def _limb(cv, pts, wd, cols, L, tex=None):
    m = line(cv.w, cv.h, pts, wd)
    cv.put(m, shade(m, cols, L=L, r=1.3, amb=.5, gain=2.2, dither=False)); return m

def person(cv, x, fy, h, kind, pose=None, grade=None, L=(-1, -.3), rimcol=None, sil=0., silc=SIL, view='back', facing=1, mood=0, held=None):
    """persona de h px. pose: dict(a=[pts], b=[pts] brazos (rel. hombro, unidades h), la, lb piernas (rel. cadera), lean, bow, bend).
    view: back | side | front. mood: 0 neutro, 1 triste. sil: 0..1 mezcla a silueta (acentos se conservan algo)."""
    p = dict(a=[(-.03, .15), (-.03, .29)], b=[(.03, .15), (.03, .29)], la=[(0, .2), (0, .4)], lb=[(0, .2), (0, .4)], lean=0., bow=0., hx=0., drop=0.)
    p.update(pose or {}); K = KINDS[kind]; w, hh = cv.w, cv.h
    rr = lambda c, k=1.: _r(c, grade, sil, silc, k)
    top, pants, boot, skin, hair = rr(K['top']), rr(K['pants']), rr(K['boot']), rr(K['skin'], .85), rr(K['hair'], .8)
    acc = rr(K['acc'], .35)
    lean = p['lean'] * h; sy = fy - .72 * h + p['drop'] * h; hy = fy - .40 * h + p['drop'] * h
    sw = .15 * h * (.72 if view == 'side' else 1); hw = .06 * h * (.5 if view == 'side' else 1)
    # --- piernas
    bodymask = np.zeros((hh, w), bool)
    for key, sgn in (('lb', 1), ('la', -1)):
        pts = [(x + sgn * hw + lean * .3, hy)] + [(x + sgn * hw + lean * .3 + dx * h, hy + dy * h) for dx, dy in p[key]]
        m = _limb(cv, pts, .13 * h, pants, L); bodymask |= m
        fx, fyy = pts[-1]
        bm = ell(w, hh, fx + facing * .02 * h * (view == 'side') + (.0 if view != 'back' else 0), fyy + .01 * h, .085 * h * (1.2 if view == 'side' else 1), .04 * h)
        cv.put(bm, shade(bm, boot, L=L, r=1.2, amb=.45, gain=2, dither=False)); bodymask |= bm
    # --- torso
    tw0, tw1 = sw * .98, sw * .8
    tors = poly(w, hh, [(x - tw0 + lean, sy), (x + tw0 + lean, sy), (x + tw1 + lean * .5, hy + .02 * h), (x - tw1 + lean * .5, hy + .02 * h)])
    tors |= ell(w, hh, x + lean, sy + .01 * h, tw0, .035 * h)
    if kind == 'elena':
        arm_c = rr(K['under']);
    else: arm_c = top
    # brazos detras del torso si cuelgan hacia atras no; simple: brazos encima
    cv.put(tors, shade(tors, top, L=L, r=2.4, amb=.5, gain=1.9, dither=False)); bodymask |= tors
    # detalles del torso
    if kind == 'mateo':
        cv.put(line(w, hh, [(x + lean, sy + .03 * h), (x + lean * .5, hy)], .8), top[0])           # costura espalda
        cv.put(rect(w, hh, x - tw1 + lean * .5, hy - .02 * h, x + tw1 + lean * .5, hy + .015 * h), top[0])
    if kind == 'elena':
        cx0, cy0 = x + lean * .8, sy + .12 * h; cs = max(1, int(.045 * h))
        cv.put(rect(w, hh, cx0 - cs // 2 - (cs % 2 == 0) * 0, cy0 - cs, cx0 + (cs + 1) // 2, cy0 + cs + 1), acc[2])
        cv.put(rect(w, hh, cx0 - cs, cy0 - cs // 2, cx0 + cs + 1, cy0 + (cs + 1) // 2), acc[2])
    if kind == 'samuel':
        cv.put(line(w, hh, [(x - tw0 * .6 + lean, sy), (x + tw1 * .55 + lean * .5, hy)], 1), top[0])  # tirantes en X
        cv.put(line(w, hh, [(x + tw0 * .6 + lean, sy), (x - tw1 * .55 + lean * .5, hy)], 1), top[0])
        cv.put(rect(w, hh, x - tw1 + lean * .5, hy - .03 * h, x + tw1 + lean * .5, hy - .01 * h), rr('#d8d4c0', .3)[2])  # banda reflectante
    if kind == 'lia':
        # manta termica dorada sobre hombros hasta las rodillas
        bl = poly(w, hh, [(x - sw * 1.15 + lean, sy - .01 * h), (x + sw * 1.15 + lean, sy - .01 * h), (x + sw * 1.45 + lean * .4, fy - .17 * h), (x + sw * .2, fy - .12 * h),
                          (x - sw * .5, fy - .15 * h), (x - sw * 1.45 + lean * .4, fy - .13 * h)])
        cv.put(bl, shade(bl, rr('#e8b832', .5), L=L, r=2.6, amb=.52, gain=2.6, dither=False)); bodymask |= bl
        for i in (-1, 0, 1): cv.put(line(w, hh, [(x + i * sw * .5 + lean, sy + .05 * h), (x + i * sw * .7 + lean * .5, fy - .18 * h)], .8) & bl, rr('#fff0b0', .3)[3])
    # --- brazos
    for key, sgn in (('b', 1), ('a', -1)):
        pts = [(x + sgn * (sw * .92) + lean, sy + .03 * h)] + [(x + sgn * sw * .92 + lean + dx * h, sy + .03 * h + dy * h) for dx, dy in p[key]]
        m = _limb(cv, pts, .085 * h, arm_c if kind != 'lia' else rr('#e8b832', .5), L); bodymask |= m
        hm = ell(w, hh, pts[-1][0], pts[-1][1], .04 * h, .04 * h)
        cv.put(hm, shade(hm, skin, L=L, r=1, amb=.55, gain=1.5, dither=False)); bodymask |= hm
        if held and held[0] == key:
            hx_, hy_ = pts[-1]; cv.put(rect(w, hh, hx_ - 1, hy_ - 1, hx_ + 2, hy_ + 2), hx(held[1]))
    # --- cabeza
    r0 = .105 * h; cx = x + lean * 1.1 + p['hx'] * h; cy = sy - .14 * h + p['bow'] * h
    nk = rect(w, hh, cx - .035 * h, cy, cx + .035 * h, sy + .01 * h)
    cv.put(nk, skin[1]); bodymask |= nk
    hd = ell(w, hh, cx, cy, r0, r0 * 1.08); fl = facing
    cv.put(hd, shade(hd, skin, L=L, r=1.6, amb=.55, gain=1.8, dither=False)); bodymask |= hd
    if kind == 'mateo' or kind == 'elena' or kind == 'lia':
        if view == 'back': hm = hd & (cv.yy < cy + r0 * (.85 if kind != 'lia' else .6))
        elif view == 'side': hm = hd & ((cv.yy < cy - r0 * .38) | ((cv.xx - cx) * fl < -r0 * .25))
        else: hm = hd & ((cv.yy < cy - r0 * .42) | (np.abs(cv.xx - cx) > r0 * .85))
        hm = hm | ell(w, hh, cx, cy - .12 * r0, r0 * 1.04, r0 * .95) & (cv.yy < cy - r0 * .1)
        hm |= ell(w, hh, cx, cy - .2 * r0, r0 * 1.02, r0 * .9) & (cv.yy < cy - r0 * .3)
        if kind == 'mateo':
            hm |= ell(w, hh, cx - fl * r0 * .1, cy - r0 * .35, r0 * 1.08, r0 * .72) if view != 'front' else np.zeros_like(hm)
        cv.put(hm, shade(hm, hair, L=L, r=1.5, amb=.48, gain=2.2, dither=False)); bodymask |= hm
        if kind == 'elena':
            bx = cx - (fl * r0 * .75 if view == 'side' else 0); by = cy - r0 * (1.15 if view != 'side' else .85)
            bun = ell(w, hh, bx, by, r0 * .52, r0 * .5)
            cv.put(bun, shade(bun, hair, L=L, r=1.2, amb=.5, gain=2.4, dither=False)); bodymask |= bun
        if kind == 'lia':
            if view == 'back':
                lh = poly(w, hh, [(cx - r0 * 1.02, cy), (cx + r0 * 1.02, cy), (cx + r0 * 1.15 + lean, sy + .12 * h), (cx + lean, sy + .17 * h), (cx - r0 * 1.15 + lean, sy + .12 * h)])
            elif view == 'side':
                lh = poly(w, hh, [(cx - fl * r0 * .2, cy - r0 * .6), (cx - fl * r0 * 1.15, cy), (cx - fl * r0 * 1.4, sy + .14 * h), (cx - fl * r0 * .3, sy + .1 * h)])
            else:
                lh = poly(w, hh, [(cx - r0 * 1.05, cy - r0 * .3), (cx - r0 * .7, cy + r0 * .5), (cx - r0 * 1.2, sy + .15 * h), (cx - r0 * .55, sy + .08 * h)]) | \
                     poly(w, hh, [(cx + r0 * 1.05, cy - r0 * .3), (cx + r0 * .7, cy + r0 * .5), (cx + r0 * 1.2, sy + .15 * h), (cx + r0 * .55, sy + .08 * h)])
            cv.put(lh, shade(lh, hair, L=L, r=1.4, amb=.45, gain=2.2, dither=False)); bodymask |= lh
    if kind == 'samuel':
        hel = ell(w, hh, cx, cy - r0 * .18, r0 * 1.2, r0 * 1.02) & (cv.yy < cy + r0 * .22)
        hel |= rect(w, hh, cx - r0 * 1.3, cy + r0 * .1, cx + r0 * 1.3, cy + r0 * .28)
        cv.put(hel, shade(hel, rr('#f6c820', .45), L=L, r=1.5, amb=.52, gain=2.4, dither=False)); bodymask |= hel
        cv.put(line(w, hh, [(cx, cy - r0 * 1.15), (cx, cy)], 1) & hel, rr('#c28a10', .4)[1])
        cv.put(rect(w, hh, cx - r0 * 1.3, cy + r0 * .24, cx + r0 * 1.3, cy + r0 * .4), rr('#8a5a10', .4)[1])
        if view != 'back':
            lx_ = cx + (fl * r0 * .7 if view == 'side' else 0); cv.put(rect(w, hh, lx_ - 1, cy - r0 * .5, lx_ + 2, cy - r0 * .2), hx('#fff8d0'))
    # cara
    if view != 'back':
        ec = (40, 24, 28) if not sil else tuple(mix(np.array(silc, float), np.array((60, 40, 44.)), 1 - sil))
        if view == 'side':
            ex = cx + fl * r0 * .45; cv.put(rect(w, hh, ex, cy - r0 * .05, ex + 1, cy + r0 * .3), ec)
            cv.put(rect(w, hh, cx + fl * r0 * .95, cy + r0 * .1, cx + fl * r0 * 1.2, cy + r0 * .4) if False else rect(w, hh, cx + fl * r0 * .88, cy + r0 * .15, cx + fl * r0 * .88 + 1, cy + r0 * .45), skin[1])
        else:
            for sgn in (-1, 1): cv.put(rect(w, hh, cx + sgn * r0 * .42, cy - r0 * .05, cx + sgn * r0 * .42 + 1, cy + r0 * .3), ec)
            cv.put(rect(w, hh, cx - r0 * .2, cy + r0 * .55 + mood * .15 * r0, cx + r0 * .3, cy + r0 * .55 + 1 + mood * .15 * r0), (150, 70, 70) if not sil else ec)
    elif kind == 'mateo':
        cv.put(rect(w, hh, cx - r0 * .9, cy + r0 * .8, cx + r0 * .9, cy + r0 * 1.12), rr('#c83a48', .35)[2])  # pañuelo rojo
        cv.put(rect(w, hh, cx - r0 * .9, cy + r0 * 1.0, cx + r0 * .9, cy + r0 * 1.12), rr('#c83a48', .35)[0])
    if kind == 'mateo' and view != 'back':
        cv.put(rect(w, hh, cx - r0 * .8, cy + r0 * .85, cx + r0 * .8, cy + r0 * 1.15), rr('#c83a48', .35)[2])
        cv.put(rect(w, hh, cx - r0 * .2, cy + r0 * 1.1, cx + r0 * .35, cy + r0 * 1.6), rr('#c83a48', .35)[1])
    if rimcol is not None:
        e = rim(bodymask, L=(-int(np.sign(L[0])), -int(np.sign(L[1]))) if False else (int(np.sign(L[0])), int(np.sign(L[1]))), n=1)
        cv.blend(e.astype(float) * .85, np.array(rimcol, float))
    return bodymask

def lia_sit(cv, x, by, s, grade=None, L=(-1, -.3), rimcol=None, look=-1):
    """Lia sentada, de frente/tres cuartos, alzando la cabeza hacia la luz. by = y del asiento, s = altura aprox."""
    w, hh = cv.w, cv.h
    rr = lambda c, k=1.: _r(c, grade, 0, SIL, k)
    skin, hair, gold, pants = rr('#dba078', .8), rr('#1c1828', .8), rr('#e8b832', .5), rr('#4a5a8a')
    allm = np.zeros((hh, w), bool)
    leg = poly(w, hh, [(x - .36 * s, by - .02 * s), (x + .1 * s, by - .02 * s), (x + .18 * s, by - .36 * s), (x - .06 * s, by - .38 * s)])  # rodillas
    cv.put(leg, shade(leg, pants, L=L, r=2, amb=.5, gain=2, dither=False)); allm |= leg
    sh = ell(w, hh, x - .3 * s, by - .02 * s, .09 * s, .045 * s); cv.put(sh, rr('#3a3048')[1]); allm |= sh
    body = poly(w, hh, [(x - .11 * s, by - .66 * s), (x + .11 * s, by - .66 * s), (x + .25 * s, by - .56 * s), (x + .31 * s, by - .3 * s), (x + .38 * s, by - .04 * s), (x + .1 * s, by + .02 * s), (x - .3 * s, by + .01 * s), (x - .38 * s, by - .06 * s), (x - .31 * s, by - .3 * s), (x - .25 * s, by - .56 * s)])
    cv.put(body, shade(body, gold, L=L, r=3, amb=.55, gain=2.8, dither=False)); allm |= body
    for i in range(4):
        fx = x + (-.2 + .13 * i) * s; cv.put(line(w, hh, [(fx, by - .55 * s), (fx + .05 * s, by - .06 * s)], .8) & body, gold[3 if i % 2 else 0])
    cv.put(line(w, hh, [(x - .22 * s, by - .56 * s), (x - .1 * s, by - .62 * s), (x + .1 * s, by - .62 * s), (x + .24 * s, by - .56 * s)], 1.2), gold[3])
    r_ = rng(7)
    for _ in range(40): px_, py_ = int(x + r_.uniform(-.3, .3) * s), int(by - r_.uniform(.05, .55) * s); cv.a[py_, px_] = np.where(body[py_, px_], np.array((255, 244, 190.)), cv.a[py_, px_])
    hcx, hcy, r0 = x + .0 * s, by - .78 * s, .15 * s
    hl = poly(w, hh, [(hcx - r0 * 1.15, hcy - r0 * .4), (hcx + r0 * 1.15, hcy - r0 * .4), (hcx + r0 * 1.35, by - .5 * s), (hcx + r0 * .6, by - .52 * s), (hcx - r0 * .6, by - .52 * s), (hcx - r0 * 1.35, by - .5 * s)])
    cv.put(hl, shade(hl, hair, L=L, r=2, amb=.45, gain=2.2, dither=False)); allm |= hl
    hd = ell(w, hh, hcx, hcy, r0, r0 * 1.1); cv.put(hd, shade(hd, skin, L=L, r=1.6, amb=.6, gain=1.8, dither=False)); allm |= hd
    cap = ell(w, hh, hcx, hcy - r0 * .25, r0 * 1.12, r0 * 1.0) & (cv.yy < hcy - r0 * .38)
    cap |= rect(w, hh, hcx - r0 * 1.1, hcy - r0 * .5, hcx - r0 * .78, hcy + r0 * .9) | rect(w, hh, hcx + r0 * .78, hcy - r0 * .5, hcx + r0 * 1.1, hcy + r0 * .9)
    cv.put(cap & hd | cap, hair[1]); cv.put(cap & (cv.yy < hcy - r0 * .8) & (cv.xx < hcx), hair[2])
    ec = (46, 28, 34)
    for sg in (-1, 1): cv.put(rect(w, hh, hcx + sg * r0 * .42 - 1, hcy - r0 * .1, hcx + sg * r0 * .42, hcy + r0 * .25), ec); cv.put(rect(w, hh, hcx + sg * r0 * .42 - 1, hcy - r0 * .1, hcx + sg * r0 * .42 - 1, hcy - r0 * .1), (255, 244, 220))
    cv.put(rect(w, hh, hcx - r0 * .15, hcy + r0 * .55, hcx + r0 * .25, hcy + r0 * .55 + 1), (170, 90, 90))
    # mano alzada para protegerse de la luz
    ha = line(w, hh, [(x + .2 * s, by - .5 * s), (x + .3 * s, by - .72 * s), (x + .24 * s, by - .92 * s)], .09 * s)
    cv.put(ha, shade(ha, gold, L=L, r=1.2, amb=.55, gain=1.8, dither=False)); allm |= ha
    hm = ell(w, hh, x + .23 * s, by - .95 * s, .055 * s, .06 * s); cv.put(hm, skin[1]); allm |= hm
    if rimcol is not None:
        e = rim(allm, L=(int(np.sign(L[0])), int(np.sign(L[1]))), n=1); cv.blend(e.astype(float) * .85, np.array(rimcol, float))
    return allm


# ------------------------------------------------------------------ roca, agua, luz
def rock_v(seed, L=(-1, -.8), sx=28, sy=14, gain=7., ao=.45, stra=.35):
    n = noise(W, H, seed, sx, sy, 5, .55, ridged=True); st = noise(W, H, seed + 1, sx * 3, 5, 3)
    gy, gx = np.gradient(blur(n * .7 + st * stra, 1.1)); ln = math.hypot(*L)
    lam = -(gx * L[0] + gy * L[1]) / ln * gain; big = noise(W, H, seed + 2, 80, 55, 2)
    return .4 + lam * .6 + (n - .5) * .4 + (big - .5) * ao

def lightfield(cv, srcs):
    t = np.zeros((cv.h, cv.w))
    for x, y, r, s, *e in srcs:
        sx = e[0] if e else 1.; sy = e[1] if len(e) > 1 else 1.
        d = np.sqrt(((cv.xx - x) / (r * sx))**2 + ((cv.yy - y) / (r * sy))**2); t += np.clip(1 - d, 0, 1)**1.7 * s
    return t

def cone(cv, x, y, ang, spread, length, col, s=.55, levels=7, seed=None):
    dx, dy = cv.xx - x, cv.yy - y; d = np.hypot(dx, dy) + 1e-6; a = np.arctan2(dy, dx)
    da = np.abs(((a - ang + math.pi) % (2 * math.pi)) - math.pi)
    t = np.clip(1 - da / spread, 0, 1)**1.2 * np.clip(1 - d / length, 0, 1)**.9 * np.clip(d / 6, 0, 1)
    if seed is not None: t *= .75 + .5 * noise(cv.w, cv.h, seed, 24, 14, 3)
    cv.add(np.clip(t * s, 0, 1), np.array(col, float), levels); return t

def stal_mask(seed, base, amp, n, lmin, lmax, wmin, wmax, top=True, xr=(0, W)):
    r = rng(seed); prof = base + amp * (noise(W, 1, seed, 60, 1, 3)[0] - .5) * 2
    m = (cv_yy() < prof[None, :]) if top else (cv_yy() > prof[None, :])
    for _ in range(n):
        x = r.uniform(*xr); wd = r.uniform(wmin, wmax); ln = r.uniform(lmin, lmax); y0 = prof[int(np.clip(x, 0, W - 1))] - 2
        sg = 1 if top else -1
        m |= poly(W, H, [(x - wd, y0), (x + wd, y0), (x + r.uniform(-1.5, 1.5), y0 + sg * ln)])
    return m

_YY = np.mgrid[0:H, 0:W]
def cv_yy(): return _YY[0]

def reflect(cv, ys, k=.55, tint=(20, 40, 70), seed=0, amp=2.2, lo=None, fade=90, dark=.6):
    """refleja lo que hay sobre la linea de agua ys hacia abajo (con ondas)."""
    src = cv.a.copy(); nz = noise(cv.w, cv.h, seed, 70, 3, 3)
    for y in range(int(ys), cv.h):
        dy = y - ys; sy = int(ys - dy * 1.0 - 1)
        if sy < 0: break
        sh = ((nz[y] - .5) * 2 * amp * (1 + dy / 22)).astype(int); xs = (np.arange(cv.w) + sh) % cv.w
        row = src[sy][xs]; a = k * max(0, 1 - dy / fade)
        cv.a[y] = cv.a[y] * (1 - a) + (row * dark + np.array(tint, float) * .3) * a

def water_base(cv, y0, y1, ramp, seed, x0=0, x1=None, calm=1.):
    x1 = x1 or cv.w; m = (cv.yy >= y0) & (cv.yy < y1) & (cv.xx >= x0) & (cv.xx < x1)
    t = np.clip((cv.yy - y0) / max(y1 - y0, 1), 0, 1); n = noise(cv.w, cv.h, seed, 50, 3, 3)
    v = .25 + .55 * t**.8 + (n - .5) * .25 * calm; cv.put(m, ramp_map(np.clip(1 - v, 0, 1), ramp, dw=.8)); return m

def ripples(cv, m, seed, col, n=140, ymin=None, ymax=None, wmin=3, wmax=14, a=.6):
    r = rng(seed); ymin = ymin if ymin is not None else cv.yy[m].min(); ymax = ymax if ymax is not None else cv.yy[m].max()
    for _ in range(n):
        y = int(r.uniform(ymin, ymax)); x = int(r.uniform(0, cv.w)); ln = int(r.uniform(wmin, wmax) * (1 + (y - ymin) / 40))
        for xx in range(x, min(x + ln, cv.w)):
            if m[y, xx]: cv.a[y, xx] = mix(cv.a[y, xx], np.array(col, float), a * r.uniform(.5, 1))

def motes(cv, n, seed, region, col, a=(.3, .8)):
    r = rng(seed); x0, y0, x1, y1 = region
    for _ in range(n):
        x, y = int(r.uniform(x0, x1)), int(r.uniform(y0, y1)); cv.a[y, x] = mix(cv.a[y, x], np.array(col, float), r.uniform(*a))

def lantern(cv, x, y, s=1., col=(255, 190, 90), body='#3a2a2a'):
    cv.put(rect(cv.w, cv.h, x - 3 * s, y - 1, x + 3 * s, y + 6 * s), hx(body))
    cv.put(rect(cv.w, cv.h, x - 2 * s, y, x + 2 * s, y + 5 * s), hx('#ffe6a0')); cv.put(rect(cv.w, cv.h, x - 1, y + 1, x + 1, y + 4 * s), hx('#fffbe0'))
    cv.put(rect(cv.w, cv.h, x - 3 * s, y - 2, x + 3 * s, y - 1), hx('#6a5a50')); cv.put(rect(cv.w, cv.h, x - 1, y - 4, x + 1, y - 2), hx('#6a5a50'))

COLD = R('#05040f', '#0b0c1e', '#14203a', '#223a52', '#3c5a62', '#7a7a60', '#c89a58', '#f8d890')
DEEP = R('#02040c', '#050a1a', '#0a1830', '#102a4c', '#1c4468', '#2e6488', '#5090a8', '#98c8d8')


# ------------------------------------------------------------------ escenas
def end_good_1():
    cv = Cv(W, H); L = (-1, -.5)
    v = rock_v(11, L=(1, -.6)) * .62 - .12
    srcs = [(372, 150, 190, .75, 1.3, 1.0), (150, 215, 120, .22)]
    cv.a[:] = ramp_map(np.clip(v + lightfield(cv, srcs), 0, 1), COLD, dw=.8)
    # techo con estalactitas, en sombra
    st = stal_mask(12, 34, 14, 22, 18, 62, 3, 9)
    stv = rock_v(13, L=(1, 0.6)) * .55 - .2 + lightfield(cv, srcs) * .5
    cv.put(st, ramp_map(np.clip(stv, 0, 1), COLD, dw=.8)); cv.put(st & ~np.roll(st, -1, 0), hx('#0a0818'))
    # repisa de Lia (derecha)
    ledge = poly(W, H, [(292, 176), (310, 168), (352, 166), (410, 168), (446, 174), (462, 206), (470, 232), (292, 236), (300, 205)])
    ledge |= rect(W, H, 440, 150, 480, 236) & (cv.yy > 150 + 24 * np.sin(cv.xx / 9.) * 0 + (cv.xx - 440) * -0.25 + 14)
    lv = rock_v(14, L=(-1, -.8), gain=8) * .8 + lightfield(cv, [(372, 150, 150, .7, 1, .9)]) * 1.05
    cv.put(ledge, ramp_map(np.clip(lv, 0, 1), COLD, dw=.8)); cv.put(ledge & ~np.roll(ledge, 1, 0), hx('#ffd890')); cv.put(edge(ledge) & (cv.yy > 176) & ~np.roll(ledge, 1, 0), hx('#0a0818'))
    # suelo: roca a la izquierda, agua a la derecha
    wy = 234; floor = (cv.yy >= 238 + 3 * np.sin(cv.xx / 17.)) & (cv.xx < 262 + (cv.yy - 238) * .5)
    fv = rock_v(15, L=(1, -.6), sx=18, sy=6) * .6 - .08 + lightfield(cv, srcs) * .9
    # agua
    wm = water_base(cv, wy, H, R('#0a0c1c', '#10203a', '#1a3450', '#2c5468', '#4a7a7c'), 16, x0=232)
    wm &= ~floor
    cv.put(floor, ramp_map(np.clip(fv, 0, 1), COLD, dw=.8)); cv.put(floor & ~np.roll(floor, 1, 0), hx('#6a7a80'))
    # luz de las linternas: conos hacia Lia
    hands = [(104, 190), (150, 196), (196, 190)]
    for (hx0, hy0) in hands:
        ang = math.atan2(158 - hy0, 366 - hx0); cone(cv, hx0, hy0, ang, .09, 330, (255, 232, 160), s=.55, seed=int(hx0))
    # personas
    G = ((20, 30, 60), .22, .82); LL = (1, -.4)
    person(cv, 70, 248, 70, 'mateo', dict(b=[(.1, .0), (.24, -.1)], a=[(-.02, .14), (.0, .27)], la=[(0, .2), (-.02, .4)], lb=[(.01, .2), (.06, .4)], lean=.015, hx=.012), grade=G, L=LL, rimcol=(255, 214, 140), held=('b', '#fff4c0'))
    person(cv, 124, 252, 64, 'elena', dict(b=[(.08, .02), (.2, -.1)], a=[(-.02, .13), (.0, .26)], la=[(0, .2), (0, .4)], lb=[(.02, .2), (.04, .4)], lean=.01), grade=G, L=LL, rimcol=(255, 214, 140), held=('b', '#fff4c0'))
    person(cv, 176, 250, 70, 'samuel', dict(b=[(.1, -.02), (.25, -.14)], a=[(-.02, .15), (-.01, .28)], la=[(0, .2), (-.03, .4)], lb=[(.02, .2), (.07, .4)], lean=.015, hx=.01), grade=G, L=LL, rimcol=(255, 214, 140), held=('b', '#fff4c0'))
    for (hx0, hy0) in hands: cv.glow(hx0 + 12, hy0 - 3, 12, (255, 240, 180), s=.7, p=2, levels=5)
    # Lia sentada
    cv.glow(372, 135, 60, (255, 200, 110), s=.45, p=1.8, levels=7)
    lia_sit(cv, 372, 170, 66, grade=(( 40, 30, 50), .05, 1.05), L=(-1, -.5), rimcol=(255, 236, 170))
    reflect(cv, wy, k=.5, tint=(30, 60, 90), seed=17, fade=34)
    ripples(cv, wm, 18, (150, 190, 190), n=90, wmin=3, wmax=10, a=.5)
    motes(cv, 70, 19, (200, 60, 460, 200), (255, 228, 160))
    cv.vignette(.62, (3, 3, 10))
    return cv.img(128)


def end_good_2():
    cv = Cv(W, H); vx, vy = 332, 128
    # tunel en perspectiva: paredes con ruido, luz desde el punto de fuga
    d = np.hypot((cv.xx - vx) / 1.15, (cv.yy - vy) * 1.0)
    n = rock_v(21, L=(1, -.2), sx=20, sy=18)
    t = np.clip(d / 340, 0, 1)
    v = n * .55 * (.4 + t * .8) + np.clip(1 - d / 260, 0, 1)**1.5 * 1.15 - .1
    cv.a[:] = ramp_map(np.clip(v, 0, 1), COLD, dw=.8)
    # cavidad: boca del tunel (lejos) -> ligeramente mas oscura salvo grieta
    # suelo con perspectiva
    floorm = cv.yy > vy + 14 + (np.abs(cv.xx - vx) ** 1.0) * 0 + 0
    fl = (cv.yy - vy) / (H - vy)
    tex = noise(W, H, 22, 24, 6, 4)
    fv = .18 + .3 * (1 - fl) + (tex - .5) * .35 + np.clip(1 - d / 200, 0, 1) * .6
    # suelo: poligono desde fuga abierto
    fm = poly(W, H, [(vx - 16, vy + 12), (vx + 16, vy + 12), (W + 40, H), (-40, H)])
    cv.put(fm, ramp_map(np.clip(fv, 0, 1), COLD, dw=.8))
    # charco-suelo húmedo brillante al centro
    sheen = fm & (np.abs(cv.xx - vx) < 14 + (cv.yy - vy) * .9) & (noise(W, H, 23, 40, 2, 3) > .45)
    cv.add(sheen * np.clip(1 - np.abs(cv.xx - vx) / (14 + (cv.yy - vy) * .9), 0, 1)**.7 * .5 * (1 - fl * .5), (255, 200, 110), 5)
    # techo: estalactitas en perspectiva
    st = stal_mask(25, 24, 10, 26, 14, 60, 3, 8)
    sv = rock_v(26, L=(1, .5)) * .5 - .16 + np.clip(1 - d / 260, 0, 1) * .5
    cv.put(st, ramp_map(np.clip(sv, 0, 1), COLD, dw=.8)); cv.put(st & ~np.roll(st, -1, 0), hx('#05040f'))
    # la grieta de luz
    crack = poly(W, H, [(vx - 1, vy - 26), (vx + 3, vy - 20), (vx + 5, vy), (vx + 3, vy + 20), (vx, vy + 28), (vx - 3, vy + 4), (vx - 2, vy - 14)])
    cv.glow(vx, vy, 120, (255, 190, 100), s=.6, p=2.2, levels=8); cv.glow(vx, vy, 52, (255, 228, 160), s=.8, p=1.8, levels=7)
    cv.put(dilate(crack), hx('#ffcf80')); cv.put(crack, hx('#fff6dc'))
    rays(cv, vx, vy, math.pi - .6, math.pi + .6, 8, 5, (255, 200, 120), strength=.32, length=330)
    rays(cv, vx, vy, -.5, .5, 4, 6, (255, 200, 120), strength=.2, length=140)
    # contraluz: halo en el suelo
    # personajes caminando hacia la derecha (de espaldas): contraluz parcial
    G = ((10, 14, 30), .18, .85); LL = (1, -.1); rim_c = (255, 214, 140)
    # tres adelante, Samuel con Lia
    person(cv, 140, 232, 78, 'mateo', dict(a=[(-.02, .14), (-.05, .28)], b=[(.02, .15), (.05, .27)], la=[(-.03, .2), (-.08, .4)], lb=[(.03, .2), (.08, .38)], lean=.012), grade=G, L=LL, rimcol=rim_c, sil=.3)
    person(cv, 208, 226, 72, 'elena', dict(a=[(-.02, .14), (-.05, .28)], b=[(.02, .15), (.04, .27)], la=[(-.02, .2), (.07, .38)], lb=[(.02, .2), (-.06, .4)], lean=.01), grade=G, L=LL, rimcol=rim_c, sil=.3)
    person(cv, 252, 222, 58, 'lia', dict(a=[(-.02, .14), (-.03, .27)], b=[(.12, -.04), (.23, -.1)], la=[(0, .2), (-.03, .4)], lb=[(.02, .2), (.05, .36)], lean=.03, hx=.02, bow=.01), grade=G, L=LL, rimcol=rim_c, sil=.3)
    person(cv, 278, 220, 66, 'samuel', dict(a=[(-.1, .1), (-.19, .22)], b=[(.02, .15), (.04, .27)], la=[(-.02, .2), (-.07, .4)], lb=[(.03, .2), (.08, .38)], lean=.012), grade=G, L=LL, rimcol=rim_c, sil=.3)
    cv.vignette(.55, (3, 3, 10))
    motes(cv, 90, 27, (60, 30, 460, 240), (255, 220, 150), a=(.25, .7))
    return cv.img(128)


SUNR = R('#2a2a68', '#4a3c88', '#8a58a0', '#d07a9c', '#f89a90', '#ffbe88', '#ffdc9a', '#fff2c0')

def end_good_3():
    cv = Cv(W, H); sx, sy_ = 318, 124
    sky(cv, SUNR, 152, seed=31, warp=.07, power=1.15)
    stars(cv, 40, 32, 40)
    sun_glow(cv, sx, sy_, r=190, big=.6, disc=False)
    clouds(cv, 33, 20, 88, R('#3a3478', '#6a4a96', '#b8688e', '#f09a8e', '#ffd0a0', '#fff0c8'), cover=.5, sun=(1, .5), contrast=1.2, sx=140, sy=12)
    clouds(cv, 34, 70, 124, R('#5a4088', '#a05c94', '#e88a92', '#ffc296', '#fff0c0'), cover=.35, sun=(1, .3), sx=120, sy=8)
    sun_glow(cv, sx, sy_, r=44, big=.0, disc=True)
    rays(cv, sx, sy_, -2.7, -.4, 12, 8, (255, 210, 140), strength=.2, length=320)
    mountains(cv, 172, 74, 34, R('#4a3a80', '#7a4c94', '#b06a9a', '#e08a9a', '#ffb4a0', '#ffe0bc'), sun=1, snowline=.35, detail=.35, fogcol=hx('#e49aa0'), fog=.5, sx=170, bright=1.1)
    mist(cv, 130, 172, 35, (240, 160, 150), .5)
    mountains(cv, 190, 52, 36, R('#2a2058', '#443072', '#6e4888', '#a0608e', '#d88a98', '#fbb8a4'), sun=1, snowline=.4, detail=.45, fogcol=hx('#b86c94'), fog=.5, sx=130)
    mist(cv, 160, 196, 37, (210, 120, 140), .5, sx=70)
    # teleferico lejano: cable a media ladera, torre y cabina
    xs = np.arange(W); yl = 52 + 70 * xs / W + 14 * np.sin(math.pi * xs / W)
    cm = np.zeros((H, W), bool)
    for x in xs: cm[int(yl[x]), x] = True
    cv.put(cm, hx('#2a1a44'))
    for tx in (96, 392):
        ty = int(yl[tx]); tm = poly(W, H, [(tx - 1, ty - 3), (tx + 1, ty - 3), (tx + 2, ty + 16), (tx - 2, ty + 16)]) | rect(W, H, tx - 4, ty - 3, tx + 5, ty - 2)
        cv.put(tm, hx('#2a1a44'))
    bx = 232; by = int(yl[bx])
    cb = rect(W, H, bx - 3, by + 3, bx + 4, by + 9); cv.glow(bx, by + 6, 14, (255, 190, 110), s=.6, p=2, levels=5)
    cv.put(rect(W, H, bx, by, bx + 1, by + 3), hx('#2a1a44')); cv.put(cb, hx('#5a2c48')); cv.put(rect(W, H, bx - 2, by + 4, bx + 3, by + 7), hx('#ffe6a0'))
    # nieve extensa
    prof = 196 + 5 * np.sin(np.arange(W) / 38.) + 4 * noise(W, 1, 9, 40, 1, 3)[0]
    gm = cv.yy >= prof[None, :]
    nz = noise(W, H, 38, 50, 12, 4)
    lit = np.clip(.45 + (nz - .5) * .7 + .25 * np.exp(-((cv.xx - sx) / 120.)**2) - (cv.yy - 200) * .003, 0, 1)
    cv.put(gm, ramp_map(lit, R('#3a3070', '#5a4c98', '#8a70b4', '#c498c8', '#f0b8c4', '#ffd8c0', '#fff0dc'), dw=.7))
    cv.put(gm & ~np.roll(gm, 1, 0), hx('#fff0dc'))
    mist(cv, 190, 215, 39, (255, 190, 170), .4, sx=90, sy=6)
    # boca de la cueva: marco oscuro
    nzz = noise(W, H, 41, 44, 30, 4, .6)
    op = ((cv.xx - 240) / 232.)**2 + ((cv.yy - 168) / 150.)**2 + (nzz - .5) * .22 < 1
    frame = ~op
    fv = rock_v(42, L=(1, -.2), sx=24, sy=16) * .5 - .12 + np.clip(1 - np.hypot((cv.xx - sx) / 1.6, cv.yy - 150) / 380, 0, 1)**2.2 * .5
    RK = R('#04030c', '#0a0618', '#150d28', '#241838', '#3c2848', '#6a4258', '#b06a6c', '#f0a880')
    cv.put(frame, ramp_map(np.clip(fv, 0, 1), RK, dw=.8))
    inner = frame & dilate(op, 2); inner &= (cv.yy > 4) & (cv.yy < 200); cv.put(inner, hx('#b0707a')); cv.put(inner & (cv.xx > 220), hx('#e8a088'))
    # carambanos
    st = stal_mask(43, 12, 6, 16, 10, 40, 2, 5, xr=(70, 420)) & op & (cv.yy < 90)
    cv.put(st, hx('#0a0618')); cv.put(st & (cv.xx > 240) & ~np.roll(st, 1, 1), hx('#c07a80'))
    # suelo oscuro de cueva dentro del marco, bajo los personajes
    fl = poly(W, H, [(0, 214), (130, 222), (240, 228), (360, 222), (480, 214), (480, 270), (0, 270)])
    fvv = np.clip(.55 + (nz - .5) * .6 + .3 * np.exp(-((cv.xx - 240) / 160.)**2) - (cv.yy - 226) * .01, 0, 1)
    cv.put(fl, ramp_map(fvv, R('#201840', '#3a2c62', '#6c5496', '#a688c0', '#e0b4c8', '#ffd8c4'), dw=.7))
    cv.put(fl & ~np.roll(fl, 1, 0), hx('#ffd8c4'))
    cv.blend(fl * np.clip((cv.yy - 238) / 40, 0, 1) * .6, np.array((14, 8, 30), float))
    # los cuatro abrazados, en silueta
    G = ((26, 16, 50), .0, 1.0); rim_c = (255, 190, 130)
    base = 238; hh = 66
    person(cv, 192, base, hh * 1.0, 'mateo', dict(a=[(-.02, .14), (-.02, .28)], b=[(.15, .0), (.28, -.02)], la=[(-.02, .2), (-.05, .4)], lb=[(.02, .2), (.05, .38)], lean=.01), grade=G, L=(-1, -1), rimcol=rim_c, sil=.88)
    person(cv, 226, base - 2, hh * .94, 'elena', dict(a=[(-.15, .0), (-.27, -.02)], b=[(.15, .0), (.28, -.02)], la=[(-.02, .2), (-.03, .4)], lb=[(.02, .2), (.03, .4)], hx=0.), grade=G, L=(-1, -1), rimcol=rim_c, sil=.88)
    person(cv, 258, base - 3, hh * .9, 'lia', dict(a=[(-.15, .0), (-.27, -.02)], b=[(.14, -.01), (.26, -.03)], la=[(-.02, .2), (-.03, .4)], lb=[(.02, .2), (.04, .4)], bow=.02, hx=-.02), grade=G, L=(-1, -1), rimcol=rim_c, sil=.88)
    person(cv, 292, base - 1, hh * 1.04, 'samuel', dict(a=[(-.15, .0), (-.27, -.02)], b=[(.02, .15), (.03, .28)], la=[(-.02, .2), (-.05, .4)], lb=[(.02, .2), (.05, .38)], lean=-.01, hx=-.01), grade=G, L=(-1, -1), rimcol=rim_c, sil=.88)
    cv.glow(sx, sy_ + 10, 150, (255, 190, 130), s=.12, p=2, levels=5)
    snow(cv, 40, 44, ymax=210, sizes=(1,), alpha=(.4, .7), col=(255, 236, 220))
    cv.vignette(.4, (10, 4, 24))
    return cv.img(128)


def end_bad_1():
    cv = Cv(W, H)
    v = rock_v(51, L=(1, -.6)) * .55 - .1 + (cv.yy / H) * -.12
    cv.a[:] = ramp_map(np.clip(v, 0, 1), DEEP, dw=.8)
    nzz = noise(W, H, 52, 70, 50, 3, .6)
    cav = ((cv.xx - 250) / 215.)**2 + ((cv.yy - 170) / 170.)**2 + (nzz - .5) * .3 < 1
    cav &= cv.yy > 44 + 6 * np.sin(cv.xx / 31.)
    # agua: gradiente de profundidad
    t = np.clip((cv.yy - 46) / 224, 0, 1); n = noise(W, H, 53, 60, 20, 4)
    wv = np.clip(.78 - t * .62 + (n - .5) * .25 + np.exp(-((cv.xx - 250) / 90.)**2) * np.clip(1 - t * 2.4, 0, 1) * .18, 0, 1)
    cv.put(cav, ramp_map(wv, DEEP, dw=.85))
    # rayos tenues desde la linterna hacia abajo
    lx, ly = 252, 56
    for a0 in (1.2, 1.45, 1.7, 1.95): cone(cv, lx, ly, a0, .09, 230, (150, 190, 210), s=.3, levels=5, seed=int(a0 * 10))
    # repisa sumergida (donde estaba Lia) y roca del fondo
    ledge = poly(W, H, [(300, 168), (350, 164), (420, 170), (480, 176), (480, 270), (270, 270), (286, 214)])
    lv = rock_v(54, L=(-1, -.8), gain=8) * .6 - .14 + np.clip(1 - (cv.yy - 164) / 100, 0, 1) * .12
    cv.put(ledge, ramp_map(np.clip(lv + .14, 0, 1), DEEP, dw=.8)); cv.put(ledge & ~np.roll(ledge, 1, 0), hx('#6aa8c0')); cv.put(ledge & ~np.roll(ledge, 2, 0) & np.roll(ledge, 1, 0), hx('#3a7090'))
    floor = poly(W, H, [(0, 246), (90, 240), (180, 252), (270, 250), (270, 270), (0, 270)])
    cv.put(floor, ramp_map(np.clip(rock_v(55, sx=14, sy=8) * .5 - .22, 0, 1), DEEP, dw=.8)); cv.put(floor & ~np.roll(floor, 1, 0), hx('#2c5a78'))
    # manta dorada a la deriva (apagada por el agua)
    r = rng(56); pts = []
    bl = poly(W, H, [(318, 150), (336, 144), (356, 152), (378, 146), (394, 158), (380, 172), (352, 166), (330, 170), (314, 164)])
    bm = shade(bl, R('#2a3a44', '#4a5a50', '#7a7048', '#a8914a'), L=(-1, -.6), r=2, amb=.5, gain=2.4, dither=False)
    cv.put(bl, bm)
    for i in range(5): cv.put(line(W, H, [(322 + i * 14, 146 + (i % 2) * 3), (326 + i * 14, 168)], .8) & bl, hx('#c8b060') if i % 2 else hx('#3a4a50'))
    # linterna flotando en la superficie, cabeceando, casi apagada
    sfc = (cv.yy >= 44) & (cv.yy < 53)
    cv.put(sfc & cav, ramp_map(.78 - (cv.yy - 44) * .09 + (noise(W, H, 57, 22, 2, 3) - .5) * .5, DEEP, dw=.8))
    cv.glow(lx, ly, 70, (255, 150, 60), s=.3, p=2.2, levels=6); cv.glow(lx, ly, 26, (255, 200, 110), s=.5, p=1.8, levels=6)
    lm = poly(W, H, [(lx - 7, ly - 6), (lx + 3, ly - 9), (lx + 8, ly + 2), (lx - 2, ly + 5)])
    cv.put(lm, hx('#2a2228')); cv.put(poly(W, H, [(lx - 5, ly - 4), (lx + 2, ly - 6), (lx + 5, ly), (lx - 1, ly + 2)]), hx('#a8602a'))
    cv.put(rect(W, H, lx - 1, ly - 3, lx + 1, ly), hx('#ffb860')); cv.put(rect(W, H, lx, ly - 3, lx + 1, ly - 2), hx('#fff0c0'))
    # techo y estalactitas (aire casi inexistente)
    st = stal_mask(58, 34, 6, 12, 8, 36, 3, 8, xr=(0, 205)) | stal_mask(58, 34, 6, 12, 8, 36, 3, 8, xr=(300, 480))
    cv.put(st, ramp_map(np.clip(rock_v(59, L=(1, .6)) * .5 - .26, 0, 1), DEEP, dw=.8)); cv.put(st & ~np.roll(st, -1, 0), hx('#020510'))
    # reflejo de la superficie: linea clara y ondas
    cv.put(cav & (cv.yy == 49) & (noise(W, H, 60, 12, 2, 2) > .35), hx('#6aa8c0'))
    # burbujas
    r = rng(61)
    for _ in range(26):
        bx, byy = int(r.uniform(180, 320)), int(r.uniform(56, 170)); c = mix(cv.a[byy, bx], np.array((160, 210, 230.)), r.uniform(.4, .8)); cv.a[byy, bx] = c
        if r.random() < .3: cv.a[byy, bx + 1] = c * .8
    motes(cv, 140, 62, (60, 60, 440, 260), (120, 160, 190), a=(.15, .4))
    cv.vignette(.72, (1, 2, 8))
    return cv.img(128)


def end_bad_2():
    cv = Cv(W, H); vx, vy = 318, 128
    d = np.hypot((cv.xx - vx) / 1.1, (cv.yy - vy))
    v = rock_v(71, L=(1, -.2), sx=22, sy=18) * .5 * (.35 + np.clip(d / 340, 0, 1) * .7) + np.clip(1 - d / 170, 0, 1)**1.6 * .55 - .12
    cv.a[:] = ramp_map(np.clip(v, 0, 1), DEEP, dw=.8)
    st = stal_mask(72, 24, 10, 24, 12, 56, 3, 8)
    cv.put(st, ramp_map(np.clip(rock_v(73, L=(1, .5)) * .5 - .26 + np.clip(1 - d / 200, 0, 1) * .3, 0, 1), DEEP, dw=.8)); cv.put(st & ~np.roll(st, -1, 0), hx('#020510'))
    # agua subiendo: cubre el suelo de la galeria
    wy0 = vy + 10
    wm = (cv.yy > wy0 + np.abs(cv.xx - vx) * .1) & (cv.xx > 150 - (cv.yy - 190) * 1.4)
    wm &= (cv.yy > 196 - (cv.xx - 120) * .05 * 0 + 0)
    wm2 = (cv.yy > wy0 + 6) & ~(poly(W, H, [(0, 200), (170, 196), (250, 236), (290, 270), (0, 270)]))
    wv = np.clip(.55 + (noise(W, H, 74, 50, 3, 3) - .5) * .3 - (cv.yy - 140) * .0022 + np.clip(1 - d / 150, 0, 1) * .3, 0, 1)
    cv.put(wm2, ramp_map(1 - wv * .85 + .0, DEEP[::-1], dw=.8) if False else ramp_map(np.clip(wv * .85, 0, 1), DEEP, dw=.8))
    cv.put(wm2 & ~np.roll(wm2, 1, 0) & (cv.xx > 200), hx('#3a7490'))
    # luz debil al fondo
    cv.glow(vx, vy, 80, (200, 190, 140), s=.28, p=2.2, levels=6); cv.glow(vx, vy, 22, (255, 232, 170), s=.55, p=1.8, levels=6)
    cv.put(ell(W, H, vx, vy, 3, 3), hx('#fff6d8'))
    # repisa de roca donde esta el equipo
    ledge = poly(W, H, [(0, 196), (60, 192), (150, 198), (230, 224), (262, 270), (0, 270)])
    lv = rock_v(75, L=(1, -.8), sx=18, sy=8, gain=8) * .6 - .14 + np.clip(1 - np.hypot(cv.xx - 150, cv.yy - 210) / 140, 0, 1) * .18
    cv.put(ledge, ramp_map(np.clip(lv, 0, 1), DEEP, dw=.8)); cv.put(ledge & ~np.roll(ledge, 1, 0) & (cv.yy < 232), hx('#4a7a98'))
    # pared izquierda (apoyo de Samuel)
    wall = poly(W, H, [(0, 0), (62, 0), (80, 90), (60, 196), (0, 200)])
    cv.put(wall, ramp_map(np.clip(rock_v(76, L=(1, -.4), sx=16, sy=22) * .55 - .12, 0, 1), DEEP, dw=.8))
    # personajes
    G = ((10, 20, 50), .22, 1.0); LL = (1, -.4); rc = (130, 180, 215)
    person(cv, 98, 206, 66, 'samuel', dict(a=[(-.08, .06), (-.22, -.06)], b=[(-.02, .15), (.0, .28)], la=[(0, .2), (.0, .4)], lb=[(.02, .2), (.05, .4)], bow=.03, lean=-.03, hx=-.01), grade=G, L=LL, rimcol=rc, view='side', facing=-1, mood=1)
    person(cv, 150, 213, 56, 'elena', dict(a=[(.04, .1), (.12, -.04)], b=[(.0, .14), (.04, .26)], la=[(.1, .2), (-.12, .21)], lb=[(.06, .2), (-.16, .2)], drop=.18, bow=.03, lean=.03), grade=G, L=LL, rimcol=rc, view='side', facing=1, mood=1)
    person(cv, 202, 224, 68, 'mateo', dict(a=[(-.06, -.08), (.02, -.19)], b=[(.07, -.08), (.12, -.17)], la=[(0, .2), (-.02, .4)], lb=[(.02, .2), (.05, .4)], bow=.04, lean=.015), grade=G, L=LL, rimcol=rc, view='side', facing=1, mood=1)
    lantern(cv, 176, 218, 1.0); cv.glow(176, 222, 40, (255, 170, 80), s=.3, p=2, levels=5)
    # luz del casco de Samuel hacia el agua
    cone(cv, 88, 176, 1.1, .2, 70, (140, 190, 210), s=.25, levels=5)
    reflect(cv, 270, k=0)
    ripples(cv, wm2 & (cv.xx > 190), 77, (90, 150, 180), n=120, ymin=150, ymax=268, a=.45)
    # oscuridad del lado derecho
    dk = np.clip((cv.xx - 330) / 130., 0, 1)**1.1
    cv.blend(lmask(dk * .92, 7), np.array((1, 2, 7), float))
    motes(cv, 50, 78, (60, 60, 330, 240), (110, 150, 180), a=(.15, .4))
    cv.vignette(.6, (1, 2, 8))
    return cv.img(128)


def end_bad_3():
    cv = Cv(W, H)
    t = np.clip(cv.yy / H, 0, 1)
    v = .16 - t * .14 + (noise(W, H, 81, 90, 30, 3) - .5) * .08
    cv.a[:] = ramp_map(np.clip(v, 0, 1), DEEP, dw=.9)
    # techo apenas insinuado
    st = stal_mask(82, 14, 6, 14, 14, 46, 3, 7)
    cv.put(st, mix(cv.a[st], np.array((2, 3, 9.)), .6))
    # linea de agua lejana, casi invisible
    hy = 132; far = cv.yy >= hy
    cv.blend(far * np.clip(.1 + (cv.yy - hy) * .0006, 0, .2), np.array((20, 40, 70.)))
    cv.put(far & ~np.roll(far, 1, 0), mix(cv.a[hy, 10], np.array((40, 70, 100.)), .5))
    lx, ly = 292, 172
    # ondas muy sutiles
    ripples(cv, far, 83, (30, 56, 84), n=40, ymin=140, ymax=265, wmin=4, wmax=14, a=.22)
    for k, rr_ in enumerate((14, 26, 42)):
        e = ell(W, H, lx, ly + 3, rr_ * 1.9, rr_ * .22) & ~ell(W, H, lx, ly + 3, rr_ * 1.9 - 1.4, rr_ * .22 - .4)
        cv.blend(e * (.3 - k * .08), np.array((60, 100, 130.)))
    # reflejo minimo
    for i in range(10):
        yy = ly + 8 + i * 3; wd = max(1, 3 - i // 4); jit = int(2 * math.sin(i * 1.7))
        if yy < H: cv.a[yy, lx + jit - wd + 1: lx + jit + wd] = mix(cv.a[yy, lx + jit - wd + 1: lx + jit + wd], np.array((255, 170, 80.)), .5 - i * .045)
    # luz: halo calido pequeno y llama
    cv.glow(lx, ly - 6, 38, (255, 150, 60), s=.3, p=2.4, levels=6); cv.glow(lx, ly - 6, 14, (255, 190, 100), s=.45, p=2, levels=5)
    # base: linterna pequena sobre un trozo de madera flotando
    cv.put(rect(W, H, lx - 7, ly + 2, lx + 8, ly + 4), hx('#2a1a14')); cv.put(rect(W, H, lx - 6, ly + 2, lx + 7, ly + 3), hx('#5a3a24'))
    cv.put(rect(W, H, lx - 3, ly - 8, lx + 4, ly + 2), hx('#2a2024')); cv.put(rect(W, H, lx - 2, ly - 7, lx + 3, ly + 1), hx('#c8782e'))
    cv.put(rect(W, H, lx - 1, ly - 6, lx + 2, ly), hx('#ffc070')); cv.put(rect(W, H, lx, ly - 5, lx + 1, ly - 1), hx('#fff4d0'))
    cv.put(rect(W, H, lx - 3, ly - 9, lx + 4, ly - 8), hx('#4a3a38')); cv.put(rect(W, H, lx, ly - 12, lx + 1, ly - 9), hx('#4a3a38'))
    motes(cv, 18, 84, (lx - 40, ly - 50, lx + 40, ly), (255, 190, 110), a=(.2, .6))
    cv.vignette(.6, (0, 1, 4))
    return cv.img(128)


NAMES = ['end_good_1', 'end_good_2', 'end_good_3', 'end_bad_1', 'end_bad_2', 'end_bad_3']

def gen(only=None):
    for n in NAMES:
        if only and n not in only: continue
        f = globals().get(n)
        if f: save(f(), n, note=NOTE)
    return {k: v for k, v in META.items() if k.startswith('end_')}

if __name__ == '__main__':
    only = sys.argv[1:] or None
    m = gen(only)
    p = os.path.join(OUT, 'meta.json'); meta = json.load(open(p)); meta.update(m); json.dump(meta, open(p, 'w'), indent=1)
    print('ok', m)
