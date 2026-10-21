#!/usr/bin/env python3
"""ART v8: retratos 48x48 dibujados a mano en rejilla ASCII (estilo dialogos de Celeste).
Cabeza base compartida (mitad izquierda, se espeja) + capas por personaje (pelo/ropa/accesorios) + capas de
expresion (ojos, cejas, boca). Hoja face_<id> 192x288: filas=6 expresiones, cols=4 [closed,talk1,talk2,blink].
Uso: python3 tools/art_faces8.py  (solo Pillow) -> escribe assets/gen/face_*.png y assets/preview_cast8.png"""
import os
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'gen')
S = 48
EXPR = ['neutral', 'feliz', 'preocupado', 'enfadado', 'sorprendido', 'triste']
FRAMES = ['closed', 'talk1', 'talk2', 'blink']

def hx(s): s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4)) + (255,)

# ---------------------------------------------------------------- parser: lineas "y x0 texto" (ultimo char se rellena hasta el centro, salvo '.')
def parse_half(txt):
    px = {}
    for ln in txt.strip().splitlines():
        ln = ln.split('#')[0].strip()
        if not ln: continue
        y, x0, t = ln.split(); y, x0 = int(y), int(x0)
        if t[-1] != '.': t = t + t[-1] * (24 - x0 - len(t))
        t = t[:24 - x0]  # recorta en el centro
        for i, c in enumerate(t):
            if c != '.': px[(x0 + i, y)] = c
    return px
def mirror(px):
    o = dict(px)
    for (x, y), c in px.items(): o[(47 - x, y)] = c
    return o
def parse_full(txt, ox, oy):  # bloque rectangular colocado en (ox,oy); '.' transparente
    px = {}
    for j, ln in enumerate(txt.strip().splitlines()):
        for i, c in enumerate(ln.strip()):
            if c != '.': px[(ox + i, oy + j)] = c
    return px

# ---------------------------------------------------------------- cabeza base compartida (mitad izq.)
HEAD = parse_half('''
10 14 oooo
11 12 oos
12 11 os
13 10 os
14 9 os
15 8 os
16 8 os
17 8 os
18 8 os
19 8 os
20 8 os
21 8 os
22 4 ooeeess
23 4 oereess
24 4 oereess
25 4 oereess
26 4 oeeeess
27 5 ooeess
28 5 oooos
29 8 os
30 9 os
31 9 os
32 10 os
33 11 os
34 12 os
35 14 os
36 16 os
37 18 os
38 20 os
39 18 ottooo
40 18 ottt
''')
NECK_Y = 40

# ---------------------------------------------------------------- paletas (letra -> color)
COMMON = dict(w='#ffffff', P='#1a1018', F='#ffffff', m='#6a1a2a', Q='#fff6ec', T='#e8707a', N='#78d0f2', z='#e89a88', Z='#7a5238')
def mkpal(**k):
    d = {a: hx(b) for a, b in COMMON.items()}; d.update({a: hx(b) for a, b in k.items()}); return d

