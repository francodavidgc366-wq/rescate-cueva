#!/usr/bin/env python3
"""Genera todos los sprites procedurales en assets/gen/*.png + assets/gen/meta.json.
Uso: .venv/bin/python tools/gen-sprites.py   (necesita Pillow)"""
import json, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'gen')
os.makedirs(OUT, exist_ok=True)
META = {}

def hx(s):
    s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4)) + (255,)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))
def ramp(c):  # (luz cálida, base, sombra fría violeta)
    c = hx(c) if isinstance(c, str) else c
    return lerp(c, hx('#ffe0b0'), .38), c, lerp(c, hx('#1c0f40'), .45)
OUTLINE = hx('#150e28')

def outline(img, col=OUTLINE):
    w, h = img.size; px = img.load(); src = [[px[x, y][3] > 0 for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if not src[y][x] and any(0 <= x+dx < w and 0 <= y+dy < h and src[y+dy][x+dx]
                                     for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                px[x, y] = col
    return img

def blk(d, x, y, w, h, r, top=True, side=False):
    """bloque sombreado: base + línea de luz arriba + sombra abajo"""
    l, b, s = r
    d.rectangle([x, y, x+w-1, y+h-1], fill=b)
    if h > 2:
        if top: d.line([x, y, x+w-1, y], fill=l)
        d.line([x, y+h-1, x+w-1, y+h-1], fill=s)
    if side and w > 2: d.line([x+w-1, y, x+w-1, y+h-1], fill=s)

def limb(d, p0, p1, t, r):
    n = max(abs(p1[0]-p0[0]), abs(p1[1]-p0[1]), 1)
    for i in range(n+1):
        x = round(p0[0] + (p1[0]-p0[0]) * i / n); y = round(p0[1] + (p1[1]-p0[1]) * i / n)
        d.rectangle([x, y, x+t-1, y+t-1], fill=r[1])
        d.point((x+t-1, y+t-1), fill=r[2]); d.point((x, y), fill=r[0])

def sheet(cols, rows, cw, ch): return Image.new('RGBA', (cols*cw, rows*ch), (0, 0, 0, 0))
def save(img, name, **meta):
    img.save(os.path.join(OUT, name + '.png')); META[name] = dict(w=img.width, h=img.height, **meta)

# ------------------------------------------------------------------ TILES 16x16
ROCK = dict(base=hx('#3b3055'), mid=hx('#4a3d69'), lt=hx('#6b5a8c'), dk=hx('#2a2140'), dd=hx('#1d1630'))
SNOW = (hx('#f4f0ff'), hx('#d5cdf0'), hx('#9d92c8'))

def rock_fill(d, rng, bg=False, pal=ROCK):
    for y in range(16):
        for x in range(16):
            t = rng.random(); k = y / 15
            c = pal['base'] if k < .6 else pal['dk']
            if t < .16: c = pal['mid'] if k < .7 else pal['base']
            elif t < .21: c = pal['dk']
            elif t < .235 and k < .5: c = pal['lt']
            d.point((x, y), fill=c)
    for _ in range(2):  # grietas
        x, y = rng.randrange(2, 14), rng.randrange(1, 8)
        for _ in range(rng.randrange(3, 6)):
            d.point((x, y), fill=pal['dd']); x += rng.choice((-1, 0, 1)); y += 1

def tile_mask(m, seed):
    rng = random.Random(seed); im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    rock_fill(d, rng)
    N, E, S, W = m & 1, m & 2, m & 4, m & 8
    if N:
        for x in range(16):
            sd = 3 + (1 if rng.random() < .35 else 0) + (1 if (x*7+seed) % 5 == 0 else 0)
            for y in range(sd): d.point((x, y), fill=SNOW[0] if y == 0 else SNOW[1])
            d.point((x, sd), fill=SNOW[2]); d.point((x, sd+1), fill=ROCK['dd'])
    if S:
        d.line([0, 14, 15, 14], fill=ROCK['dk']); d.line([0, 15, 15, 15], fill=OUTLINE)
    if E: d.line([15, 0, 15, 15], fill=OUTLINE); d.line([14, 3 if N else 0, 14, 15], fill=ROCK['dd'])
    if W:
        d.line([0, 0, 0, 15], fill=OUTLINE); d.line([1, 3 if N else 0, 1, 15], fill=ROCK['lt'])
    if N: d.line([0 if not W else 1, 0, 15 if not E else 14, 0], fill=hx('#fffaf0'))
    for (cx, cy, a, b) in ((0, 0, N, W), (15, 0, N, E), (0, 15, S, W), (15, 15, S, E)):
        if a and b: d.point((cx, cy), fill=(0, 0, 0, 0))
    return im

def tile_bg(kind, seed):
    rng = random.Random(seed); im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    pal = dict(base=hx('#231b38'), mid=hx('#2b2245'), lt=hx('#3a2f58'), dk=hx('#1b1430'), dd=hx('#150f26'))
    rock_fill(d, rng, True, pal)
    if kind == 1:  # vena de cristal tenue
        for i in range(10): d.point((3+i, 12-i//2), fill=hx('#36588f'))
    return im

def crystal_poly(d, pts, base, hl, dk):
    d.polygon(pts, fill=base)
    x0, y0 = pts[0]; d.line([pts[0], pts[1]], fill=hl); d.line([pts[1], pts[2]], fill=dk)

def tile_crystal_block():
    im = tile_mask(0, 99); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 15, 15], fill=hx('#2a2552'))
    for pts, c in (([(2,15),(5,4),(8,15)], '#39d6e8'), ([(7,15),(11,2),(15,15)], '#7a5cff'), ([(0,15),(2,9),(4,15)], '#2aa0d0')):
        crystal_poly(d, pts, hx(c), hx('#d8fbff'), hx('#1c3a8a'))
    d.line([0, 15, 15, 15], fill=OUTLINE); d.line([0, 0, 15, 0], fill=OUTLINE); return im

def tile_plank():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); w = ramp('#9a5a32')
    blk(d, 0, 0, 16, 5, w); d.line([0, 5, 15, 5], fill=OUTLINE)
    for x in (4, 11): d.point((x, 2), fill=hx('#4a2a1a')); d.line([x-2, 3, x+1, 3], fill=w[2])
    d.line([0, 0, 15, 0], fill=hx('#f0b070')); d.line([0, 6, 15, 6], fill=(30, 18, 40, 140)); return im

def tile_stal(up):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    pts = [(3, 0), (12, 0), (8, 14)] if up else [(3, 15), (12, 15), (8, 1)]
    d.polygon(pts, fill=ROCK['base'])
    for y in range(16):
        for x in range(16):
            if im.getpixel((x, y))[3] and x > 8 - (14 - y) * .1 and x > 9: im.putpixel((x, y), ROCK['dk'])
    d.line([pts[0], pts[2]], fill=ROCK['lt']); return outline(im)

def tile_chain():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    for y in range(0, 16, 4):
        d.rectangle([7, y, 8, y+2], outline=hx('#8c86a8')); d.point((7, y), fill=hx('#d4d0ea'))
    return im

def tile_snow_solid():
    im = tile_mask(1, 7); d = ImageDraw.Draw(im)
    for y in range(16):
        for x in range(16):
            if (x*3 + y*5) % 11 == 0: d.point((x, y), fill=SNOW[1])
    return im

def tile_rubble():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); r = ramp('#5a4a7a')
    for x, y, w, h in ((2, 12, 5, 3), (8, 11, 6, 4), (5, 9, 4, 3), (11, 8, 3, 3)): blk(d, x, y, w, h, r)
    return outline(im)

def tile_moss():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); rng = random.Random(3)
    for x in range(16):
        for y in range(rng.randrange(2, 6)): d.point((x, y), fill=hx('#2f6b6e') if y < 2 else hx('#244d5e'))
    return im

