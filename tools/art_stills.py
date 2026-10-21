"""Ilustraciones 320x180 de la cinemática (still_*)."""
from art_scenes import *
W, H = 320, 180
META_STILL = dict(note='ilustración de cinemática 320x180, para Ken Burns/parallax; sin alfa')

def still_valle():
    cv = Cv(W, H); sky(cv, SKY_DUSK, 128, seed=3, warp=.06)
    stars(cv, 90, 4, 55)
    sun_glow(cv, 236, 108, r=125, big=.55, disc=False)
    clouds(cv, 5, 18, 82, R('#2a1750', '#4a2a78', '#8a3f88', '#d0587a', '#f89a68', '#ffd090'), cover=.5, sun=(1, .4), contrast=1.1)
    clouds(cv, 15, 52, 108, R('#321a5a', '#5c3086', '#a8487e', '#ec7a68', '#ffc080'), cover=.38, sun=(1, .3), sx=110, sy=10)
    sun_glow(cv, 236, 108, r=40, big=.0, disc=True)
    rays(cv, 236, 108, -2.7, -1.2, 9, 8, (255, 190, 120), strength=.18, length=240)
    # montañas: lejanas rosadas -> medias violetas
    mountains(cv, 118, 66, 21, R('#4a2a70', '#6e3880', '#9a4c88', '#c8688a', '#f09a8c', '#ffd0b0'), sun=1, snowline=.5, detail=.7, fogcol=hx('#c06888'), fog=.55, sx=120)
    mist(cv, 100, 130, 31, (214, 120, 130), .45)
    mountains(cv, 140, 56, 22, R('#24144a', '#38206a', '#583088', '#7e4090', '#b05a90', '#e88a98'), sun=1, snowline=.55, detail=.8, fogcol=hx('#8a4a8c'), fog=.6, sx=90)
    mist(cv, 122, 152, 33, (150, 84, 140), .5)
    # cueva lejana (agujero con brillo cian) en la cara de la montaña media
    cm = ell(W, H, 98, 143, 6, 4); cv.glow(98, 143, 20, (60, 220, 240), s=.55, p=2, levels=5); cv.put(cm, hx('#0a0820')); cv.put(ell(W, H, 98, 144, 3, 2), hx('#4ae0f0'));
    # bosque lejano
    forest(cv, 158, 14, 24, 70, 41, R('#07051a', '#0f0a26', '#1a1238', '#2a1c52', '#4a3278'), L=(1, -.5), rimcol=hx('#e8806a'), fogcol=hx('#6a3c7c'), fog=.55)
    mist(cv, 146, 176, 35, (110, 66, 130), .55, sx=60)
    # suelo nevado ondulado
    prof = 152 + 6 * np.sin(np.arange(W) / 40.) + 3 * noise(W, 1, 9, 30, 1, 3)[0] * 4
    gm = cv.yy >= prof[None, :]
    nz = noise(W, H, 12, 40, 14, 4)
    lit = np.clip(.35 + (cv.yy - prof[None, :]) * -.01 + (nz - .5) * .8 + .15 * np.sin(cv.xx / 22.), 0, 1)
    cv.put(gm, ramp_map(lit, R('#1c1440', '#2e2160', '#4c3a88', '#7c64b0', '#b89ad0', '#f0c8d0', '#fff0e0'), dw=.7))
    cv.put(gm & ~np.roll(gm, 1, 0), hx('#ffd8c0'))
    # teleférico: cable catenaria + torre + cabina con luz cálida
    xs = np.arange(0, W)
    cab = 14 + 0 * xs; cx0, cy0, cx1, cy1 = -5, 24, 330, 96
    yline = cy0 + (cy1 - cy0) * (xs - cx0) / (cx1 - cx0) + 20 * np.sin(math.pi * (xs - cx0) / (cx1 - cx0))
    cm = np.zeros((H, W), bool)
    for x in xs:
        y = int(yline[x]);
        if 0 <= y < H: cm[y, x] = True
    cv.put(cm, hx('#120c24')); cv.put(np.roll(cm, 1, 0) & ~cm & (cv.xx % 2 == 0), hx('#8a5a7a'))
    tx = 290; ty = int(yline[tx])
    tm = poly(W, H, [(tx - 3, ty - 4), (tx + 3, ty - 4), (tx + 5, 176), (tx - 5, 176)]) | rect(W, H, tx - 9, ty - 6, tx + 9, ty - 3)
    cv.put(tm, shade(tm, R('#07051a', '#0f0a26', '#1a1238', '#3a2060', '#8a4a70'), L=(-1, -.4), r=1.5, amb=.3, gain=2.5))
    bx = 168; by = int(yline[bx])
    cb = poly(W, H, [(bx - 11, by + 10), (bx + 11, by + 10), (bx + 9, by + 24), (bx - 9, by + 24)]) | rect(W, H, bx - 1, by - 2, bx + 1, by + 10)
    cv.glow(bx, by + 18, 38, (255, 170, 80), s=.5, p=2, levels=6)
    cv.put(cb, shade(cb, R('#0f0a26', '#2a1a40', '#5a2c48', '#a04848', '#e07a58'), L=(-1, -.5), r=1.5, amb=.42, gain=2.4))
    cv.put(rect(W, H, bx - 7, by + 13, bx + 7, by + 19), hx('#ffd890')); cv.put(rect(W, H, bx - 7, by + 13, bx + 7, by + 14), hx('#fff4c8'))
    cv.put(rect(W, H, bx - 1, by + 13, bx, by + 19), hx('#3a1c30'))
    # primer plano: pinos grandes a ambos lados, enmarcando
    forest(cv, 178, 70, 120, 5, 51, R('#05030f', '#0a0718', '#120d28', '#1c1438', '#2e2250'), L=(1, -.5), rimcol=hx('#f0906c'), xs=[8, 36, 18, -6, 52], snow=True, lean=-1)
    forest(cv, 180, 56, 98, 4, 52, R('#05030f', '#0a0718', '#120d28', '#1c1438', '#2e2250'), L=(1, -.5), rimcol=hx('#f0906c'), xs=[312, 292, 330, 270], snow=True, lean=1)
    # nieve cayendo (capas)
    snow(cv, 120, 61, sizes=(1,), alpha=(.4, .6), col=(255, 220, 220))
    snow(cv, 40, 62, sizes=(2,), alpha=(.5, .8), col=(255, 240, 240), blurry=1)
    cv.vignette(.5, (10, 4, 24))
    return cv.img(96)