CH = {}
# ---- Mateo
CH['guia'] = dict(name='Mateo', bg='#3d4f73', pal=mkpal(o='#2b1810', s='#e6ac78', l='#f6c898', t='#c07c50', e='#e6ac78', r='#c07c50', n='#c07c50', b='#e08868', i='#6a3c1c', B='#3a2216',
    H='#4a2c1c', J='#74482e', K='#2e1a10', C='#b8702e', c='#d68c44', d='#7e4a1c', R='#e03442', r2='#f8606a', u='#a81e30', S='#33323e', s2='#56566a', L='#fff4a8', M='#f0b828', Z='#8a5a3c'),
  hair='''
2 21 oooo
3 18 oooHHH
4 15 ooohhJHHH
5 13 oooHhJJHHHH
6 10 ooHHHJJHHHHHHH
7 9 oHHHHHHHHHHHHHH
8 8 oHHHHHHHHHHHHHHH
9 8 oHHHHHHHHHHHHHHH
10 7 oHHHHHHHHHHHHHHH
11 7 oHHHHHHHHHHHHHHH
12 6 oHHHHHHHHHHHHHHHH
13 6 oHHHHHHHHHHKK.
14 6 oSSSSSSSSSSSSSSSSS
15 6 oSSsSSSSSSSSsSSSSS
16 6 oHHHHK.
17 6 oHHHK.
18 6 oHHK.
19 7 oHK.
20 7 oK.
''', body='''
41 15 oRRRRRRRR
42 12 ooRRRrRRRRRR
43 13 oRRRRRRRRRR
42 9 oooooo
43 8 ooCCCCCoRRR
44 7 ooCCccCCCoRRR
45 6 oCCCccCCCCCoRRR
46 6 oCCCCCCCCCCCCRRR
47 6 oCCCCCCCCCCCCC
''', asym=[('''
.oooooo.
oLLLLLLo
oLLMMLLo
oMMMMMMo
.oooooo.''', 20, 10), ('''
.oRRo.
oRrRRo
oRuuRo
.oRRo.''', 22, 43)], extra='mateo')
# ---- Elena
CH['medica'] = dict(name='Elena', bg='#5a7a6a', pal=mkpal(o='#241a28', s='#f6d4b8', l='#fff0e0', t='#dca88c', e='#f6d4b8', r='#dca88c', n='#dca88c', b='#f0a0a0', i='#3a8a72', B='#1e1626',
    H='#241c30', J='#4a3c62', K='#140e1c', W='#f6f2ee', w2='#ffffff', V='#c4c8d8', U='#46607a', R='#dc2c40', q='#b890b4'),
  hair='''
0 19 oooo
1 17 ooHHHH
2 16 oHHJJHH
3 16 oHJJHHH
4 17 oHHHHHH
5 13 oooHHHHHHHHH
6 11 ooHHJJHHHHHHH
7 10 oHHJJHHHHHHHHH
8 9 oHHHHHHHHHHHHHH
9 9 oHHHHJJHHHHHHHH
10 8 oHHHHHHHHHHHHHHH
11 8 oHHHHHHJJJHHHHHH
12 7 oHHHHHHHHHHHHHHHH
13 7 oHHHHHHHHHHHHHHHH
14 7 oHHHHHHHHHHHHJKK.
15 7 oHHHHHHHHHHKK.
16 7 oHHHHHHHHKK.
17 7 oHHHHHHHK.
18 7 oHHHHHHK.
19 6 oHHHHHHK.
20 6 oHHJHHHK.
21 5 oHHHHHHHK.
22 5 oHHJHHHHK.
23 5 oHHHHHHHK.
24 5 oHHHJHHHK.
25 5 oHHHHHHHK.
26 5 oHHJHHHK.
27 5 oHHHHHHK.
28 5 oHHHHHK.
29 6 oHHHHK.
30 7 oHHHK.
31 8 ooHK.
''', body='''
41 16 oWWWwUUUU
42 12 ooWWWWWWUUUU
43 9 ooWWWWWWWWWUUU
44 8 oWWWWwWWWWWWUUU
45 7 oWWWWWWWWWWWVUUU
46 7 oWWWWWWWWWWWVVUUU
47 7 oWWWWWWWWWWWWVUUU
''', asym=[('''
..R..
..R..
RRRRR
..R..
..R..''', 31, 43)], extra='elena')
# ---- Samuel
CH['ing'] = dict(name='Samuel', bg='#9a6a3a', pal=mkpal(o='#1c100a', s='#9a6440', l='#b8805a', t='#74462a', e='#9a6440', r='#74462a', n='#74462a', b='#c0604a', i='#2a1810', B='#9a9aa4',
    Y='#f6c820', y='#ffe874', X='#c28a10', S='#2a3846', a='#4cc2d8', A='#b8f4ff', G='#c6c6ce', g='#ecece6', x='#8a8a98', C='#3a6cc0', c='#5a8ce0', d='#244a90', L='#fff4a8', M='#f0b828', Z='#ffffff'),
  hair='''
2 17 oooooo
3 14 oooyyyYYYY
4 12 ooyyyYYYYYYY
5 11 oyyYYYYYYYYYY
6 10 oyyYYYYYYYYYYY
7 9 oyyYYYYYYYYYYYY
8 9 oyYYYYYYYYYYYYY
9 8 oyYYYYYYYYYYYYYY
10 8 oSSSSSSSSSSSSSSS
11 8 oSSSSSSSSSSSSSSS
12 8 oSSSSSSSSSSSSSSS
13 6 ooYYYYYYYYYYYYYYYX
14 5 ooyYYYYYYYYYYYYYXX
15 5 ooXXXXXXXXXXXXXXX
16 5 oooooooooooooooo
17 8 oGg.
18 8 oGg.
19 8 oGg.
20 8 oGg.
21 8 oGg.
22 8 oGg.
23 9 oGg.
24 9 oGg.
27 9 oGg.
28 9 oGGg.
29 9 oGGGg.
30 16 oGGGGGGGg
31 18 oGGGg
32 10 oGGGg.
33 10 oGGGg.
34 11 oGGGg.
35 12 oGGGGGg.
36 13 oGGGGGGGGGGGGg
37 15 oGGGGGGGGGGg
38 18 oGGGGGGg
39 19 ogGGGGG
40 20 ooooo
''', body='''
41 15 oCCCCCCCC
42 11 ooCCCCCCCCCCC
43 9 ooCCCCcCCCCCCCC
44 8 oCCCCcCCCCCCCCCd
45 7 oCCCCCCCCCCCCCCCd
46 7 oCCCCCCCCCCCCCCCd
47 7 oCCCCCCCCCCCCCCCd
''', asym=[('''
.oooooo.
oLLLLLLo
oLLMMLLo
oMMMMMMo
.oooooo.''', 20, 3), ('''
ooooooooo
oAAaaaaao
oAaaaaaao
oaaaaaaao
ooooooooo''', 12, 8), ('''
ooooooooo
oaaaaaaAo
oaaaaaaAo
oaaaaaaao
ooooooooo''', 27, 8)], extra='samuel')
# ---- Lia
CH['lia'] = dict(name='Lia', bg='#4a5a82', pal=mkpal(o='#16101c', s='#dba078', l='#f0bc94', t='#b87c58', e='#dba078', r='#b87c58', n='#b87c58', b='#e08080', i='#6a4424', B='#14101c',
    H='#1c1828', J='#4c5a8c', K='#0c0a14', C='#e8b832', c='#fff080', d='#a87818', N='#9ad8ff'),
  hair='''
3 16 oooooooo
4 13 ooHHJJHHH
5 11 ooHHHJJHHHHHH
6 10 oHHHJHHHHHHHHH
7 9 oHHHHHHJHHHHHH
8 8 oHHHHHHHHHHHHHHH
9 8 oHHHHJJHHHHHHHHH
10 8 oHHHHHHHHHHHHHHH
11 7 oHHHHHHHHHJJHHHH
12 7 oHHHHHHHHHHHHHHH
13 7 oHHHHHHHHHHHHHHHH
14 7 oHHHHHHHHHHHHHHHH
15 7 oHHHHHHHHHHHHJKKK
16 6 oHHHHHHHHHHHKK.
17 6 oHHHHHHHHHKK.
18 6 oHHHHHHHKK.
19 5 oHHJHHHHK.
20 5 oHHHHHHHK.
21 3 oHHHJHHHHK.
22 3 oHHHHHHHHK.
23 3 oHHJHHHHHK.
24 3 oHHHHHHHHK.
25 3 oHHHHJHHHK.
26 3 oHHHHHHHHK.
27 3 oHHJHHHHHK.
28 3 oHHHHHHHHK.
29 3 oHHHHHHHHK.
30 3 oHHHJHHHK.
31 3 oHHHHHHHK.
32 3 oHHHHHJHK.
33 3 oHHHHHHHK.
34 3 oHHJHHHHK.
35 3 oHHHHHHHK.
36 3 oHHHHHHK.
37 3 oHHHJHHK.
38 3 oHHHHHHK.
39 3 oHHHHHHK.
40 3 oHHHHHHK.
41 2 oHHHJHHHK.
42 2 oHHHHHHHK.
43 2 oHHHHJHHHK.
44 2 oHHHHHHHHK.
45 2 oHHJHHHHHK.
46 2 oHHHHHHHHK.
47 2 oHHHHHHHHK.
''', body='''
40 14 oCCcCCCCC
41 11 ooCCCcCCCCCCC
42 9 ooCCCCcCCCdCCCC
43 8 oCCCcCCCCCCdCCCC
44 8 oCCcCCCdCCCCCCCC
45 7 oCCCCCCCCCcCCCdC
46 7 oCCdCCCCCCCCCCCC
47 7 oCCCCcCCCCdCCCCC
''', asym=[('''
..d.d..
.dCcCd.
..dCd..''', 20, 43)], extra='lia')

