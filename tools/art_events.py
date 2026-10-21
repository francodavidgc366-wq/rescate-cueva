"""Ilustraciones de evento 160x90 (event_*)."""
from art_scenes import *
W, H = 160, 90
CAVE = R('#05040f', '#0a0a22', '#141c3a', '#22305a', '#3a5488', '#5c80b0', '#90b8d0')
CAVE_W = R('#0b0610', '#1c1018', '#33202a', '#52332f', '#7a4a3c', '#a86e52', '#e0a878')

def _cave(seed, ramp=CAVE, mist=(50, 90, 140), far=(30, 50, 80), glow=None, bright=1.2, vp=(80, 44), R0=(34, 24), n=7):
    cv = Cv(W, H); fc = Cv(W, H, far)
    if glow: fc.glow(vp[0], vp[1], 30, glow, s=.9, p=1.5, levels=7)
    tunnel_scene(cv, vp, seed, ramp, R0=R0, irreg=.3, mistcol=mist, far=fc.a, bright=bright, n=n, smin=.15)
    return cv

def ev_derrumbe():
    cv = _cave(3, CAVE_W, (110, 70, 60), (60, 40, 40), (255, 190, 110), 1.2)
    stalactites(cv, 7, 3, 0, ROCK, wmin=4, wmax=10, hmin=10, hmax=26)
    r = np.random.default_rng(5)
    dust = noise(W, H, 4, 30, 18, 3); cv.fog_soft(np.clip((dust - .35) * 2, 0, 1) * .6, (150, 110, 90), 5)
    for (x, y, s) in ((62, 18, 14), (96, 34, 11), (80, 6, 9), (112, 10, 7), (44, 40, 8)):
        m = ell(W, H, x, y, s, s * .8) | poly(W, H, [(x - s, y), (x, y - s), (x + s * .9, y - s * .2), (x + s * .5, y + s * .8), (x - s * .6, y + s * .7)])
        cv.put(line(W, H, [(x + 1, y - s * 2.2), (x + 1, y - s * .8)], s * .5) & ~m, mix(cv.a[0, 0], hx('#a88a78'), .5)) if False else None
        cv.add(np.clip(line(W, H, [(x + 2, y - s * 3), (x + 1, y - s * .5)], s * .6) * .5, 0, 1), (180, 150, 130), 3)
        cv.put(m, shade(m, ROCK_WARM, L=(-1, -1), r=s * .25, amb=.45, gain=2.4, dw=.5)); cv.put(edge(m), hx('#150e28'))
    pile = poly(W, H, [(0, 90), (0, 74), (24, 66), (52, 76), (84, 70), (120, 74), (160, 66), (160, 90)])
    cv.put(pile, shade(pile, ROCK_WARM, L=(-1, -1), r=3, amb=.4, gain=2.4, tex=noise(W, H, 6, 5, 5, 3), texamt=.4)); cv.put(pile & ~np.roll(pile, 1, 0), hx('#e0a878'))
    particles(cv, 70, 7, (0, 0, W, 80), (220, 190, 160), 1, (.3, .7)); cv.vignette(.6, (6, 3, 10)); return cv.img(64)
def ev_inundacion():
    cv = _cave(8, CAVE, (60, 110, 160), (40, 70, 110), (200, 230, 255), 1.3)
    stalactites(cv, 6, 3, 0, R('#05040f', '#0c0c24', '#16203e', '#26386a', '#4668a0'), wmin=4, wmax=9, hmin=8, hmax=22)
    wy = 44
    # frente de ola: cresta que sube desde abajo con espuma
    water_reflect(cv, wy, (12, 60, 100), seed=2, mixamt=.35, ripple=1.8, dark=.9)
    xs = np.arange(W); crest = 36 + 7 * np.sin(xs / 14.) + 3 * np.sin(xs / 5.)
    wave = cv.yy >= crest[None, :]
    cv.put(wave, ramp_map(np.clip(.25 + (cv.yy - crest[None, :]) * -.0 + noise(W, H, 4, 20, 6, 3) * .5 + (cv.yy - 36) / 90., 0, 1), WATER, dw=.7))
    foam = wave & (cv.yy < crest[None, :] + 3 + 2 * noise(W, H, 5, 6, 4, 2)); cv.put(foam, hx('#e8fff8'))
    cv.put(wave & ~np.roll(wave, 1, 0), hx('#ffffff'))
    cv.put(wave & (noise(W, H, 6, 5, 3, 2) > .7) & (cv.yy > crest[None, :] + 4), hx('#60d4d0'))
    particles(cv, 40, 2, (0, 20, W, 50), (230, 255, 250), 1, (.5, 1)); cv.vignette(.6, (3, 3, 12)); return cv.img(64)