def tile_crystal_cluster():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    for pts, c in (([(1,15),(3,6),(6,15)], '#39d6e8'), ([(5,15),(9,1),(13,15)], '#a07aff'), ([(10,15),(13,8),(15,15)], '#2aa0d0')):
        crystal_poly(d, pts, hx(c), hx('#e8feff'), hx('#2a3a9a'))
    return outline(im)

def gen_tiles():
    sh = sheet(8, 4, 16, 16)
    for m in range(16): sh.paste(tile_mask(m, 100+m), ((m % 8)*16, (m // 8)*16))
    cells = [tile_bg(0, 1), tile_bg(0, 2), tile_bg(1, 3), tile_crystal_block(), tile_plank(), tile_stal(False),
             tile_stal(True), tile_snow_solid(), tile_crystal_cluster(), tile_moss(), tile_chain(), tile_rubble()]
    for i, c in enumerate(cells): sh.paste(c, (((16+i) % 8)*16, ((16+i)//8)*16))
    save(sh, 'tiles', cell=16, cols=8, rows=4, index=dict(
        solid_mask='0..15 = bits N=1,E=2,S=4,W=8 (lado EXPUESTO al aire); 0=interior, 15=aislado',
        bg_a=16, bg_b=17, bg_vein=18, crystal_block=19, plank_oneway=20, stalactite=21, stalagmite=22,
        snow_solid=23, crystal_cluster=24, moss=25, chain=26, rubble=27))

# ------------------------------------------------------------------ PERSONAJES 24x24
ANIMS = [('idle', 4), ('run', 6), ('jump', 2), ('fall', 2), ('interact', 4)]
SKIN_L = {'guia': '#e0a674', 'medica': '#f2d0b4', 'ing': '#9a6440'}  # v7: Mateo, Elena, Samuel

# cabezas chibi 10x8 (v8), mirando a la derecha; letras -> HPAL
HEADS = {
 'guia': ["..hhhhhh..", ".hhhhhhhLL", ".hhhhhsssl", "hhhsssswel", "hhhssssees", ".hbzzzssss", "..zzzzmzz.", "...zzzzz.."],
 'medica': ["hhhhhhhh..", "hhhhhhhhhh", "hhhhhhhsss", "hhhsssswes", "hhhssssees", "hhhsssbsss", "hhhsssmss.", "..hhsssss."],
 'ing': ["..yyYYYY..", ".yYYYaaYLL", "XXXXXXXXXX", "ggssssswes", "ggsssssees", "ggGsssssss", "gGGGGmGGG.", "..GGGGGG.."],
}
def _hp(skin, hair, extra):
    sk = ramp(skin); hr = ramp(hair); d = dict(s=sk[1], l=sk[0], t=sk[2], h=hr[1], e=hx('#1a1018'), w=hx('#ffffff'), m=hx('#8a2a3a'), b=lerp(sk[1], hx('#e07070'), .5), L=hx('#fff4a8'))
    d.update(extra); return d
HPAL = {
 'guia': _hp('#e0a674', '#4a2c1c', dict(z=hx('#7a5238'))),
 'medica': _hp('#f2d0b4', '#241c30', {}),
 'ing': _hp('#9a6440', '#f6c820', dict(Y=hx('#f6c820'), y=hx('#ffe874'), X=hx('#c28a10'), a=hx('#4cc2d8'), g=hx('#c6c6ce'), G=hx('#d8d8de'))),
}

def draw_char(role, anim, i):
    im = Image.new('RGBA', (24, 24)); d = ImageDraw.Draw(im)
    skin = ramp(SKIN_L[role]); G = 22
    if role == 'guia': top, pants, boot, hat = ramp('#b8702e'), ramp('#4a4a5c'), ramp('#4a2c1c'), ramp('#4a2c1c')
    elif role == 'medica': top, pants, boot, hat = ramp('#f2eeea'), ramp('#46607a'), ramp('#4a3a40'), ramp('#241c30')
    else: top, pants, boot, hat = ramp('#3a6cc0'), ramp('#2e56a0'), ramp('#5a3a28'), ramp('#f6c820')
    bob, lean = 0, 0; fp = bp = (0, 0); fa = ba = (-1, 6)  # pie/mano relativos
    fl = bl = 0
    if anim == 'idle':
        bob = [0, 0, 1, 1][i]; fa = (0, 6 + bob); ba = (0, 6 + bob)
        fp, bp = (1, 0), (-2, 0)
    elif anim == 'run':
        ph = i / 6 * 2 * math.pi; lean = 1; bob = 1 if i in (1, 4) else 0
        fp = (round(math.sin(ph) * 4) + 1, -round(max(0, math.cos(ph)) * 3))
        bp = (round(-math.sin(ph) * 4) - 1, -round(max(0, -math.cos(ph)) * 3))
        fa = (round(-math.sin(ph) * 4), 5); ba = (round(math.sin(ph) * 4), 5)
    elif anim == 'jump':
        bob = -1 if i == 0 else 0; fp, bp = (3, -4 - i), (-1, -2 - i); fa = (2, -2 + i * 2); ba = (-3, -3 + i * 2)
    elif anim == 'fall':
        bob = 0; fp, bp = (2, -2 + i), (-3, -1 + i); fa = (4, -2 - i); ba = (-5, -1 - i)
    else:  # interact: brazo alargado hacia delante
        bob = 1 if i in (1, 2) else 0; fp, bp = (1, 0), (-2, 0); fa = (7, 1 + (i % 2)); ba = (0, 6)
    hipx, hipy = 12 + lean, 16 + bob
    sx_b, sx_f, sy = 9 + lean, 14 + lean, 10 + bob
    if role == 'medica':  # mochila médica
        blk(d, 6 + lean, 10 + bob, 3, 7, ramp('#c83a48'), side=True); d.point((7 + lean, 12 + bob), fill=hx('#ffffff'))
    limb(d, (sx_b, sy), (sx_b + ba[0], sy + ba[1]), 2, top)
    d.rectangle([sx_b+ba[0], sy+ba[1], sx_b+ba[0]+1, sy+ba[1]+1], fill=skin[1])
    limb(d, (hipx-2, hipy), (hipx-2 + bp[0], G - 1 + bp[1] - 1), 3, pants)
    d.rectangle([hipx-2+bp[0], G-2+bp[1], hipx+1+bp[0], G+bp[1]], fill=boot[1]); d.line([hipx-2+bp[0], G+bp[1], hipx+1+bp[0], G+bp[1]], fill=boot[2])
    blk(d, 8 + lean, 9 + bob, 8, 8, top, side=True)
    if role == 'guia':
        d.line([8 + lean, 9 + bob, 15 + lean, 9 + bob], fill=hx('#b81f28')); d.rectangle([8+lean, 10+bob, 9+lean, 12+bob], fill=hx('#b81f28')); d.rectangle([11+lean, 10+bob, 12+lean, 11+bob], fill=hx('#b81f28'))
        d.line([8 + lean, 15 + bob, 15 + lean, 15 + bob], fill=hx('#3a2418'))
    elif role == 'medica':
        d.rectangle([10+lean, 10+bob, 14+lean, 12+bob], fill=hx('#f0ece8')); d.rectangle([11+lean, 11+bob, 13+lean, 11+bob], fill=hx('#d8283c')); d.rectangle([12+lean, 10+bob, 12+lean, 12+bob], fill=hx('#d8283c'))
        d.line([8 + lean, 15 + bob, 15 + lean, 15 + bob], fill=hx('#9a96b0'))
    else:
        blk(d, 8 + lean, 13 + bob, 8, 4, pants); d.rectangle([9+lean, 11+bob, 10+lean, 13+bob], fill=pants[1])
        d.rectangle([14+lean, 11+bob, 15+lean, 13+bob], fill=pants[1]); d.point((12+lean, 14+bob), fill=hx('#f0c020'))
        d.line([8 + lean, 16 + bob, 15 + lean, 16 + bob], fill=hx('#5a3a22'))
    limb(d, (hipx+1, hipy), (hipx+1 + fp[0], G - 1 + fp[1] - 1), 3, pants)
    d.rectangle([hipx+1+fp[0], G-2+fp[1], hipx+4+fp[0], G+fp[1]], fill=boot[1]); d.line([hipx+1+fp[0], G+fp[1], hipx+4+fp[0], G+fp[1]], fill=boot[2])
    hx0 = 7 + lean; hy = 1 + bob
    HD = HEADS[role]; pal = HPAL[role]
    for j, row in enumerate(HD):  # cabeza chibi 10x8 dibujada a mano, mira a la derecha
        for k, c in enumerate(row):
            if c != '.': d.point((hx0 + k, hy + j), fill=pal[c])
    fx, fy = sx_f, sy
    limb(d, (fx, fy), (fx + fa[0], fy + fa[1]), 2, top)
    d.rectangle([fx+fa[0], fy+fa[1], fx+fa[0]+1, fy+fa[1]+1], fill=skin[1])
    return outline(im)

def gen_players():
    for role in ('guia', 'medica', 'ing'):
        sh = sheet(6, len(ANIMS), 24, 24)
        for r, (a, n) in enumerate(ANIMS):
            for i in range(n): sh.paste(draw_char(role, a, i), (i*24, r*24))
        save(sh, 'player_' + role, fw=24, fh=24, cols=6, anims={a: dict(row=r, frames=n, fps=[6, 12, 4, 4, 8][r], loop=a not in ('jump',)) for r, (a, n) in enumerate(ANIMS)},
             facing='derecha; espejar para izquierda', feet_y=22)

def draw_lia(i):
    im = Image.new('RGBA', (24, 24)); d = ImageDraw.Draw(im)
    br = [0, 1, 1, 0][i]; skin = ramp('#dba078'); hair = ramp('#1c1828'); bl = ramp('#e8b832')
    blk(d, 14, 19, 9, 4, ramp('#4a5a8a'), side=True)                       # piernas extendidas
    blk(d, 8, 12 + br, 8, 10 - br, bl, side=True)                          # torso con manta
    blk(d, 9, 17, 14, 6, bl); d.line([11, 19, 22, 19], fill=hx('#fff0b0')); d.line([11, 21, 22, 21], fill=hx('#fff0b0'))
    d.rectangle([17, 20, 20, 22], fill=hx('#ece8f4')); d.rectangle([18, 20, 19, 22], fill=hx('#d8283c'))  # vendaje
    ty = [0, 0, 1, 1][i]
    blk(d, 9, 5 + br + ty, 7, 7, skin, side=True)
    d.rectangle([8, 4 + br + ty, 15, 6 + br + ty], fill=hair[1]); d.rectangle([7, 5 + br + ty, 9, 13 + br + ty], fill=hair[1])
    d.line([8, 4 + br + ty, 15, 4 + br + ty], fill=hair[0])
    d.line([12, 9 + br + ty, 13, 9 + br + ty], fill=hx('#3a2030'))          # ojos cerrados
    d.point((14, 11 + br + ty), fill=hx('#5a5a8c'))
    d.rectangle([13, 14 + br, 15, 15 + br], fill=skin[1])                   # mano en el pecho
    return outline(im)

def gen_lia():
    sh = sheet(4, 1, 24, 24)
    for i in range(4): sh.paste(draw_lia(i), (i*24, 0))
    save(sh, 'lia', fw=24, fh=24, frames=4, fps=2, anims=dict(idle=dict(row=0, frames=4)), feet_y=22)

# ------------------------------------------------------------------ AGUA
def gen_water():
    sh = sheet(4, 2, 16, 16)
    for f in range(4):
        s = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(s)
        for x in range(16):
            top = 2 + round(math.sin((x + f * 4) / 16 * 2 * math.pi) * 1.4)
            for y in range(top, 16):
                d.point((x, y), fill=hx('#5fd0e8') + () if False else (95, 208, 232, 150) if y == top else (46, 140, 200, 120 if y < top + 4 else 100))
            if y := top + 1: d.point((x, top + 1), fill=(150, 235, 245, 140))
        b = Image.new('RGBA', (16, 16), (40, 120, 190, 100)); bd = ImageDraw.Draw(b)
        for k in range(3):
            x = (k * 7 + f * 3) % 16; y = (k * 5 + f * 4) % 16; bd.point((x, y), fill=(120, 215, 240, 130)); bd.point(((x+1) % 16, y), fill=(120, 215, 240, 90))
        sh.paste(s, (f*16, 0)); sh.paste(b, (f*16, 16))
    save(sh, 'water_tile', cell=16, frames=4, fps=5, rows=dict(surface=0, body=1), note='semitransparente; fila 0 = superficie (ola en y~2..4), fila 1 = cuerpo tileable')

# ------------------------------------------------------------------ PROPS 16x16
def flame(f):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    blk(d, 7, 8, 2, 7, ramp('#8a5230')); d.rectangle([5, 7, 10, 8], fill=hx('#6a6a82')); d.line([5, 8, 10, 8], fill=hx('#40405a'))
    sway = [0, 1, 0, -1][f]; h = [6, 7, 5, 7][f]
    for (w, hh, c) in ((3, h, '#e8452a'), (2, h-2, '#f59a2a'), (1, h-4, '#ffe070')):
        d.polygon([(8-w, 7), (8+w, 7), (8+sway, 7-hh)], fill=hx(c))
    d.point((8, 6), fill=hx('#fffbe0')); return outline(im) if False else im

def crystal_prop(f):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); g = [0, .4, .8, .4][f]
    base, hl = lerp(hx('#2fc0e0'), hx('#9afcff'), g), lerp(hx('#c8f8ff'), hx('#ffffff'), g)
    for pts, k in (([(2,15),(4,7),(7,15)], 0), ([(6,15),(9,1),(13,15)], 1), ([(11,15),(13,8),(15,15)], 0)):
        crystal_poly(d, pts, lerp(base, hx('#8a6aff'), .35 * k), hl, hx('#1c3a8a'))
    d.line([9, 3, 9, 8], fill=hl); im = outline(im, hx('#12306a'))
    for dx, dy in ((1, 6), (14, 4), (4, 2))[:1 + f % 3]: im.putpixel((dx, dy), (200, 250, 255, 255))
    return im

def radio(f):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); b = ramp('#4a5a52')
    d.line([11, 1, 13, 5], fill=hx('#b0b8c8')); d.point((11, 1), fill=hx('#ff5040') if f % 2 else hx('#702020'))
    blk(d, 2, 5, 12, 10, b, side=True)
    for y in (8, 10, 12): d.line([4, y, 7, y], fill=hx('#1c2420'))
    d.ellipse([9, 7, 12, 10], fill=hx('#d8c070'), outline=hx('#6a5a30')); d.point((10, 8), fill=hx('#fff4c0'))
    d.rectangle([9, 12, 12, 13], fill=hx('#40e0a0') if f >= 2 else hx('#1c4a38'))
    return outline(im)

def rope_seg():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    for y in range(16):
        o = 1 if (y // 2) % 2 else 0; d.point((7+o, y), fill=hx('#d8b878')); d.point((8+o, y), fill=hx('#9a7440'))
        d.point((6+o, y), fill=OUTLINE); d.point((9+o, y), fill=OUTLINE)
    return im

def rope_hook():
    im = rope_seg(); d = ImageDraw.Draw(im)
    d.rectangle([5, 0, 10, 3], fill=hx('#8c86a8')); d.rectangle([7, 1, 8, 2], fill=hx('#2a2140')); d.line([5, 0, 10, 0], fill=hx('#d4d0ea'))
    return outline(im)

def rope_coil():
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
    for k, r in enumerate((6, 4, 2)): d.ellipse([8-r, 11-r//2*1-1, 8+r, 11+r//2+1], outline=hx('#d8b878') if k % 2 == 0 else hx('#9a7440'))
    return outline(im)

def crate(open_):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); w = ramp('#7a8a4a')
    blk(d, 1, 4, 14, 11, w, side=True)
    for x in (2, 12): d.rectangle([x, 4, x+1, 14], fill=hx('#4a5a30'))
    d.line([1, 9, 14, 9], fill=hx('#4a5a30'))
    d.rectangle([6, 6, 9, 7], fill=hx('#f0e0a0')); d.point((7, 12), fill=hx('#f0e0a0'))
    if open_:
        d.rectangle([2, 1, 13, 4], fill=hx('#2a2a1a')); d.rectangle([3, 2, 4, 4], fill=hx('#c0c8d8')); d.rectangle([7, 0, 8, 4], fill=hx('#d8283c')); d.rectangle([10, 1, 12, 4], fill=hx('#f0c020'))
    else: d.line([1, 4, 14, 4], fill=hx('#b8c880'))
    return outline(im)

def marker(f):
    im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im); y = [3, 2, 3, 4][f]
    d.rectangle([6, y, 9, y+6], fill=hx('#ffe8a0')); d.rectangle([6, y+8, 9, y+9], fill=hx('#ffe8a0'))
    d.line([6, y, 9, y], fill=hx('#ffffff')); return outline(im, hx('#8a3a20'))

def gen_props():
    sh = sheet(4, 6, 16, 16)
    rows = [[flame(i) for i in range(4)], [crystal_prop(i) for i in range(4)], [radio(i) for i in range(4)],
            [rope_seg(), rope_hook(), rope_coil()], [crate(False), crate(True)], [marker(i) for i in range(4)]]
    for r, row in enumerate(rows):
        for c, im in enumerate(row): sh.paste(im, (c*16, r*16))
    save(sh, 'props', cell=16, cols=4, rows=dict(torch=dict(row=0, frames=4, fps=8, note='llama; anclar en tile de pared, luz en (8,4)'),
         crystal=dict(row=1, frames=4, fps=4, note='brilla, luz cian'), radio=dict(row=2, frames=4, fps=3, note='0-1 espera, 2-3 recibiendo'),
         rope=dict(row=3, frames=3, note='0 segmento vertical tileable, 1 gancho superior, 2 rollo'), box=dict(row=4, frames=2, note='0 cerrada, 1 abierta'),
         marker=dict(row=5, frames=4, fps=6, note='icono "!" interactuable')))

# ------------------------------------------------------------------ TELEFERICO 96x72
def cablecar_frame(angle):
    W, H = 96, 72
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    red, cream, dark = ramp('#c8412e'), ramp('#f2dcb0'), ramp('#3a2a4a')
    d.line([0, 4, W, 4], fill=hx('#2a2140'), width=2); d.line([0, 3, W, 3], fill=hx('#8c86a8'))
    blk(d, 44, 4, 8, 8, ramp('#6a6a82'), side=True); d.rectangle([46, 6, 49, 9], fill=hx('#2a2140'))   # polea
    d.rectangle([47, 12, 48, 22], fill=hx('#4a4a5e')); d.rectangle([40, 12, 41, 22], fill=hx('#4a4a5e')); d.rectangle([54, 12, 55, 22], fill=hx('#4a4a5e'))
    d.polygon([(41, 13), (47, 13), (47, 14), (41, 16)], fill=hx('#4a4a5e')); d.polygon([(48, 13), (54, 13), (54, 16), (48, 14)], fill=hx('#4a4a5e'))
    blk(d, 18, 22, 60, 5, red, side=True); d.line([18, 22, 77, 22], fill=hx('#f08c70'))                    # techo
    d.rectangle([20, 20, 75, 21], fill=red[0]); d.line([22, 19, 73, 19], fill=red[0])
    blk(d, 16, 27, 64, 36, cream, side=True)
    d.rectangle([16, 27, 79, 31], fill=red[1]); d.line([16, 31, 79, 31], fill=red[2])                    # franja
    for k, x in enumerate((22, 40, 58)):                                                                    # ventanas con luz cálida
        d.rectangle([x, 35, x+14, 51], fill=hx('#2a1840')); d.rectangle([x+1, 36, x+13, 50], fill=hx('#f6a850'))
        d.rectangle([x+1, 36, x+13, 40], fill=hx('#fbd078')); d.line([x+7, 36, x+7, 50], fill=hx('#7a4a38'))
        if k != 1:  # siluetas de pasajeros
            d.ellipse([x+3, 43, x+6, 46], fill=hx('#3a1e44')); d.rectangle([x+2, 46, x+7, 50], fill=hx('#3a1e44'))
        d.line([x, 51, x+14, 51], fill=hx('#fff0c0'))
    d.rectangle([16, 56, 79, 57], fill=red[1]); d.rectangle([16, 58, 79, 63], fill=dark[1]); d.line([16, 58, 79, 58], fill=dark[0])
    for x in range(20, 78, 8): d.rectangle([x, 60, x+1, 61], fill=hx('#f6a850'))                         # remaches
    d.rectangle([14, 62, 81, 64], fill=hx('#2a2140')); d.line([14, 62, 81, 62], fill=hx('#6a6a82'))
    d.rectangle([34, 14, 61, 18], fill=hx('#e0b050')) if False else None
    out = outline(im)
    # balanceo: rotar alrededor de la polea (nearest = pixel art)
    return out.rotate(angle, resample=Image.NEAREST, center=(48, 5))

def gen_cablecar():
    angs = [0, 1.6, 0, -1.6]
    sh = sheet(4, 1, 96, 72)
    for i, a in enumerate(angs): sh.paste(cablecar_frame(a), (i*96, 0))
    save(sh, 'cablecar', fw=96, fh=72, frames=4, fps=2, pivot=[48, 5], note='cable en y=3..4 del frame; balanceo pendular')

# ------------------------------------------------------------------ PARALLAX 320x180 x5 (tileables en X)
W, H = 320, 180
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
SKYC = [hx(c) for c in ('#160d30', '#2a1850', '#4a2a6e', '#78388a', '#a8467e', '#d85a62', '#f2804a', '#fbb04c', '#fee092')]

def gen_sky():
    layers = []
    # 0 cielo
    sky = Image.new('RGBA', (W, H)); px = sky.load(); hor = 128
    sun = (232, 112)
    for y in range(H):
        t = min(y / hor, 1) * (len(SKYC) - 1); i = min(int(t), len(SKYC) - 2); f = t - i
        for x in range(W):
            c = SKYC[i + 1] if f > (BAYER[y % 4][x % 4] + .5) / 16 else SKYC[i]
            dx, dy = min(abs(x - sun[0]), W - abs(x - sun[0])), y - sun[1]; r = math.hypot(dx, dy)
            if r < 15: c = hx('#fff6c8')
            elif r < 22 and BAYER[y % 4][x % 4] / 16 < (22 - r) / 7: c = hx('#ffe08a')
            elif r < 46 and BAYER[y % 4][x % 4] / 16 < ((46 - r) / 24) ** 1.5 * .55: c = lerp(c, hx('#ffd080'), .7)
            px[x, y] = c
    rng = random.Random(11)
    for _ in range(70):
        sx, sy = rng.randrange(W), rng.randrange(0, 50)
        if rng.random() < (50 - sy) / 50: px[sx, sy] = hx('#e8d8ff') if rng.random() < .7 else hx('#ffffff')
    d = ImageDraw.Draw(sky)
    for cx, cy, cw, col, under in ((40, 70, 60, '#8a4a90', '#d8689a'), (150, 92, 80, '#b8507a', '#f29868'), (260, 62, 50, '#7a3e88', '#d8689a'),
                                   (110, 38, 40, '#5a3078', '#a8468e'), (30, 105, 70, '#e0705a', '#fbb050'), (240, 100, 66, '#e87a50', '#fdc060')):
        for k in range(cw // 3):  # nube = elipses planas apiladas, envuelve en X
            ex = cx + rng.randrange(-cw // 2, cw // 2); ew = rng.randrange(10, 22); ey = cy + rng.randrange(-3, 3)
            for off in (-W, 0, W):
                d.ellipse([ex-ew+off, ey-2, ex+ew+off, ey+2], fill=hx(col))
                d.line([ex-ew+3+off, ey+2, ex+ew-3+off, ey+2], fill=hx(under))
    layers.append(sky)

    def mount(seed, base, amp, harm, c_lit, c_shd, c_snow, snow_from, haze, jag):
        im = Image.new('RGBA', (W, H)); p = im.load(); r = random.Random(seed)
        ph = [(r.randrange(1, harm + 1), r.random() * 6.28, r.random() * .6 + .4) for _ in range(5)]
        def h(x): return base - amp * sum(a * (1 - abs(math.sin(k * 2 * math.pi * x / W + o))) for k, o, a in ph) / 2.2 - jag * ((x * 37) % 3 == 0)
        hs = [h(x) for x in range(W)]; mn = min(hs)
        for x in range(W):
            slope = hs[(x + 2) % W] - hs[(x - 2) % W]
            for y in range(int(hs[x]), H):
                dep = y - hs[x]; alt = (base - hs[x]) / amp
                lit = slope < 1 if True else 0
                c = c_lit if slope > 0 else c_shd  # laderas que miran al sol (der.) más claras
                if dep < 2 + alt * snow_from * 9 + 2 * math.sin(x * .9) + (BAYER[y % 4][x % 4] / 6) and slope != 0:
                    c = c_snow[0] if slope > 0 else c_snow[1]
                else:
                    if BAYER[y % 4][x % 4] / 16 < min(dep / (H - hs[x] + 1), 1) * .9: c = lerp(c, haze, .55)
                if dep < 1: c = lerp(c, hx('#ffe8b0'), .6)
                p[x, y] = c
        return im
    layers.append(mount(5, 128, 56, 3, hx('#8a5aa0'), hx('#5a3a80'), (hx('#ffd8c0'), hx('#c8a8d8')), 1.2, hx('#c8688a'), 0))
    layers.append(mount(9, 142, 46, 4, hx('#5a3a7e'), hx('#3a2660'), (hx('#f0c0b0'), hx('#a890c8')), 1.0, hx('#7a4688'), 1))
    # 3 cresta cercana con pinos
    near = mount(21, 158, 26, 5, hx('#35224f'), hx('#241640'), (hx('#e8dcf0'), hx('#9a88c0')), .9, hx('#4a2c6a'), 1); pd = ImageDraw.Draw(near); r = random.Random(4)
    for _ in range(46):
        tx = r.randrange(W); ty = 150 + r.randrange(0, 22); hh = r.randrange(10, 18)
        for off in (-W, 0, W):
            for k in range(hh // 2):
                wd = k // 2 + 1; yy = ty - hh + k * 2
                pd.line([tx - wd + off, yy, tx + wd + off, yy], fill=hx('#1c1238')); pd.line([tx - wd + off, yy + 1, tx + wd + off, yy + 1], fill=hx('#2a1a4a'))
                pd.point((tx - wd + off, yy), fill=hx('#e8dcf0')) if k % 2 == 0 else None
    layers.append(near)
    # 4 nieve en primer plano (suelo + ventisca)
    fg = Image.new('RGBA', (W, H)); fp = fg.load(); r = random.Random(33)
    for x in range(W):
        top = 164 + round(3 * math.sin(2 * math.pi * x / W * 2) + 2 * math.sin(2 * math.pi * x / W * 5 + 1))
        for y in range(top, H):
            dep = y - top; c = hx('#f4eaff') if dep < 1 else hx('#d9c8f0') if dep < 4 else hx('#a894d0') if dep < 9 else hx('#7a68b0')
            if dep > 3 and r.random() < .06: c = hx('#f4eaff')
            fp[x, y] = c
    for _ in range(90):
        sx, sy = r.randrange(W), r.randrange(0, 160)
        a = r.choice((90, 140, 200)); fp[sx, sy] = (255, 255, 255, a)
        if r.random() < .3: fp[(sx + 1) % W, sy] = (255, 255, 255, a // 2)
    layers.append(fg)
    sh = Image.new('RGBA', (W, H * len(layers)))
    for i, l in enumerate(layers): sh.paste(l, (0, i * H))
    save(sh, 'sky_layers', fw=W, fh=H, frames=len(layers), tileable_x=True,
         layers=['sky (fijo, sol y nubes)', 'mountains_far', 'mountains_mid', 'ridge_pines_near', 'snow_foreground (con copos, alfa)'],
         parallax=[0.0, 0.1, 0.25, 0.45, 0.8])

# ------------------------------------------------------------------ UI 9-slice
def gen_ui():
    s = 24; im = Image.new('RGBA', (s, s)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, s-1, s-1], radius=3, fill=hx('#150e28'))
    d.rounded_rectangle([1, 1, s-2, s-2], radius=2, fill=hx('#e8964a'))
    d.rounded_rectangle([2, 2, s-3, s-3], radius=2, fill=hx('#3a2058'))
    d.rectangle([3, 3, s-4, s-4], fill=hx('#241440'))
    d.line([3, 3, s-4, 3], fill=hx('#4a2c70')); d.line([3, 4, s-4, 4], fill=hx('#32205a'))
    d.line([2, 2, s-3, 2], fill=hx('#f6c070'))
    for x, y in ((4, 4), (s-5, 4), (4, s-5), (s-5, s-5)): d.point((x, y), fill=hx('#ffd890'))
    d.point((3, 3), fill=hx('#e8964a'))
    save(im, 'ui_frame', slice=8, note='9-slice: esquinas 8px, centro tileable; fondo interior violeta oscuro, borde naranja')

if __name__ == '__main__':
    gen_tiles(); gen_players(); gen_lia(); gen_water(); gen_props(); gen_cablecar(); gen_sky(); gen_ui()
    import artlib, art_stills, art_portraits, art_icons, art_events, art_ui  # v3: ilustraciones, retratos, iconos (numpy)
    import art_icons4, art_portraits4; art_icons4.patch()
    art_stills.gen_stills(); art_portraits.gen_portraits(); art_portraits4.gen_portraits4(); art_icons.gen_icons(); art_events.gen_events(); art_ui.gen_trophies(); art_ui.gen_poi(); art_ui.gen_ui(); art_icons4.gen_icons4()
    import art_portraits6; art_portraits6.gen6(); art_portraits6.preview6(os.path.join(OUT, '..', 'preview_cast6.png'))  # v6: reparto dibujado, marcos dlg, npc
    import art_portraits7; art_portraits7.gen7(); art_portraits7.preview7(os.path.join(OUT, '..', 'preview_cast7.png'))  # v7: retratos 96x96 gotico (sobrescribe portrait_*)
    META.update(artlib.META); art_icons4.props_baselines(META)
    import art_faces8; META.update(art_faces8.gen())  # v8: face_<id> 48x48 Celeste + face_frame + preview_cast8.png
    json.dump(META, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
    print('ok', {k: (v['w'], v['h']) for k, v in META.items()})