# ---------------------------------------------------------------- expresion: ojos / cejas / bocas
EYE = {}
EYE['open'] = '''
.ooooo.
oiFFiio
oiFPPio
oiiPPio
oiiiiio
.oiiio.
..ooo..'''
EYE['wide'] = '''
.ooooo.
owwwwwo
owFiiwo
owiPiwo
owiiiwo
owwwwwo
.owwwo.
..ooo..'''
EYE['angry'] = '''
oooo...
oiioooo
oiFPPio
oiiPPio
oiiiiio
.oiiio.
..ooo..'''
EYE['sad'] = '''
...ooo.
..oiiio
.oiFFio
oiiFPPo
oiiPPio
.oiiio.
..ooo..'''
EYE['happy'] = '''
..ooo..
.o...o.
o.....o'''
EYE['blink'] = '''
o.....o
.ooooo.'''
EYE['worry'] = '''
.ooooo.
oiFFiio
oiFPPio
oiiPPio
oiiFiio
.oiiio.
..ooo..'''
# (nombre, y_ojo)
EYES = {'neutral': ('open', 23), 'feliz': ('happy', 25), 'preocupado': ('worry', 23), 'enfadado': ('angry', 23), 'sorprendido': ('wide', 22), 'triste': ('sad', 23)}
BROW = {
 'neutral': ('''
.BBBBB.
B.....B''', 19),
 'feliz': ('''
.BBBBB.
B.....B''', 18),
 'preocupado': ('''
....BBB
BBBBB..''', 18),
 'enfadado': ('''
BBB....
.BBBBB.
...BBBB''', 18),
 'sorprendido': ('''
..BBB..
.B...B.''', 16),
 'triste': ('''
....BB.
..BBB..
BBB....''', 18)}
MOUTH = {}  # (expr, frame) centrados en x=24, y_top=32
MOUTH['neutral'] = ['''
.oooooo.''', '''
..oooo..
..ommo..
..oooo..''', '''
.oooooo.
.ommmmo.
.omTTmo.
..oooo..''']
MOUTH['feliz'] = ['''
o......o
.o....o.
..oooo..''', '''
oooooooo
oQQQQQQo
.omTTmo.
..oooo..''', '''
oooooooo
oQQQQQQo
ommmmmmo
omTTTTmo
.oTTTTo.
..oooo..''']
MOUTH['preocupado'] = ['''
.oo..oo.
o..oo..o''', '''
..oooo..
.omTmmo.
..oooo..''', '''
.oooooo.
omTmmmmo
.ommmmo.
..oooo..''']
MOUTH['enfadado'] = ['''
..oooo..
.o....o.
o......o''', '''
.oooooo.
oQQQQQQo
.oooooo.''', '''
oooooooo
oQQQQQQo
ommmmmmo
omTTTTmo
.oooooo.''']
MOUTH['sorprendido'] = ['''
..oo..
.o..o.
..oo..''', '''
..oooo..
.ommmmo.
.ommmmo.
..oooo..''', '''
..oooooo..
.ommmmmmo.
.ommmmmmo.
.omTTTTmo.
..oooooo..''']
MOUTH['triste'] = ['''
..oooo..
.o....o.
o......o''', '''
.oo..oo.
o.oooo.o
..ommo..''', '''
..oooo..
.ommmmo.
.omTTmo.
..oooo..''']