def ev_gas():
    cv = _cave(12, R('#04080a', '#0a1a14', '#14301e', '#244a2c', '#3c6e3a', '#68a048', '#a8d070'), (40, 90, 50), (30, 70, 40), (140, 255, 120), 1.0)
    stalactites(cv, 6, 3, 0, R('#04080a', '#0a1a14', '#14301e', '#244a2c', '#3c6e3a'), wmin=4, wmax=9, hmin=8, hmax=22)
    for k in range(3):
        n = noise(W, H, 20 + k, 36, 16, 4, .6); cv.fog_soft(np.clip((n - .38) * 2.4, 0, 1) * (.35 + .12 * k), (120, 230, 100), 5)
    for (x, y) in ((40, 60), (110, 50), (90, 70)):
        cv.glow(x, y, 16, (160, 255, 130), s=.5, p=2, levels=5)
    r = np.random.default_rng(3)
    for _ in range(26):
        x, y = r.integers(5, W - 5), r.integers(8, H - 5); cv.a[y, x] = (210, 255, 180); cv.a[y, x + 1] = (150, 230, 120)
    # lámpara del jugador parpadeando, halo débil
    cv.glow(30, 70, 22, (255, 220, 140), s=.45, p=2, levels=5)
    # calavera de aviso: cráneo simple
    sk = ell(W, H, 124, 20, 8, 8) | rect(W, H, 119, 22, 130, 30); cv.put(sk, hx('#d8e8c8')); cv.put(ell(W, H, 121, 20, 2, 2.4) | ell(W, H, 127, 20, 2, 2.4), hx('#0a1a14')); cv.put(rect(W, H, 121, 26, 130, 27), hx('#0a1a14'))
    cv.put(edge(sk), hx('#14301e')); cv.glow(124, 22, 20, (140, 255, 120), s=.3, p=2, levels=4)
    cv.vignette(.65, (3, 8, 5)); return cv.img(64)
def ev_grieta():
    cv = _cave(15, CAVE_W, (90, 50, 50), (50, 30, 40), None, 1.0, vp=(80, 36))
    pts = [(0, 10), (30, 30), (44, 28), (70, 52), (92, 48), (118, 70), (160, 84)]
    cv.glow(80, 50, 90, (255, 100, 40), s=.55, p=1.8, levels=7)
    for wd, col in ((9, '#5a1018'), (6, '#c8281c'), (3.4, '#ff8a28'), (1.5, '#fff0a0')):
        cv.put(line(W, H, pts, wd), hx(col))
    r = np.random.default_rng(2)
    for _ in range(26):
        x, y = r.uniform(30, 130), r.uniform(26, 80); cv.a[int(y), int(x)] = (255, 220, 120)
    cv.add(np.clip(1 - np.hypot(cv.xx - 80, cv.yy - 50) / 70, 0, 1) * .4, (255, 120, 40), 5)
    cv.vignette(.6, (8, 3, 6)); return cv.img(64)