def still_tormenta():
    cv = Cv(W, H); sky(cv, SKY_STORM, 150, seed=9, warp=.18, power=1.0)
    cl = noise(W, H, 4, 90, 22, 5, .6)
    cv.put(np.ones((H, W), bool), ramp_map(np.clip(cl * 1.15 - .1 + cv.yy / 400, 0, 1), R('#05050c', '#0c0c1a', '#16182c', '#232640', '#363a5c', '#4e5478'), dw=.8))
    # relámpago (rayo ramificado) con halo
    r = np.random.default_rng(7); pts = [(205, -2)]
    x, y = 205, -2
    bolts = []
    def bolt(x, y, depth, ang):
        seg = []
        for _ in range(int(r.integers(7, 12))):
            x += r.uniform(-9, 9) + ang * 3; y += r.uniform(7, 13); seg.append((x, y))
            if y > 120: break
        bolts.append([(seg[0][0] - 1, seg[0][1] - 8)] + seg if False else [(x0, y0)] if False else seg)
        return seg
    main = [(205, -2)]; x, y = 205., -2.
    while y < 118:
        x += r.uniform(-8, 8); y += r.uniform(6, 11); main.append((x, y))
    cv.glow(main[len(main)//2][0], 50, 130, (160, 170, 255), s=.55, p=1.7, levels=7)
    cv.glow(205, 20, 80, (210, 220, 255), s=.5, p=1.4, levels=6)
    cv.put(line(W, H, main, 3), hx('#7a82d8')); cv.put(line(W, H, main, 1.4), hx('#f4f4ff'))
    for k in (4, 8):
        bx, by = main[k]; br = [(bx, by)]
        for _ in range(5): bx += r.uniform(3, 9) * (1 if k == 4 else -1); by += r.uniform(5, 9); br.append((bx, by))
        cv.put(line(W, H, br, 2), hx('#7a82d8')); cv.put(line(W, H, br, 1), hx('#f4f4ff'))
    # relieve en silueta, iluminado por el rayo (rim azul)
    mountains(cv, 128, 60, 33, R('#05050c', '#0b0b1a', '#14162c', '#232846', '#3a4270', '#6a78b8'), sun=-1, snowline=.45, snowramp=R('#1c2038', '#3a4270', '#6a78b8', '#a8b4f0', '#e8ecff'), detail=1.0, fogcol=hx('#20243c'), fog=.5, sx=80)
    mist(cv, 100, 150, 5, (46, 52, 90), .6)
    forest(cv, 176, 30, 52, 44, 70, R('#030308', '#07070f', '#0e0e1c', '#181a30', '#2a2e52'), L=(-1, -.6), rimcol=hx('#6a78c8'), fogcol=hx('#161830'), fog=.25)
    # cable y cabina en primer plano, balanceándose, con ventanas cálidas
    xs = np.arange(W); yl = 14 + 0.09 * xs + 6 * np.sin(xs / 100.)
    cm = np.zeros((H, W), bool)
    for x in xs: cm[int(yl[x]), x] = True; cm[int(yl[x]) + 1, x] = True
    cv.put(cm, hx('#0c0c1a')); cv.put(cm & ~np.roll(cm, 1, 0) & (cv.xx % 3 != 0), hx('#6a78b8'))
    bx = 150; by = int(yl[bx]) + 1
    arm = line(W, H, [(bx, by), (bx - 4, by + 24)], 1.5)
    cv.put(arm, hx('#14162c'))
    ox, oy = bx - 4, by + 24
    # cabina inclinada 7º
    ang = -.12; ca, sa = math.cos(ang), math.sin(ang)
    def T(px, py): return (ox + px * ca - py * sa, oy + px * sa + py * ca)
    body = poly(W, H, [T(-34, 0), T(34, 0), T(30, 44), T(-30, 44)], 4)
    cv.glow(ox, oy + 18, 60, (255, 170, 80), s=.5, p=2, levels=6)
    cv.put(body, shade(body, R('#07070f', '#1a1626', '#3a2430', '#6a3430', '#b0603c'), L=(-1, -.2), r=2, amb=.35, gain=2.4))
    for k, wx in enumerate((-29, -10, 9)):
        wm = poly(W, H, [T(wx, 7), T(wx + 20, 7), T(wx + 20, 27), T(wx, 27)], 4)
        cv.put(wm, ramp_map(np.clip(.55 + .5 * (1 - (cv.yy - 40) / 100.) * .5 + .3 * noise(W, H, 3, 14, 14, 2), 0, 1), R('#c06020', '#e8802a', '#f8b048', '#ffd890', '#fff0c0'), dw=.7))
        hd = ell(W, H, T(wx + 10, 0)[0], T(0, 22)[1] + (-1 if k == 1 else 0) , 3.4, 4.2); cv.put(hd & wm, hx('#2a1420'))
        bd = poly(W, H, [T(wx + 3, 27), T(wx + 17, 27), T(wx + 16, 21), T(wx + 4, 21)], 4); cv.put(bd & wm, hx('#2a1420'))
    cv.put(poly(W, H, [T(-34, 0), T(34, 0), T(34, 4), T(-34, 4)], 4), hx('#c8c4e8'))
    cv.put(poly(W, H, [T(-30, 38), T(30, 38), T(30, 44), T(-30, 44)], 4), hx('#14102a'))
    cv.put(poly(W, H, [T(-34, 0), T(-32, 0), T(-28, 44), T(-30, 44)], 4), hx('#8a98e8'))
    # ventisca: nieve oblicua en capas y rachas
    wind = noise(W, H, 55, 120, 6, 3)
    cv.fog_soft(np.clip((wind - .5) * 1.3, 0, 1) * .6, (150, 160, 220), 4)
    snow(cv, 260, 71, sizes=(1,), wind=.7, alpha=(.5, .8), col=(230, 234, 255), blurry=1)
    snow(cv, 90, 72, sizes=(2,), wind=1.0, alpha=(.6, .9), col=(255, 255, 255), blurry=1)
    snow(cv, 24, 73, sizes=(3,), wind=1.4, alpha=(.35, .6), col=(235, 240, 255), blurry=1)
    cv.vignette(.65, (4, 4, 14))
    return cv.img(96)

def still_entrada():
    cv = Cv(W, H); sky(cv, SKY_DUSK, 100, seed=6, warp=.08)
    stars(cv, 60, 14, 45)
    clouds(cv, 25, 10, 60, R('#1c1240', '#32205e', '#5d2f7c', '#9a4a86', '#d0687a'), cover=.45, sun=(-1, .3), sx=100)
    mountains(cv, 70, 30, 64, R('#1c1240', '#2c1c58', '#4a2c7c', '#7a4090', '#b0609a'), sun=-1, detail=.7, fogcol=hx('#5a3484'), fog=.6)
    # pared de roca con estratos y boca de cueva
    prof = 40 + 16 * noise(W, 1, 66, 70, 1, 3)[0] * 2 + 8 * noise(W, 1, 67, 20, 1, 2)[0]
    rock = cv.yy >= prof[None, :]
    rs, hgt, v = rock_surface(W, H, 81, R('#0b0818', '#160f2c', '#241a40', '#38295c', '#54437c', '#7a68a0', '#a894c8'), L=(1, -.9), strata=.5, sx=34, sy=14, amb=.38)
    cv.put(rock, rs)
    # nieve fina en repisas (superficies que miran hacia arriba) y en la cresta
    gy = np.gradient(blur(hgt, 1.3), axis=0)
    ledge = rock & (gy < -.012) & (noise(W, H, 83, 10, 6, 2) > .4)
    cv.put(ledge, ramp_map(np.clip(v + .3, 0, 1), SNOW, dw=.7))
    cv.put(rock & ~np.roll(rock, 1, 0), SNOW[5]); cv.put(rock & ~np.roll(rock, 2, 0) & (noise(W, H, 84, 6, 6, 2) > .45), SNOW[4])
    mx, my = 168, 132
    nz = noise(W, H, 80, 14, 14, 3)
    sq = (np.abs(cv.xx - mx) / 66.) ** 2.4 + (np.abs(cv.yy - (my + 10)) / 74.) ** 2.4
    mouth = ((sq ** (1 / 2.4) + (nz - .5) * .22) < 1) & (cv.yy < 180)
    # interior: túnel en perspectiva muy oscuro, iluminado por fogata al fondo
    fire = Cv(W, H, (8, 5, 18)); fire.glow(mx + 6, my + 20, 46, (255, 150, 60), s=.9, p=1.6, levels=8); fire.glow(mx + 6, my + 20, 16, (255, 220, 140), s=.9, p=1.4, levels=6)
    inner = Cv(W, H)
    tunnel_scene(inner, (mx + 6, my + 14), 90, R('#06040e', '#0e0820', '#1c1230', '#33203c', '#5a3444', '#8a5448', '#d08a60'), R0=(80, 70), irreg=.35, mistcol=(120, 60, 40), far=fire.a, bright=.8, fogk=.7, n=6, smin=.22)
    cv.put(mouth, inner.a)
    d = np.hypot((cv.xx - mx - 6) / 64., (cv.yy - my - 16) / 60.)
    cv.blend(lmask(np.clip(d, 0, 1) ** 1.6 * .8, 7) * mouth, hx('#06040e'))
    cv.glow(mx + 6, my + 20, 52, (255, 150, 60), s=.85, p=1.8, levels=8)
    # cristales cian dentro de la cueva (derecha)
    crystal_cluster(cv, mx + 40, my + 40, 22, CRYS_C, 14, n=4, glowr=34)
    crystal_cluster(cv, mx - 38, my + 36, 14, CRYS_V, 15, n=3, glow_col=(150, 100, 255), glowr=24)
    # carámbanos en el labio
    r = np.random.default_rng(91); ic = np.zeros((H, W), bool)
    for x in range(mx - 60, mx + 64, 4):
        ytop = int(my + 10 - 74 * (max(0, 1 - (abs(x - mx) / 66.) ** 2.4)) ** (1 / 2.4)) + 2
        ln = r.integers(6, 28) if abs(x - mx) < 50 else r.integers(3, 9)
        ic |= poly(W, H, [(x - 1.8, ytop - 1), (x + 1.8, ytop - 1), (x + r.uniform(-.5, .5), ytop + ln)], 3)
    cv.put(ic, ramp_map(np.clip(.55 + .45 * noise(W, H, 5, 6, 10, 2) - (cv.yy - 40) / 400, 0, 1), R('#3a58a0', '#6a90d0', '#a8d0f0', '#e0f4ff', '#ffffff'), dw=.7))
    cv.glow(mx, my + 20, 96, (255, 150, 90), s=.2, p=1.5, levels=4)
    # suelo nevado con luz cálida desde la cueva
    gl = 158 + 4 * np.sin(np.arange(W) / 30.)
    gm = cv.yy >= gl[None, :]
    nz2 = noise(W, H, 95, 40, 12, 4)
    lit = np.clip(.5 + (nz2 - .5) * .7 - (cv.yy - 160) * .008, 0, 1)
    warm = np.clip(1 - np.hypot((cv.xx - mx) / 120., (cv.yy - 168) / 22.), 0, 1)
    cv.put(gm, ramp_map(np.clip(lit * .7 + warm * .45, 0, 1), R('#140e30', '#241a50', '#3c3070', '#6458a0', '#a498d0', '#f0c8c0', '#ffe0b0'), dw=.7))
    cv.put(gm & ~np.roll(gm, 1, 0), hx('#f4d8d4'))
    for i in range(7):
        fx = 40 + i * 13 + (i % 2) * 5; fy = 171 - i * 1.0
        cv.put(ell(W, H, fx, fy, 2.4, 1.2), hx('#4c3a80')); cv.put(ell(W, H, fx, fy - .5, 1.7, .6), hx('#8878c0'))
    # tres rescatadores a contraluz (rim cálido desde la cueva)
    for (fx, fy, hh, body, ht, pk) in ((112, 177, 46, R('#0a0718', '#1a1030', '#46203a', '#9a4a3a', '#f08a3a'), R('#0a0718', '#0c3c40', '#1a7a78', '#38c0b8', '#a8f0e0'), False),
                                       (138, 178, 48, R('#0a0718', '#1a1830', '#2e3050', '#6a7aa0', '#e0eef8'), R('#0a0718', '#1a1020', '#2e1c30', '#4a2a38', '#7a4a50'), True),
                                       (88, 176, 45, R('#0a0718', '#1a1830', '#2c3050', '#5a6890', '#a8b8d8'), R('#0a0718', '#5a4a10', '#a88a18', '#f0c020', '#fff0a0'), False)):
        figure(cv, fx, fy, hh, body, light=(1, -.2), skin=SKIN, hat=ht, face=1, pack=pk, rimcol=hx('#ffc070'), seed=fx)
    snow(cv, 90, 33, sizes=(1,), alpha=(.4, .7), col=(255, 224, 220), wind=.3)
    snow(cv, 25, 34, sizes=(2,), alpha=(.4, .7), col=(255, 236, 236), blurry=1)
    cv.vignette(.55, (8, 4, 20))
    return cv.img(96)


def _debris(cv, n, seed, y0, y1, col):
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = int(r.uniform(0, cv.w - 6)), int(r.uniform(y0, y1)); w = int(r.integers(2, 6))
        cv.a[y, x:x + w] = np.asarray(col, float)

def still_inundada():
    cv = Cv(W, H)
    far = np.zeros((H, W, 3)); fc = Cv(W, H, (20, 40, 70))
    fc.glow(160, 90, 55, (255, 190, 110), s=.9, p=1.5, levels=8); fc.glow(160, 90, 18, (255, 240, 200), s=.9, p=1.2, levels=6)
    wall, holes = tunnel_scene(cv, (160, 88), 12, R('#05040f', '#0a0a22', '#101838', '#1a2a52', '#2c4474', '#4a6a98', '#80a4c0'), R0=(62, 44), irreg=.34, mistcol=(58, 100, 150), far=fc.a, wall_light=1.0, bright=1.45)
    # estalactitas en el techo cercano y a media distancia
    stalactites(cv, 12, 3, 4, R('#05040f', '#0c0c24', '#16203e', '#26386a', '#4668a0'), ymax=60, wmin=6, wmax=16, hmin=22, hmax=60, L=(-1, -.3))
    stalactites(cv, 14, 4, 26, R('#080a1c', '#101a38', '#1c2c54', '#2c4478', '#4a6aa0'), wmin=3, wmax=7, hmin=8, hmax=22, region=(70, 250))
    # cristales con luz propia en paredes
    crystal_cluster(cv, 40, 122, 44, CRYS_C, 5, n=6, glowr=90, glow=.7)
    crystal_cluster(cv, 284, 118, 36, CRYS_V, 6, n=5, glow_col=(150, 90, 255), glowr=76, glow=.65)
    crystal_cluster(cv, 236, 96, 14, CRYS_C, 7, n=4, glowr=30, glow=.5)
    crystal_cluster(cv, 92, 92, 11, CRYS_V, 8, n=3, glow_col=(150, 90, 255), glowr=22, glow=.5)
    # haz de luz cenital desde una grieta (volumétrico)
    rays(cv, 214, -6, 1.15, 1.75, 8, 21, (200, 230, 255), strength=.26, length=210, levels=5)
    cv.glow(214, 0, 24, (220, 240, 255), s=.6, p=1.4)
    # silueta de rescatador con linterna (de espaldas, mira a la derecha) metido en el agua
    wy = 112
    figure(cv, 96, wy + 20, 58, R('#04030c', '#0a0e24', '#16244a', '#2a4a7a', '#5a90b8'), light=(1, -.3), skin=R('#04030c', '#101830', '#203050', '#385078', '#6a98b8'), hat=R('#04030c', '#4a3a08', '#8a6a10', '#d8a818', '#fff0a0'), face=1, pack=True, rimcol=hx('#8ad8f0'))
    beam(cv, 100, wy - 10, -.05, .35, 160, (255, 236, 170), strength=.5, noise_seed=17)
    cv.glow(102, wy - 10, 10, (255, 244, 200), s=.9, p=1.2, levels=6)
    mist(cv, 92, 116, 9, (60, 100, 150), .55, sx=70, sy=8)
    water_reflect(cv, wy, (12, 50, 86), seed=2, mixamt=.4, ripple=2.0, dark=.85)
    # restos flotando y espuma en el agua
    _debris(cv, 26, 4, wy + 4, 176, (150, 220, 230))
    cv.glow(160, wy + 2, 40, (230, 190, 120), s=.3, p=2, levels=5, sy=.18)
    # polvo/esporas luminosos
    particles(cv, 60, 31, (0, 20, W, 140), (170, 240, 255), 1, (.3, .8))
    cv.vignette(.62, (3, 3, 12))
    return cv.img(96)

def still_derrota():
    cv = Cv(W, H)
    fc = Cv(W, H, (10, 14, 30))
    wall, holes = tunnel_scene(cv, (160, 80), 33, R('#030208', '#07050f', '#0e0a1c', '#181230', '#26204a', '#3a3468', '#54508a'), R0=(54, 36), irreg=.4, mistcol=(44, 40, 96), far=fc.a, wall_light=1.0, bright=1.35)
    stalactites(cv, 14, 5, 0, R('#030208', '#080616', '#100c24', '#1c1638', '#2c2656'), wmin=6, wmax=16, hmin=22, hmax=62, L=(-1, -.3))
    crystal_cluster(cv, 252, 126, 30, CRYS_V, 15, n=5, glow_col=(110, 70, 220), glowr=60, glow=.25)
    crystal_cluster(cv, 46, 120, 26, CRYS_C, 16, n=4, glowr=50, glow=.2)
    wy = 78
    # destellos rojizos de emergencia lejos
    cv.glow(160, 78, 40, (200, 50, 60), s=.22, p=2, levels=5)
    # casco con linterna flotando casi apagada
    hx_, hy_ = 160, wy + 3
    hm = ell(W, H, hx_, hy_, 14, 8) & (cv.yy < wy + 6)
    cv.put(hm, shade(hm, R('#08060c', '#2a200a', '#5a4410', '#a88418', '#e0b830'), L=(-1, -.8), r=2, amb=.4, gain=3))
    cv.put(rect(W, H, hx_ + 6, hy_ - 4, hx_ + 11, hy_ - 1), hx('#ffe9a0'))
    cv.glow(hx_ + 10, hy_ - 2, 34, (255, 200, 90), s=.5, p=2, levels=6)
    mist(cv, 60, 90, 11, (28, 30, 60), .6, sx=80)
    water_reflect(cv, wy, (6, 10, 28), seed=5, mixamt=.5, ripple=2.4, dark=.8, shimmer=hx('#6a78c0'))
    # reflejo de la linterna, alargado
    for k in range(18):
        yy = wy + 4 + k * 3
        if yy < H: cv.a[yy, hx_ + 8 - 3 + (k % 3): hx_ + 8 + 5 + (k % 2)] = mix(cv.a[yy, hx_ + 8 - 3], np.array([255, 200, 100.]), max(0, .7 - k * .04))
    _debris(cv, 30, 6, wy + 4, 176, (90, 100, 170))
    # mano que sale del agua? no: sólo burbujas
    r = np.random.default_rng(3)
    for _ in range(14):
        bx, by = r.integers(100, 220), r.integers(wy + 12, 170); cv.a[by, bx] = (150, 170, 230)
    cv.blend(lmask(np.clip((cv.yy - 120) / 80., 0, 1) * .55, 6), (4, 4, 16))
    cv.vignette(.8, (2, 2, 8), p=1.8)
    return cv.img(96)


def still_radio():
    cv = Cv(W, H)
    # fondo desenfocado (bokeh): roca oscura + luces de cristales fuera de foco
    bg = rock_surface(W, H, 50, R('#050410', '#0c0a1c', '#16122c', '#241c40', '#382c58', '#54447c'), L=(-1, -.6), amb=.3, gain=3)[0]
    cv.a[:] = bg
    cv.blend(lmask(np.clip(noise(W, H, 2, 60, 40, 2), 0, 1) * .5, 4), (10, 8, 30))
    r = np.random.default_rng(5)
    for _ in range(22):
        x, y, rad = r.uniform(0, W), r.uniform(0, 110), r.uniform(5, 12)
        col = [(70, 200, 240), (150, 100, 255), (255, 170, 80)][int(r.integers(0, 3))]
        d = np.hypot(cv.xx - x, cv.yy - y); m = d < rad
        cv.blend(m * (.28 + .14 * (d > rad - 1.5)), col)
    # repisa de roca
    ledge = rect(W, H, 0, 128, W, H)
    ls, h2, v2 = rock_surface(W, H, 61, R('#0a0818', '#150f2a', '#241a40', '#38295c', '#54437c', '#7a68a0'), L=(-1, -1), amb=.4, gain=6)
    cv.put(ledge, ls); cv.put(ledge & ~np.roll(ledge, 1, 0), hx('#a894c8'))
    # radio (cuerpo)
    x0, y0, x1, y1 = 60, 58, 228, 132
    body = rect(W, H, x0, y0, x1, y1) & ~(((cv.xx < x0 + 4) | (cv.xx > x1 - 5)) & ((cv.yy < y0 + 4) | (cv.yy > y1 - 5)))
    bcol = shade(body, R('#10181a', '#1f2c2c', '#34483f', '#4e6a58', '#7a9a78', '#b4d0a0'), L=(-1, -1), r=4, amb=.5, gain=1.2, dw=.55)
    cv.put(body, bcol)
    cv.put(body & ~np.roll(body, 1, 0), hx('#d4e8b8')); cv.put(body & ~np.roll(body, 1, 1), hx('#a0c090'))
    cv.put(body & ~np.roll(body, -1, 0), hx('#0c1214')); cv.put(body & ~np.roll(body, -1, 1), hx('#0c1214'))
    # rejilla altavoz
    for k in range(9):
        yy = y0 + 12 + k * 6
        cv.put(rect(W, H, x0 + 10, yy, x0 + 66, yy + 2), hx('#0c1214')); cv.put(rect(W, H, x0 + 10, yy + 2, x0 + 66, yy + 3), hx('#5a7860'))
    # pantalla verde con onda
    sx0, sy0, sx1, sy1 = x0 + 82, y0 + 10, x0 + 156, y0 + 40
    cv.glow((sx0 + sx1) / 2, (sy0 + sy1) / 2, 120, (60, 255, 150), s=.35, p=1.6, levels=6)
    scr = rect(W, H, sx0, sy0, sx1, sy1)
    cv.put(scr, ramp_map(np.clip(.35 + .25 * np.sin((cv.yy - sy0) * 1.8) * 0 + .3 * (1 - (cv.yy - sy0) / (sy1 - sy0)) + .1 * noise(W, H, 4, 8, 3, 2), 0, 1), R('#04180f', '#0a3a22', '#14683a', '#2ab060', '#6af0a0'), dw=.6))
    xs = np.arange(sx0 + 2, sx1 - 2)
    amp = np.abs(np.sin(xs * .35) * np.sin(xs * .09 + 1)) * 10
    for x, a in zip(xs, amp):
        cv.a[int((sy0 + sy1) / 2 - a):int((sy0 + sy1) / 2 + a) + 1, x] = (200, 255, 220)
    cv.put(scr & (cv.yy % 3 == 0), mix(cv.a[sy0, sx0], hx('#04180f'), .4))
    cv.put(rect(W, H, sx0, sy0, sx1, sy0 + 1) | rect(W, H, sx0, sy1 - 1, sx1, sy1) | rect(W, H, sx0, sy0, sx0 + 1, sy1) | rect(W, H, sx1 - 1, sy0, sx1, sy1), hx('#0c1214'))
    # dial con aguja
    for (kx, ky, kr) in ((x0 + 98, y0 + 58, 9), (x0 + 130, y0 + 58, 9)):
        kn = ell(W, H, kx, ky, kr, kr); cv.put(kn, shade(kn, R('#101010', '#3a3830', '#6a6450', '#a89c70', '#e0d090'), L=(-1, -1), r=3, amb=.5, gain=1.8, dw=.5))
        cv.put(edge(kn), hx('#0c1214'))
        a = -.8 if kx < x0 + 110 else .6
        cv.put(line(W, H, [(kx, ky), (kx + math.sin(a) * (kr - 2), ky - math.cos(a) * (kr - 2))], 1), hx('#e84030'))
    # LED y botones
    cv.glow(x0 + 160, y0 + 58, 22, (255, 60, 40), s=.8, p=1.8, levels=6); cv.put(ell(W, H, x0 + 160, y0 + 58, 3, 3), hx('#ff6050')); cv.put(ell(W, H, x0 + 159, y0 + 57, 1, 1), hx('#ffe0d0'))
    for i in range(3):
        cv.put(rect(W, H, x0 + 82 + i * 16, y0 + 66, x0 + 94 + i * 16, y0 + 70), hx('#2a3a32')); cv.put(rect(W, H, x0 + 82 + i * 16, y0 + 66, x0 + 94 + i * 16, y0 + 67), hx('#6a8a70'))
    # antena
    cv.put(line(W, H, [(x1 - 14, y0), (x1 + 6, y0 - 56)], 1.6), hx('#c4ccd8')); cv.put(line(W, H, [(x1 - 14, y0), (x1 + 6, y0 - 56)], .6), hx('#ffffff'))
    cv.put(ell(W, H, x1 + 6, y0 - 56, 2.2, 2.2), hx('#ff5040')); cv.glow(x1 + 6, y0 - 56, 14, (255, 70, 50), s=.7, p=1.8, levels=5)
    # ondas de radio saliendo de la antena
    for i, rr_ in enumerate((14, 24, 35)):
        m = (np.abs(np.hypot(cv.xx - (x1 + 6), cv.yy - (y0 - 56)) - rr_) < .8) & (cv.xx > x1 + 6 - 4) & (cv.yy < y0 - 56 + 8)
        cv.put(m & (((cv.xx + cv.yy) // 2) % 2 == 0), hx('#9af0c0'))
    # asa y sombra proyectada
    cv.blend(lmask(np.clip(1 - np.hypot((cv.xx - 150) / 150., (cv.yy - 138) / 8.), 0, 1) * .6, 4) * (cv.yy > 131), (4, 3, 12))
    # luz de linterna desde la izquierda arriba + luz verde de la pantalla
    beam(cv, -6, 6, .5, .42, 330, (255, 226, 160), strength=.4, noise_seed=9)
    # polvo en el aire en la luz
    particles(cv, 80, 7, (0, 0, W, 130), (255, 236, 190), 1, (.3, .8))
    cv.vignette(.7, (4, 3, 12))
    return cv.img(96)

def still_mapa():
    cv = Cv(W, H)
    # mesa de madera oscura
    wood = noise(W, H, 4, 120, 5, 4, ridged=True)
    cv.a[:] = ramp_map(np.clip(.2 + wood * .5 + 0.1 * (cv.yy % 36 < 2), 0, 1), R('#0c0810', '#1a1018', '#2a1a1c', '#40281e', '#5a3a26'), dw=.6)
    # papel: parche irregular con borde roto
    px0, py0, px1, py1 = 36, 12, 288, 170
    edge_n = noise(W, H, 5, 10, 10, 3)
    inpaper = (cv.xx > px0 + (edge_n - .5) * 8) & (cv.xx < px1 + (edge_n - .5) * 8) & (cv.yy > py0 + (edge_n - .5) * 8) & (cv.yy < py1 + (edge_n - .5) * 8)
    fib = noise(W, H, 6, 6, 3, 3)
    pv = np.clip(.62 + (fib - .5) * .35 + .15 * np.sin((cv.xx + cv.yy) / 40.) , 0, 1)
    # luz de la linterna en la esquina superior izquierda
    lamp = np.clip(1 - np.hypot((cv.xx - 70) / 280., (cv.yy - 20) / 200.), 0, 1)
    pv = np.clip(pv * .7 + lamp * .5 - .1, 0, 1)
    cv.put(inpaper, ramp_map(pv, R('#3a2a28', '#6a5040', '#a08060', '#d0b080', '#ecd8a8', '#fff0c8'), dw=.7))
    cv.put(inpaper & ~np.roll(inpaper, 1, 1) | inpaper & ~np.roll(inpaper, -1, 0), hx('#fff0c8'))
    cv.put(dilate(inpaper, 1) & ~inpaper & (cv.yy > py0 + 6), hx('#0c0810'))
    # pliegues
    for fx in (px0 + 84, px0 + 168):
        cv.put(rect(W, H, fx, py0, fx + 1, py1) & inpaper, hx('#8a6a4a')); cv.put(rect(W, H, fx + 1, py0, fx + 2, py1) & inpaper, hx('#f0dcb0'))
    cv.put(rect(W, H, px0, 88, px1, 89) & inpaper, hx('#8a6a4a'))
    # zonas de agua (acuarela azul desde abajo) con curvas de nivel
    wz = (cv.yy > 118 + 22 * noise(W, H, 8, 60, 20, 2) - (cv.xx - 150) * .05) & inpaper
    cv.put(wz, ramp_map(np.clip(.35 + (cv.yy - 120) / 100. + .2 * noise(W, H, 9, 12, 12, 3), 0, 1), R('#8ab0b8', '#5a98b0', '#3a78a0', '#2a5a8a'), dw=.6))
    for k in range(4):
        cm = (np.abs(((cv.yy + 14 * noise(W, H, 8, 60, 20, 2)) % 9) - 4.5) < .55) & wz
        cv.put(cm & (cv.xx % 3 != 0), hx('#9ad0e0'))
    # cavidades: 5 nodos y pasillos
    nodes = [(66, 36), (112, 70), (162, 48), (206, 98), (252, 142)]
    pas = np.zeros((H, W), bool)
    for a, b in zip(nodes[:-1], nodes[1:]):
        mid = ((a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 8)
        pts = [a, mid, b]; pas |= line(W, H, pts, 7)
    for (nx, ny) in nodes: pas |= ell(W, H, nx, ny, 15, 11)
    pas &= inpaper
    pasl = blur(pas.astype(float), 1.3) > .5
    cv.put(dilate(pasl, 1) & ~pasl & inpaper, hx('#2a1c1c'))
    cv.put(pasl, ramp_map(np.clip(pv * .55 + .4, 0, 1), R('#a8885a', '#c8a870', '#e4c890', '#f8e4b0'), dw=.7))
    cv.put(pasl & wz, hx('#6aa8c0'))
    # sombreado interno (hachuras) en el borde de las cavernas
    cv.put(edge(pasl) & ((cv.xx + cv.yy) % 3 == 0), hx('#6a4a38'))
    # ruta punteada roja entre nodos
    for a, b in zip(nodes[:-1], nodes[1:]):
        mid = ((a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 8)
        rm = line(W, H, [a, mid, b], 1.2); rm &= ((cv.xx + cv.yy) % 7 < 4)
        cv.put(rm, hx('#c8283c'))
    # nodos numerados con chincheta
    for i, (nx, ny) in enumerate(nodes):
        cv.put(ell(W, H, nx + 1, ny + 2, 7, 7), hx('#3a2418') * 0 + mix(cv.a[ny + 2, nx + 1], hx('#2a1c1c'), .5))
        cv.put(ell(W, H, nx, ny, 7, 7), hx('#d8283c')); cv.put(ell(W, H, nx, ny, 5.6, 5.6), hx('#f06070')); cv.put(ell(W, H, nx - 2, ny - 2, 1.6, 1.6), hx('#ffd8d8'))
        digit(cv, str(i + 1), nx - 2, ny - 3, hx('#3a0a18'))
    # brújula arriba-derecha
    cx, cy = 256, 40
    cm = ell(W, H, cx, cy, 20, 20); cv.put(cm, shade(cm, R('#3a2a1a', '#6a5030', '#a88850', '#d8b878', '#f8e0a0'), L=(-1, -1), r=3, amb=.5, gain=1.4, dw=.5))
    cv.put(ell(W, H, cx, cy, 16, 16), hx('#e8d8b0')); cv.put(edge(ell(W, H, cx, cy, 16, 16)), hx('#6a4a28'))
    cv.put(poly(W, H, [(cx, cy - 15), (cx - 3, cy), (cx + 3, cy)]), hx('#d8283c')); cv.put(poly(W, H, [(cx, cy + 15), (cx - 3, cy), (cx + 3, cy)]), hx('#3a4a6a'))
    cv.put(ell(W, H, cx, cy, 1.5, 1.5), hx('#f8e0a0'))
    # lápiz
    pen = poly(W, H, [(196, 150), (282, 172), (284, 168), (198, 146)]); cv.put(pen, shade(pen, R('#6a3a08', '#b87010', '#e8a020', '#ffd048'), L=(-1, -1), r=1.5, amb=.5, gain=3))
    cv.put(poly(W, H, [(196, 150), (188, 147), (198, 146)]), hx('#e8d0a0')); cv.put(poly(W, H, [(189, 148), (186, 146.5), (190, 147)]), hx('#303030'))
    # casco a un lado con linterna encendida
    hm = ell(W, H, 20, 160, 22, 12) & (cv.yy < 166)
    cv.put(hm, shade(hm, R('#2a1a08', '#6a4a0a', '#b88a14', '#f0c020', '#fff0a0'), L=(-1, -1), r=3, amb=.45, gain=2))
    cv.glow(34, 156, 40, (255, 230, 150), s=.65, p=1.8, levels=6); cv.put(rect(W, H, 33, 153, 40, 158), hx('#fffbe0'))
    # viñeta de luz cálida
    cv.glow(70, 20, 220, (255, 190, 100), s=.12, p=1.5, levels=4)
    particles(cv, 60, 3, (0, 0, W, H), (255, 236, 190), 1, (.2, .5))
    cv.vignette(.75, (6, 3, 10))
    return cv.img(96)


def still_cabina():
    cv = Cv(W, H)
    # interior: pared y suelo de madera/metal con luz cálida del plafón
    cv.a[:] = ramp_map(np.clip(.28 + noise(W, H, 3, 40, 6, 3, ridged=True) * .25 - (cv.yy / H) * .1, 0, 1), R('#07050a', '#140c12', '#24141a', '#3a2220', '#5a342a'), dw=.6)
    # vista exterior en la ventana
    wx0, wy0, wx1, wy1 = 18, 14, 302, 116
    ex = Cv(W, H); sky(ex, SKY_STORM, 120, seed=11, warp=.2, power=1.0)
    cl = noise(W, H, 7, 80, 20, 5, .6); ex.put(np.ones((H, W), bool), ramp_map(np.clip(cl * 1.2 - .1 + ex.yy / 380, 0, 1), R('#05050c', '#0e0e1e', '#1a1c32', '#2c3050', '#444a74', '#6a74a8'), dw=.8))
    ex.glow(210, 40, 120, (170, 180, 255), s=.55, p=1.6, levels=7)
    mountains(ex, 92, 44, 41, R('#07070f', '#10121e', '#1c2038', '#323a64', '#5a68a8', '#9aa8e0'), sun=-1, snowline=.5, snowramp=R('#1c2038', '#3a4270', '#6a78b8', '#a8b4f0', '#e8ecff'), detail=1.0, fogcol=hx('#24284a'), fog=.5)
    mist(ex, 80, 120, 8, (50, 56, 96), .6)
    snow(ex, 220, 9, sizes=(1, 2), wind=1.0, alpha=(.5, .9), col=(235, 240, 255), blurry=1)
    win = rect(W, H, wx0, wy0, wx1, wy1); cv.put(win, ex.a)
    # escarcha en esquinas de la ventana
    fr = noise(W, H, 12, 14, 14, 3)
    edged = np.minimum.reduce([cv.xx - wx0, wx1 - cv.xx, cv.yy - wy0, wy1 - cv.yy]).astype(float)
    cv.put(win & (fr * 1.2 > edged / 14.), ramp_map(np.clip(fr + .2, 0, 1), R('#3a4a80', '#6a7ab0', '#a8b8e0', '#e0ecff'), dw=.6))
    # montantes del marco
    for mx_ in (wx0 + 94, wx0 + 190):
        m = rect(W, H, mx_, wy0, mx_ + 5, wy1); cv.put(m, shade(m, R('#08060a', '#1a1014', '#2e1c20', '#4a2c2c', '#7a4a3a'), L=(-1, 0), r=1.5, amb=.5, gain=2.5))
    for (a, b, c, d) in ((0, 0, W, wy0), (0, wy1, W, 126), (0, 0, wx0, 126), (wx1, 0, W, 126)):
        m = rect(W, H, a, b, c, d); cv.put(m, shade(m, R('#08060a', '#1a1014', '#2e1c20', '#4a2c2c', '#7a4a3a'), L=(-1, -1), r=2, amb=.45, gain=1.2))
    cv.put(rect(W, H, wx0, wy1, wx1, wy1 + 2), hx('#c8a070')); cv.put(rect(W, H, wx0, wy0 - 2, wx1, wy0), hx('#7a4a3a'))
    # suelo de tablones en perspectiva simple
    fl = cv.yy >= 126
    cv.put(fl, ramp_map(np.clip(.3 + noise(W, H, 4, 90, 5, 3) * .35 + .1 * ((cv.xx // 18) % 2) - (cv.yy - 126) * .002, 0, 1), R('#0a0608', '#1c1014', '#34201c', '#5a3828', '#8a5a38'), dw=.6))
    for k in range(0, W, 24):
        cv.put(line(W, H, [(k, 126), (k + (k - 160) * .5, H)], .6), hx('#12080a'))
    cv.put(rect(W, H, 0, 126, W, 128), hx('#c08850'))
    # lámpara del techo: luz cálida con cono
    lx, ly = 160, 6
    beam(cv, lx, ly, math.pi / 2, .9, 190, (255, 190, 110), strength=.45, noise_seed=6)
    cv.glow(lx, ly + 4, 80, (255, 180, 90), s=.5, p=1.8, levels=7)
    cv.put(poly(W, H, [(lx - 7, 0), (lx + 7, 0), (lx + 4, 8), (lx - 4, 8)]), hx('#3a2418')); cv.put(ell(W, H, lx, ly + 8, 4, 3), hx('#fff0c0'))
    # tres rescatadores en silueta a contraluz de la tormenta, con luz cenital cálida arriba
    group = ((74, 160, 98, R('#04030a', '#0c0a1c', '#1c1a38', '#32406a', '#6a86c0'), R('#04030a', '#0c3c40', '#1a7a78', '#38c0b8', '#a8f0e0'), False),
             (160, 166, 104, R('#04030a', '#0c0a1c', '#1c1a38', '#324068', '#78a0d0'), R('#04030a', '#1a1020', '#2e1c30', '#4a2a38', '#7a4a50'), True),
             (246, 160, 96, R('#04030a', '#0c0a1c', '#1c1a38', '#303c68', '#6a84bc'), R('#04030a', '#5a4a10', '#a88a18', '#f0c020', '#fff0a0'), False))
    for (fx, fy, hh, body, ht, pk) in group:
        figure(cv, fx, fy, hh, body, light=(.1, -1), skin=None, hat=ht, face=1 if fx < 200 else -1, pack=pk, rimcol=hx('#a8b8ff'), lamp=False, seed=fx)
    # rayo: destello de luz azul sobre la escena
    cv.glow(210, 50, 150, (160, 180, 255), s=.12, p=1.4, levels=4)
    # gotas/condensación en el cristal
    r = np.random.default_rng(14)
    for _ in range(40):
        x, y = r.integers(wx0 + 4, wx1 - 4), r.integers(wy0 + 4, wy1 - 8)
        cv.a[y:y + int(r.integers(2, 6)), x] = mix(cv.a[y, x], np.array([210., 225, 255]), .55)
    cv.vignette(.7, (3, 2, 8))
    return cv.img(96)

def still_rescate():
    cv = Cv(W, H)
    # exterior luminoso al amanecer (visto desde dentro de la cueva)
    ex = Cv(W, H); sky(ex, SKY_DAWN, 112, seed=21, warp=.04, power=1.1)
    sun_glow(ex, 168, 90, (255, 220, 150), r=150, big=.8, disc=True)
    clouds(ex, 22, 20, 80, R('#7a8cc8', '#b8a8d8', '#f0b8c0', '#ffd0a0', '#fff0c8'), cover=.42, sun=(0, 1), sx=90)
    mountains(ex, 104, 54, 61, R('#6a78b8', '#8a88c0', '#b098c8', '#e0a8c0', '#ffc8b8', '#fff0d8'), sun=1, snowline=.5, snowramp=R('#8a98d0', '#b8b8e0', '#e0d0f0', '#fff0f0', '#ffffff'), detail=.7, fogcol=hx('#e8b8c0'), fog=.6)
    mist(ex, 96, 130, 62, (255, 214, 200), .6)
    forest(ex, 128, 12, 20, 60, 63, R('#2a3a68', '#44588a', '#6a7aa8', '#a098c0', '#e0b8c0'), L=(1, -.5), rimcol=hx('#fff0d0'), fogcol=hx('#d8a8c0'), fog=.4)
    gy = 122 + 4 * np.sin(np.arange(W) / 28.); gm = ex.yy >= gy[None, :]
    nz = noise(W, H, 64, 40, 10, 4)
    ex.put(gm, ramp_map(np.clip(.55 + (nz - .5) * .6 - (ex.yy - 120) * .004 + np.clip(1 - np.hypot((ex.xx - 168) / 120., (ex.yy - 130) / 20.), 0, 1) * .4, 0, 1), R('#8a88c0', '#b8a8d8', '#e0c8e0', '#fff0e8', '#ffffff'), dw=.7))
    for _ in range(80):  # destellos de nieve
        x, y = int(rng(_).uniform(0, W)), int(rng(_ + 99).uniform(124, 150))
        if ex.a[y, x].sum() > 600: sparkle(ex, x, y, 1, (255, 255, 255))
    # interior de la cueva como marco oscuro en contraluz
    far = ex.a
    wall, holes = tunnel_scene(cv, (168, 100), 73, R('#050308', '#0c0812', '#1a1020', '#32202c', '#5a3a3a', '#8a5a4c', '#e0a070'), R0=(150, 98), irreg=.22, mistcol=(255, 200, 150), far=far, wall_light=1.0, bright=.5, fogk=.5, n=5, smin=.62)
    # suelo mojado/nieve dentro con reflejo cálido
    fl = cv.yy > 126
    # rayos de luz entrando (god rays)
    rays(cv, 168, 90, math.pi * .12, math.pi * .88, 14, 25, (255, 224, 170), strength=.34, length=190, levels=6)
    cv.glow(168, 92, 120, (255, 220, 150), s=.3, p=1.8, levels=6)
    # grupo de 3 que sale: uno lleva a Lía en brazos (siluetas con rim dorado desde delante)
    figure(cv, 132, 168, 52, R('#07050c', '#150e1c', '#2a1c2e', '#54384a', '#c07a5a'), light=(1, -.6), skin=None, hat=R('#07050c', '#0c3c40', '#1a7a78', '#38c0b8', '#a8f0e0'), face=1, rimcol=hx('#ffe8b0'), pose=1)
    figure(cv, 172, 170, 56, R('#07050c', '#150e1c', '#2a1c2e', '#54384a', '#c07a5a'), light=(1, -.6), skin=None, hat=R('#07050c', '#1a1020', '#2e1c30', '#4a2a38', '#7a4a50'), face=1, pack=True, rimcol=hx('#ffe8b0'), pose=-1)
    # Lía en brazos del tercer rescatador (manta naranja)
    figure(cv, 206, 169, 54, R('#07050c', '#150e1c', '#2a1c2e', '#4a5470', '#c8d0e8'), light=(1, -.6), skin=None, hat=R('#07050c', '#5a4a10', '#a88a18', '#f0c020', '#fff0a0'), face=1, rimcol=hx('#ffe8b0'))
    lia = poly(W, H, [(196, 150), (222, 146), (224, 154), (200, 160)]) | ell(W, H, 194, 148, 4, 4)
    cv.put(lia, shade(lia, R('#2a1008', '#6a2a14', '#c05a28', '#f0902e', '#ffd070'), L=(-1, -1), r=2, amb=.5, gain=2.5))
    cv.put(ell(W, H, 194, 148, 3, 3.4), hx('#f0c8b0')); cv.put(ell(W, H, 192, 146, 3.2, 2.2), hx('#a8452c'))
    # sombras largas hacia la cámara
    for (sx, sw) in ((132, 14), (172, 16), (206, 16)):
        sm = poly(W, H, [(sx - 4, 170), (sx + 4, 170), (sx + sw - 20 * 0, 180), (sx - sw * .2, 180)])
        cv.blend(lmask(sm * .55, 4), (30, 20, 50))
    particles(cv, 100, 5, (0, 0, W, 140), (255, 240, 200), 1, (.4, .9))
    cv.glow(168, 96, 60, (255, 240, 200), s=.35, p=1.4, levels=6)
    cv.vignette(.4, (20, 10, 30), p=2.4)
    return cv.img(96)


STILLS = ['valle', 'cabina', 'tormenta', 'entrada', 'radio', 'mapa', 'inundada', 'rescate', 'derrota']
def gen_stills():
    for n in STILLS:
        im = globals()['still_' + n]()
        save(im, 'still_' + n, colors=96, **META_STILL)