# ---------------------------------------------------------------- composicion
def put(px, lay, dy=0):
    for (x, y), c in lay.items():
        if 0 <= x < S and 0 <= y + dy < S: px[(x, y + dy)] = c

def skin_shading(px, hair, beard_layers=()):
    """sombra bajo el pelo, luz izq. / sombra der. en el borde de la cara"""
    skin = set('sltb')
    for (x, y), c in list(px.items()):
        if c != 's': continue
        if hair.get((x, y - 1)) in tuple('HJKYyXSsoCc') and (x, y - 1) in hair: px[(x, y)] = 't'
    for (x, y), c in list(px.items()):
        if c != 's': continue
        if x >= 24 and (x + 2, y) not in px: px[(x, y)] = 't'
        elif x < 24 and (x - 2, y) not in px and 24 <= y <= 36: px[(x, y)] = 'l'
        elif y >= 35 and (x, y + 2) not in px: px[(x, y)] = 't'
    return px

def extra_marks(cid, px):
    if cid == 'guia':   # barba de tres dias (puntitos) + cicatriz
        for y in range(29, 39):
            for x in range(10, 38):
                if px.get((x, y)) in ('s', 't', 'l') and (x + 2 * y) % 4 == 0 and not (18 <= x <= 29 and 32 <= y <= 36) and not (21 <= x <= 26 and y < 31):
                    if y >= 36 or x < 18 or x > 29 or y <= 31: px[(x, y)] = 'Z'
    return px