def ev_tormenta():
    cv = Cv(W, H); sky(cv, SKY_STORM, 70, seed=4, warp=.2, power=1.0)
    cv.put(np.ones((H, W), bool), ramp_map(np.clip(noise(W, H, 4, 50, 14, 5, .6) * 1.1 - .05, 0, 1), R('#05050c', '#10101e', '#1c1e36', '#30345a', '#4c5280'), dw=.8))
    pts = [(104, 0), (96, 10), (106, 20), (98, 32), (108, 44), (100, 52)]
    cv.glow(102, 24, 70, (150, 160, 255), s=.5, p=1.6, levels=7); cv.put(line(W, H, pts, 2.6), hx('#7a82d8')); cv.put(line(W, H, pts, 1.1), hx('#ffffff'))
    mountains(cv, 62, 24, 9, R('#05050c', '#0b0b1a', '#14162c', '#232846', '#3a4270', '#6a78b8'), sun=-1, detail=1, fogcol=hx('#20243c'), fog=.4)
    snow(cv, 120, 3, sizes=(1,), wind=1.0, alpha=(.5, .9), col=(230, 236, 255), blurry=1)
    # marco de la boca de cueva (oscuro) a los lados y arriba
    frame = ~(ell(W, H, 80, 60, 70, 56))
    rs = rock_surface(W, H, 5, ROCK, L=(1, -1), amb=.25, gain=3)[0] * .45
    cv.put(frame, rs); cv.put(frame & ~np.roll(frame, -1, 1) | frame & ~np.roll(frame, 1, 1) & False, hx('#8a98e8')) if False else None
    cv.put(dilate(frame, 1) & ~frame, hx('#6a78c8') * .7)
    stalactites(cv, 8, 6, 2, ROCK, wmin=3, wmax=8, hmin=8, hmax=22)
    cv.vignette(.6, (3, 3, 12)); return cv.img(64)
def ev_linterna():
    cv = Cv(W, H, (4, 3, 10)); bg = rock_surface(W, H, 7, ROCK, L=(-1, -1), amb=.38, gain=4)[0]
    lit = np.clip(1 - np.hypot((cv.xx - 40) / 44., (cv.yy - 60) / 26.), 0, 1)
    cv.a[:] = bg * 0 + 4; cv.put(np.ones((H, W), bool), ramp_map(lit ** .8 * .85, R('#030208', '#0a0818', '#1c1230', '#3a2848', '#6a4a60', '#b08878'), dw=.8))
    beam(cv, 30, 62, -.18, .36, 110, (255, 214, 130), strength=.55, noise_seed=2)
    cv.glow(30, 62, 14, (255, 200, 110), s=.9, p=1.5, levels=6)
    lm = rect(W, H, 24, 58, 32, 66); cv.put(lm, shade(lm, R('#1a1408', '#4a3a0c', '#a88414', '#f0c020'), L=(-1, -1), r=2, amb=.5, gain=2)); cv.put(rect(W, H, 31, 60, 34, 64), hx('#fff4c0'))
    # batería agotada (barra roja)
    cv.put(rect(W, H, 118, 10, 148, 20), hx('#150e28')); cv.put(rect(W, H, 120, 12, 124, 18), hx('#d8283c')); cv.put(rect(W, H, 148, 13, 151, 17), hx('#8c90a8'))
    cv.put(rect(W, H, 118, 10, 148, 11), hx('#8c90a8')); cv.put(rect(W, H, 118, 19, 148, 20), hx('#8c90a8'))
    r = np.random.default_rng(1)
    for _ in range(30):
        x, y = int(r.uniform(60, 120)), int(r.uniform(30, 80)); cv.a[y, x] = (150, 130, 110)
    cv.vignette(.7, (2, 2, 6)); return cv.img(64)