def render_layers(cid, ex, fr):
    c = CH[cid]; pal = c['pal']
    hair = mirror(parse_half(c['hair'])); body = mirror(parse_half(c['body']))
    for t, ox, oy in c['asym']:
        if cid == 'guia' and oy == 43: continue_ = None
        put(hair if oy < 30 else body, parse_full(t, ox, oy))
    # cabeza
    headpx = {k: v for k, v in mirror(HEAD).items() if k[1] < NECK_Y}
    neck = {k: v for k, v in mirror(HEAD).items() if k[1] >= NECK_Y}
    # en el nivel 'hair' van tambien barba/pelo largo; ropa (body) debajo
    px = dict(headpx); skin_shading(px, {k: v for k, v in hair.items() if k[1] < 24}); extra_marks(cid, px)
    for k in [k for k in px if k[1] > 28 and px[k] in 'st' and False]: pass
    # nariz y mejillas
    for p in ((23, 28), (24, 28), (24, 29)): px[p] = 'n'
    if ex in ('feliz', 'neutral', 'triste', 'preocupado'):
        for p in ((13, 31), (14, 31), (14, 32), (15, 32), (33, 31), (34, 31), (33, 32), (32, 32)): px[p] = 'b' if ex != 'feliz' or True else 's'
    if ex == 'feliz':
        for p in ((12, 31), (35, 31), (13, 32), (34, 32)): px[p] = 'b'
    put(px, hair)
    # ojos / cejas / boca
    blink = fr == 3
    en, ey = EYES[ex]
    if blink: en, ey = 'blink', 26
    eye = parse_full(EYE[en], 15, ey)
    for (x, y), ch in list(eye.items()): px[(x, y)] = ch; px[(47 - x, y)] = ch
    if ex == 'sorprendido' and not blink: pass
    bt, by = BROW[ex]
    for (x, y), ch in parse_full(bt, 15, by).items(): px[(x, y)] = ch; px[(47 - x, y)] = ch
    if cid == 'medica':
        for x in range(16, 21): 
            if (x + 1) % 2: px[(x, 30)] = 'q'; px[(47 - x, 30)] = 'q'
    if cid == 'guia':
        for p in ((17, 15), (16, 16), (16, 17), (15, 18), (16, 19)): pass
        for p in ((18, 17), (17, 18), (17, 19), (16, 20), (16, 21)): px[p] = 'z'   # cicatriz en la ceja izq.
    mi = 0 if fr in (0, 3) else fr
    mt = MOUTH[ex][mi]; mw = max(len(l) for l in mt.strip().splitlines())
    my = 33 if cid == 'ing' else 32
    for (x, y), ch in parse_full(mt, 24 - mw // 2, my).items(): px[(x, y)] = ch
    if cid == 'ing':   # mostacho sobre la boca y barbilla por encima de la expresion
        for (x, y), ch in hair.items():
            if y in (30, 31) and ch in 'GgxCo' and 16 <= x <= 31: px[(x, y)] = ch
    if ex == 'preocupado': 
        for p in ((35, 15), (35, 16), (34, 17)): px[p] = 'N'; px[(36, 17)] = 'N'
    if ex == 'triste':
        for yy in range(30, 36): px[(17, yy)] = 'N'; 
        px[(30, 30)] = 'N'; px[(30, 31)] = 'N'
    if ex == 'enfadado':
        for p in ((34, 14), (35, 15), (36, 14), (35, 13)): px[p] = 'z'
    return body, neck, px

def to_img(layers, pal, dy=0, gray=False):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); body, neck, head = layers
    P = img.load()
    for lay, d in ((body, 0), (neck, 0), (head, dy)):
        for (x, y), c in lay.items():
            if 0 <= x < S and 0 <= y + d < S:
                col = pal.get(c) or pal.get(c.lower()) if c in pal or c.lower() in pal else None
                if c == 'r' and 'r2' in pal and False: col = pal['r2']
                if col: P[x, y + d] = col
    return img