def ev_hipotermia():
    cv = Cv(W, H); sky(cv, R('#0a1430', '#142450', '#28448a', '#4a74b8', '#86b0dc', '#c8e0f4'), 90, seed=2, warp=.1)
    n = noise(W, H, 3, 14, 14, 3); cv.a[:] = ramp_map(np.clip(cv.yy / 90. * .5 + n * .5, 0, 1) * .8, R('#0a1430', '#142450', '#28448a', '#4a74b8', '#86b0dc', '#c8e0f4'), dw=.7)
    # escarcha en los bordes
    fr = noise(W, H, 7, 8, 8, 4); ed = np.minimum.reduce([cv.xx, W - 1 - cv.xx, cv.yy, H - 1 - cv.yy]).astype(float)
    cv.put(fr * 1.4 > ed / 12. + .1, ramp_map(np.clip(fr + .25, 0, 1), R('#3a58a0', '#6a90d0', '#a8d0f0', '#e0f4ff', '#ffffff'), dw=.6))
    # cristales de hielo / copo central
    cx, cy = 80, 44
    for k in range(6):
        a = k * math.pi / 3
        for L_, w_ in ((30, 2.2), (16, 1.4)):
            cv.put(line(W, H, [(cx, cy), (cx + math.cos(a) * L_, cy + math.sin(a) * L_)], w_), hx('#e8f8ff'))
        for t_ in (12, 20):
            bx, by = cx + math.cos(a) * t_, cy + math.sin(a) * t_
            for sg in (-1, 1): cv.put(line(W, H, [(bx, by), (bx + math.cos(a + sg * .8) * 7, by + math.sin(a + sg * .8) * 7)], 1.2), hx('#c8ecff'))
    cv.glow(cx, cy, 40, (200, 240, 255), s=.35, p=2, levels=5)
    # aliento
    bn = noise(W, H, 9, 20, 10, 3); cv.fog_soft(np.clip((bn - .5) * 2, 0, 1) * np.clip(1 - np.hypot(cv.xx - 120, cv.yy - 70) / 30., 0, 1) * .8, (230, 245, 255), 4)
    particles(cv, 60, 3, (0, 0, W, H), (255, 255, 255), 1, (.5, 1)); cv.vignette(.55, (6, 12, 40)); return cv.img(64)
def ev_murcielagos():
    cv = _cave(18, R('#05040f', '#0f0a2a', '#22164a', '#3a2874', '#5a40a8', '#8a6ad8', '#c0a8f8'), (70, 40, 130), (50, 30, 100), (170, 120, 255), 1.3, vp=(80, 40))
    crystal_cluster(cv, 20, 84, 22, CRYS_V, 2, n=4, glow_col=(150, 90, 255), glowr=40, glow=.6)
    crystal_cluster(cv, 140, 82, 18, CRYS_C, 3, n=4, glowr=34, glow=.5)
    r = np.random.default_rng(6)
    for _ in range(26):
        x, y, s = r.uniform(10, 150), r.uniform(6, 70), r.uniform(2.4, 6)
        wing = r.uniform(.5, 1.4)
        pts = [(x - s * 2, y - s * wing), (x - s, y - s * .2), (x - s * .5, y + s * .1), (x, y + s * .5), (x + s * .5, y + s * .1), (x + s, y - s * .2), (x + s * 2, y - s * wing), (x + s, y + s * .5), (x, y + s * .9), (x - s, y + s * .5)]
        m = poly(W, H, pts, 3) | ell(W, H, x, y, s * .4, s * .6); cv.put(m, hx('#07040f')); cv.put(m & (cv.yy < y - s * .4) & (cv.xx > x), hx('#3a2874'))
    cv.vignette(.6, (5, 3, 14)); return cv.img(64)
def ev_eco():
    cv = _cave(21, CAVE, (60, 100, 150), (30, 60, 100), (150, 220, 255), 1.1, vp=(80, 44))
    cx, cy = 80, 48
    for i, rr in enumerate((8, 16, 26, 38, 52, 68)):
        a = (np.abs(np.hypot((cv.xx - cx) / 1.6, cv.yy - cy) - rr) < 1.0 + i * .12)
        cv.put(a & (((cv.xx + cv.yy) % 2 == 0) | (i < 2)), ramp_map(np.full((H, W), 1 - i / 7.), R('#3a5488', '#5c80b0', '#90d0e8', '#e0ffff'), dw=.6))
    xs = np.arange(30, 130); amp = np.abs(np.sin(xs * .3) * np.sin(xs * .07 + 1)) * 8 * np.exp(-((xs - 80) / 40.) ** 2)
    for x, a in zip(xs, amp): cv.a[int(cy - a):int(cy + a) + 1, x] = (230, 255, 255)
    cv.glow(cx, cy, 40, (180, 240, 255), s=.4, p=2, levels=5)
    cv.vignette(.6, (3, 4, 14)); return cv.img(64)

EVENTS = ['derrumbe', 'inundacion', 'gas', 'grieta', 'tormenta', 'linterna', 'hipotermia', 'murcielagos', 'eco']
def gen_events():
    for n in EVENTS:
        save(globals()['ev_' + n](), 'event_' + n, colors=64, note='ilustración de evento 160x90')