def pal_for(cid):
    p = dict(CH[cid]['pal'])
    if 'r2' in p: p['r'] = p['r2'] if False else p['r']
    return p

def gray(img):
    o = img.copy(); P = o.load()
    for y in range(S):
        for x in range(S):
            r, g, b, a = P[x, y]
            if a:
                l = int(.3 * r + .59 * g + .11 * b); l = int(l * .8 + 20)
                P[x, y] = (int(l * .78 + 14), int(l * .88 + 22), int(l * 1.0 + 40), 255)
    return o

def face(cid, ex, fr):
    body, neck, px = render_layers(cid, ex, fr)
    return to_img((body, neck, px), CH[cid]['pal'], dy=1 if fr == 2 else 0)

def gen(preview=True):
    import json
    meta = {}
    for cid in CH:
        sh = Image.new('RGBA', (S * 4, S * 6), (0, 0, 0, 0))
        for r, ex in enumerate(EXPR):
            for f in range(4): sh.alpha_composite(face(cid, ex, f), (f * S, r * S))
        sh.save(f'{OUT}/face_{cid}.png')
        gray(face(cid, 'neutral', 3)).save(f'{OUT}/face_{cid}_dead.png')
        meta[f'face_{cid}'] = dict(w=S * 4, h=S * 6, fw=S, fh=S, cols=4, rows=6, expressions=EXPR, frames=FRAMES, bg=CH[cid]['bg'], name=CH[cid]['name'],
            note='v8 Celeste: filas=expresion, cols=[closed,talk1,talk2,blink]; fondo transparente, color de recuadro en meta.bg')
        meta[f'face_{cid}_dead'] = dict(w=S, h=S, note='v8 gris frio, ojos cerrados')
    # marco 9-slice 16x16 (slice=5): borde oscuro + borde claro + filete, centro transparente
    fr = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); P = fr.load()
    cols = [hx('#120c1a'), hx('#120c1a'), hx('#f6efe0'), hx('#f6efe0'), hx('#8a7ea8')]
    for i, c in enumerate(cols):
        for k in range(i, 16 - i):
            for (x, y) in ((k, i), (k, 15 - i), (i, k), (15 - i, k)): P[x, y] = c
    fr.save(f'{OUT}/face_frame.png')
    meta['face_frame'] = dict(w=16, h=16, slice=5, note='v8 9-slice: oscuro 2px, claro 2px, filete lila 1px; centro transparente (poner meta.bg del retrato detras)')
    if preview:
        sc = 4; W = S * 4 * sc; H = S * 6 * sc; sheet = Image.new('RGB', (W * 4 + 30, H + 10), (20, 16, 26))
        for i, cid in enumerate(CH):
            t = Image.new('RGBA', (S * 4, S * 6), hx(CH[cid]['bg'])); t.alpha_composite(Image.open(f'{OUT}/face_{cid}.png'))
            sheet.paste(t.convert('RGB').resize((W, H), Image.NEAREST), (5 + i * (W + 6), 5))
        sheet.save(f'{OUT}/../preview_cast8.png')
    return meta

if __name__ == '__main__':
    m = gen(); print(list(m))
