# -*- coding: utf-8 -*-
"""Catastro Íntimo — Lámina I.  Planta de conjunto: dos predios, seis ejes."""
import math, os
from reportlab.pdfgen import canvas as rlcanvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FDIR = ("/Users/a./Library/Application Support/Claude/local-agent-mode-sessions/"
        "skills-plugin/94b19e93-ed31-4d6a-bced-d48b072f16a3/"
        "52a21a56-fe4d-4a74-980c-bc71cdeb8a89/skills/canvas-design/canvas-fonts")
for alias, fn in [("Jura","Jura-Light.ttf"),("JuraM","Jura-Medium.ttf"),
                  ("Mono","GeistMono-Regular.ttf"),("MonoB","GeistMono-Bold.ttf"),
                  ("Display","Italiana-Regular.ttf")]:
    pdfmetrics.registerFont(TTFont(alias, os.path.join(FDIR, fn)))

# ─── paleta ────────────────────────────────────────────────────────────────
PAPER = HexColor("#EAE5DB")
INK   = HexColor("#1A1917")
GREY  = HexColor("#7B766B")
OCHRE = HexColor("#B0842C")

W, H = 842.0, 1191.0
OUT = "/Users/a./yod-despacho/design/Catastro-Intimo-Lamina-I.pdf"
c = rlcanvas.Canvas(OUT, pagesize=(W, H))
c.setTitle("Catastro Intimo - Lamina I")

# ─── retícula base ─────────────────────────────────────────────────────────
M, IBo = 62.0, 12.0
BX0, BY0, BX1, BY1 = M, M, W-M, H-M
IX0, IY0, IX1, IY1 = M+IBo, M+IBo, W-M-IBo, H-M-IBo
CX0, CX1 = 112.0, 730.0                     # franja de contenido
PW, GUT  = 254.0, 110.0
P1 = (CX0, CX0+PW)                          # predio I
P2 = (CX1-PW, CX1)                          # predio II
PY1, PY0 = 1020.0, 692.0
BAND = (PY1-PY0)/3.0
EJES = [("A","OPERACIÓN INTERNA"), ("B","OPERACIÓN CON CLIENTES"), ("C","NUEVOS CLIENTES")]
EJEY = [PY1 - BAND*(i+0.5) for i in range(3)]
# ─── las cifras se LEEN, no se escriben ────────────────────────────────────
# 14-sep-2026: esta lámina salió con tres de seis cifras inventadas para que el
# dibujo quedara balanceado (B-fb6bf79c). Una cifra falsa en una pieza que se ve
# bien es peor que ninguna: se ve autorizada. Ahora los conteos salen del Sheet
# por board.bajar(); si el tablero no contesta, la lámina NO se dibuja —antes de
# rellenar un hueco, se levanta la mano.
import sys, unicodedata
sys.path.insert(0, os.path.expanduser("~/.claudet"))

def _sa(x):
    x = unicodedata.normalize("NFD", str(x or "")).encode("ascii", "ignore").decode()
    return " ".join(x.lower().split())

def _carril(proyecto, mapa):
    n = _sa(proyecto)
    if any(_sa(x) == n for x in mapa["proyectos"]): return "B"
    if any(_sa(x) == n for x in mapa["nuevos"]):    return "C"
    if "cliente" in n:                               return "C"
    return "A"

def leer_cuenta():
    """{(predio, crujía): abiertas}. Abiertas = viva y NO en pausa —proyecto
    congelado o estado «En standby»— que es como las cuenta El Despacho."""
    import board
    MAPA = {"proyectos": ["Casa Alysa", "Casa María", "Casa Maria",
                          "Real de Miramar Guaymas", "RNM"],
            "nuevos":    ["La Cercada", "Torre Ruiseñor", "Gym ECOS", "Depas Guaymas"]}
    CONGELADOS = {"la cercada"}
    filas = board.bajar(guardar=False)
    if not filas:
        raise SystemExit("El tablero contestó vacío: no dibujo una lámina en ceros.")
    out = {}
    for r in filas:
        if str(r.get("borrada", "")).upper() == "TRUE":   continue
        if str(r.get("archivada", "")).upper() == "TRUE": continue
        if _sa(r.get("estado")) == "terminado":           continue
        if _sa(r.get("proyecto")) in CONGELADOS:          continue
        if _sa(r.get("estado")) == "en standby":          continue
        predio = "I" if "aurum" in _sa(r.get("empresa")) else "II"
        out[(predio, _carril(r.get("proyecto"), MAPA))] = \
            out.get((predio, _carril(r.get("proyecto"), MAPA)), 0) + 1
    for pr in ("I", "II"):
        for cr in "ABC":
            out.setdefault((pr, cr), 0)
    return out

CUENTA = leer_cuenta()
TOTAL  = sum(CUENTA.values())
print("  leído del tablero:", " ".join("%s-%s=%d" % (a, b, CUENTA[(a, b)])
      for a in ("I", "II") for b in "ABC"), "| total", TOTAL)
RMARCA = 5.6

# ─── utilidades ────────────────────────────────────────────────────────────
def tw(s, font, size, track=0.0):
    return c.stringWidth(s, font, size) + track*max(0, len(s)-1)

def tx(x, y, s, font, size, track=0.0, color=INK, align="l", alpha=1.0, rot=None):
    c.saveState()
    c.setFillColor(color); c.setFillAlpha(alpha)
    wdt = tw(s, font, size, track)
    if rot is not None:
        c.translate(x, y); c.rotate(rot); x, y = 0.0, 0.0
    if align == "c": x -= wdt/2.0
    elif align == "r": x -= wdt
    t = c.beginText(x, y); t.setFont(font, size)
    t.setCharSpace(track); t.textOut(s)
    c.drawText(t)
    c.restoreState()

def line(x0,y0,x1,y1,wd=0.4,color=INK,alpha=1.0,dash=None):
    c.saveState(); c.setLineWidth(wd); c.setStrokeColor(color); c.setStrokeAlpha(alpha)
    c.setLineCap(0)
    if dash: c.setDash(dash)
    c.line(x0,y0,x1,y1); c.restoreState()

def circ(x,y,r,wd=0.45,color=INK,alpha=1.0,fill=None,falpha=1.0):
    c.saveState(); c.setLineWidth(wd); c.setStrokeColor(color); c.setStrokeAlpha(alpha)
    if fill is not None:
        c.setFillColor(fill); c.setFillAlpha(falpha)
    c.circle(x,y,r,stroke=1,fill=1 if fill is not None else 0); c.restoreState()

def rect(x,y,w,h,wd=0.45,color=INK,alpha=1.0):
    c.saveState(); c.setLineWidth(wd); c.setStrokeColor(color); c.setStrokeAlpha(alpha)
    c.rect(x,y,w,h,stroke=1,fill=0); c.restoreState()

# ═══ 1 · fondo, retícula de puntos, marco, ticks ═══════════════════════════
c.setFillColor(PAPER); c.rect(0,0,W,H,stroke=0,fill=1)

c.saveState(); c.setFillColor(INK); c.setFillAlpha(0.072)
step = 14.0
gy = IY0 + step
while gy < IY1:
    gx = IX0 + step
    while gx < IX1:
        c.circle(gx, gy, 0.34, stroke=0, fill=1); gx += step
    gy += step
c.restoreState()

rect(BX0, BY0, BX1-BX0, BY1-BY0, wd=0.9, alpha=0.9)
rect(IX0, IY0, IX1-IX0, IY1-IY0, wd=0.3, alpha=0.55)

# ticks de regla sobre el marco interior
def ticks(horizontal, base, inward):
    span0, span1 = (IX0, IX1) if horizontal else (IY0, IY1)
    n, k = 0, span0
    while k <= span1 + 0.01:
        L = 6.0 if n % 5 == 0 else 3.5
        if horizontal: line(k, base, k, base+inward*L, wd=0.3, alpha=0.30)
        else:          line(base, k, base+inward*L, k, wd=0.3, alpha=0.30)
        k += 14.0; n += 1
ticks(True,  IY1,  -1); ticks(True,  IY0,  1)
ticks(False, IX0,   1); ticks(False, IX1, -1)

for (cx, cy) in [(94,94),(748,94),(94,1097),(748,1097)]:
    line(cx-5, cy, cx+5, cy, wd=0.35, alpha=0.5)
    line(cx, cy-5, cx, cy+5, wd=0.35, alpha=0.5)

# ═══ 2 · encabezado ════════════════════════════════════════════════════════
tx(CX0, 1090, "CATASTRO ÍNTIMO", "Jura", 10.5, 5.0, INK)
tx(CX1, 1090, "SERIE I — LÁMINA ÚNICA", "Mono", 6.0, 1.7, GREY, align="r")
line(CX0, 1076, CX1, 1076, wd=0.7)
tx(CX0, 1062, ("PLANTA DE CONJUNTO · DOS PREDIOS · SEIS EJES · %d MARCAS" % TOTAL),
   "Mono", 5.6, 1.4, GREY, alpha=0.95)

# ═══ 3 · el tejido del intersticio (se dibuja antes que los predios) ═══════
GL, GR = P1[1], P2[0]
NODES = 21
ys = [PY0 + (PY1-PY0)*i/(NODES-1.0) for i in range(NODES)]
c.saveState(); c.setStrokeColor(INK)
for i in range(NODES):
    for j in range(NODES):
        d, sm = (i - j) % 4, (i + j) % 4
        if d != 0 and sm != 0:
            continue
        y0, y1 = ys[i], ys[j]
        sag = 0.9 + abs(y1-y0)*0.004
        c.setLineWidth(0.16 if d == 0 else 0.12)
        c.setStrokeAlpha(0.29 if d == 0 else 0.155)
        p = c.beginPath()
        p.moveTo(GL, y0)
        p.curveTo(GL+(GR-GL)*0.33, (y0*0.67+y1*0.33)-sag,
                  GL+(GR-GL)*0.67, (y0*0.33+y1*0.67)-sag, GR, y1)
        c.drawPath(p, stroke=1, fill=0)
c.restoreState()
for yy in ys:                        # amarres del tejido al muro
    for xx in (GL, GR):
        circ(xx, yy, 0.8, wd=0, fill=INK, falpha=0.34)
for ey in EJEY:                      # los seis amarres del tejido a los ejes
    for xx in (GL, GR):
        circ(xx, ey, 1.5, wd=0, fill=INK, falpha=0.85)

# ═══ 4 · los dos predios ═══════════════════════════════════════════════════
def hatch_perimeter(x0, x1):
    """orla de 45° en la franja perimetral: notación de polígono levantado."""
    band = 7.0
    c.saveState(); c.setStrokeColor(INK); c.setStrokeAlpha(0.11); c.setLineWidth(0.3)
    p = c.beginPath()
    p.rect(x0, PY0, x1-x0, PY1-PY0)
    p.rect(x0+band, PY0+band, (x1-x0)-2*band, (PY1-PY0)-2*band)
    c.clipPath(p, stroke=0, fill=0)
    k = x0 - (PY1-PY0)
    while k < x1 + (PY1-PY0):
        c.line(k, PY0, k+(PY1-PY0), PY1); k += 5.0
    c.restoreState()

def predio(px, romano, titulo, sub, lado):
    x0, x1 = px
    hatch_perimeter(x0, x1)
    rect(x0, PY0, x1-x0, PY1-PY0, wd=0.75, alpha=0.9)
    for i in (1,2):
        line(x0, PY0+BAND*i, x1, PY0+BAND*i, wd=0.3, alpha=0.4, dash=[2,2.6])
    ax = CX0 if lado == "izq" else CX1
    al = "l" if lado == "izq" else "r"
    tx(ax, 1046, titulo, "Jura", 12.5, 5.2, INK, align=al)
    tx(ax, 1031, sub, "Mono", 5.6, 1.5, GREY, align=al)

    for i,(letra, nombre) in enumerate(EJES):
        ey = EJEY[i]
        n  = CUENTA[(romano, letra)]
        # eje dash-dot, con prolongación hacia el intersticio
        if lado == "izq": ex0, ex1 = x0-14.0, x1+11.0; mx = x0-27.0
        else:             ex0, ex1 = x0-11.0, x1+14.0; mx = x1+27.0
        line(ex0, ey, ex1, ey, wd=0.45, alpha=0.75, dash=[9,3,1.4,3])
        circ(mx, ey, 8.6, wd=0.6, color=INK, alpha=0.9, fill=PAPER, falpha=1.0)
        tx(mx, ey-3.0, letra, "JuraM", 8.2, 0.0, INK, align="c")

        # corrida de marcas, anclada al borde exterior del predio
        avail = (x1-16.0) - (x0+16.0)
        sp = min(avail/(n-1.0), 34.0) if n > 1 else 34.0
        if lado == "izq": xs = [x0+16.0 + sp*k for k in range(n)]
        else:             xs = [x1-16.0 - sp*k for k in range(n)]
        xs.sort()
        stagger = sp < 16.0
        for k, mxx in enumerate(xs):
            off = (7.0 if k % 2 == 0 else -7.0) if stagger else 0.0
            circ(mxx, ey+off, RMARCA, wd=0.5, color=INK, alpha=0.95,
                 fill=PAPER, falpha=1.0)
            if not stagger:
                tx(mxx, ey+off-1.9, "%02d" % (k+1), "Mono", 4.6, 0.0, INK,
                   align="c", alpha=0.85)

        # rótulo de crujía, al mismo borde que la corrida
        lx = x0+16.0 if lado == "izq" else x1-16.0
        la = "l" if lado == "izq" else "r"
        tx(lx, ey+19.0, letra+" · "+nombre, "Jura", 6.8, 2.6, INK, align=la, alpha=0.72)

        # Una crujía en cero NO se rellena ni se borra: se dibuja el hueco.
        # Es la regla que salió del B-fb6bf79c — si no hay qué medir, se dice.
        if not n:
            hx = x0+16.0 if lado == "izq" else x1-16.0
            hx2 = hx + (54.0 if lado == "izq" else -54.0)
            line(min(hx,hx2), ey-24.0, max(hx,hx2), ey-24.0,
                 wd=0.35, alpha=0.45, dash=[2.4,2.4])
            tx((hx+hx2)/2.0, ey-20.4, "00", "Mono", 6.4, 1.0,
               GREY, align="c", alpha=0.75)
            continue

        # Una sola marca no se acota: no hay distancia que medir. Se pone un
        # travesaño corto con su cifra, que es lo que hace un plano de verdad.
        if n == 1:
            m0 = xs[0]
            line(m0-15.0, ey-24.0, m0+15.0, ey-24.0, wd=0.35, alpha=0.85)
            for e in (m0-15.0, m0+15.0):
                line(e-2.2, ey-26.2, e+2.2, ey-21.8, wd=0.5, alpha=0.9)
            tx(m0, ey-20.4, "01", "Mono", 6.4, 1.0, OCHRE, align="c")
            continue

        # cota de la corrida
        cy = ey - (27.0 if stagger else 24.0)
        a, b = xs[0], xs[-1]
        line(a, cy, b, cy, wd=0.35, alpha=0.85)
        for e in (a, b):
            line(e-2.6, cy-2.6, e+2.6, cy+2.6, wd=0.5, alpha=0.9)
            line(e, cy-3.4, e, cy+3.4, wd=0.3, alpha=0.5)
        tx((a+b)/2.0, cy+5.0, "%02d" % n, "Mono", 6.4, 1.0, OCHRE, align="c")

predio(P1, "I",  "PREDIO I",  "POLÍGONO DE AUTOR",      "izq")
predio(P2, "II", "PREDIO II", "POLÍGONO DE CO-DESARROLLO", "der")

# ═══ 5 · cuadro de ejes ════════════════════════════════════════════════════
TX0, TX1 = CX0, 470.0
tx(TX0, 648, "CUADRO DE EJES", "Jura", 7.4, 3.4, INK)
line(TX0, 638, TX1, 638, wd=0.6)
hdr_y = 626
for lab, xx, al in [("EJE",TX0,"l"),("DENOMINACIÓN",TX0+44,"l"),
                    ("MARCAS",TX1-58,"r"),("DENS.",TX1,"r")]:
    tx(xx, hdr_y, lab, "Mono", 5.0, 1.3, GREY, align=al)
line(TX0, hdr_y-6, TX1, hdr_y-6, wd=0.25, alpha=0.5)
row_y = hdr_y - 20
RUN = (P1[1]-16.0) - (P1[0]+16.0)
for romano in ("I","II"):
    for letra, nombre in EJES:
        n = CUENTA[(romano, letra)]
        dens = n/RUN*100.0
        tx(TX0, row_y, romano+"-"+letra, "MonoB", 5.6, 0.8, INK)
        tx(TX0+44, row_y, nombre, "Jura", 7.0, 2.0, INK, alpha=0.9)
        tx(TX1-58, row_y, "%02d" % n, "Mono", 5.8, 0.8, INK, align="r")
        tx(TX1, row_y, "%0.2f" % dens, "Mono", 5.8, 0.8, INK, align="r", alpha=0.72)
        line(TX0, row_y-6.5, TX1, row_y-6.5, wd=0.2, alpha=0.32)
        row_y -= 19.0
tx(TX0, row_y-2, "SUMA", "Mono", 5.0, 1.3, GREY)
tx(TX1-58, row_y-2, "%02d" % TOTAL, "MonoB", 5.8, 0.8, INK, align="r")
tx(TX1, row_y-2, "%0.2f" % (TOTAL/(2.0*RUN)*100.0), "Mono", 5.8, 0.8, INK, align="r", alpha=0.72)
line(TX0, row_y-9, TX1, row_y-9, wd=0.6)

# ═══ 6 · signos ════════════════════════════════════════════════════════════
LX0, LX1 = 520.0, CX1
tx(LX0, 648, "SIGNOS", "Jura", 7.4, 3.4, INK)
line(LX0, 638, LX1, 638, wd=0.6)
sy = 612
def signo(draw, label):
    global sy
    draw(sy)
    tx(LX0+64, sy-2.2, label, "Jura", 6.6, 2.4, INK, alpha=0.92)
    sy -= 26.0
signo(lambda y: (circ(LX0+16, y, RMARCA, wd=0.5, fill=PAPER),
                 tx(LX0+16, y-1.9, "07", "Mono", 4.6, 0, INK, align="c", alpha=0.85)),
      "MARCA · UN PENDIENTE")
signo(lambda y: line(LX0+2, y, LX0+52, y, wd=0.45, alpha=0.75, dash=[9,3,1.4,3]),
      "EJE · UNA CRUJÍA")
signo(lambda y: (line(LX0+6, y, LX0+48, y, wd=0.35, alpha=0.85),
                 line(LX0+3.4, y-2.6, LX0+8.6, y+2.6, wd=0.5),
                 line(LX0+45.4, y-2.6, LX0+50.6, y+2.6, wd=0.5)),
      "COTA · LO QUE MIDE")
def _hilo(y):
    c.saveState(); c.setStrokeColor(INK); c.setLineWidth(0.16); c.setStrokeAlpha(0.55)
    for k in range(6):
        p = c.beginPath(); p.moveTo(LX0+4, y+7-k*2.8)
        p.curveTo(LX0+20, y+3-k*1.2, LX0+34, y-1+k*1.0, LX0+50, y-6+k*2.6)
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()
signo(_hilo, "HILO · LO QUE ATA")
def _predio_signo(y):
    c.saveState()
    pth = c.beginPath(); pth.rect(LX0+4, y-6, 46, 13)
    c.clipPath(pth, stroke=0, fill=0)
    c.setStrokeColor(INK); c.setStrokeAlpha(0.18); c.setLineWidth(0.3)
    for q in range(-13, 46, 5):
        c.line(LX0+4+q, y-6, LX0+4+q+13, y+7)
    c.restoreState()
    rect(LX0+4, y-6, 46, 13, wd=0.6, alpha=0.9)
signo(_predio_signo, "PREDIO · UNA CASA")

# ═══ 7 · registro de plazo ═════════════════════════════════════════════════
RB, NT = 414.0, 30
sp = (CX1-CX0)/(NT-1.0)
line(CX0-10, RB, CX1+10, RB, wd=0.45, alpha=0.8)
for k in range(NT):
    xx = CX0 + sp*k
    if k == 21:
        line(xx, RB, xx, RB+19, wd=0.9, color=OCHRE)
        circ(xx, RB+22.5, 2.0, wd=0, fill=OCHRE)
    else:
        line(xx, RB, xx, RB + (10.0 if k % 5 == 0 else 5.0), wd=0.3, alpha=0.7)
    if k % 10 == 0 or k == NT-1:
        tx(xx, RB-11.0, "%02d" % k, "Mono", 4.6, 0.6, GREY, align="c")
CB = RB + 32.0
line(CX0, CB, CX0+sp*21, CB, wd=0.3, alpha=0.8)
for e in (CX0, CX0+sp*21):
    line(e, CB-3.4, e, CB+3.4, wd=0.3, alpha=0.6)
    line(e-2.4, CB-2.4, e+2.4, CB+2.4, wd=0.45, alpha=0.9)
tx(CX0+sp*10.5, CB+4.6, "21 DÍAS", "Mono", 5.6, 1.4, OCHRE, align="c")
tx(CX1, CB+4.6, "PLAZO", "Jura", 6.8, 2.8, GREY, align="r")

# ═══ 8 · la frase ══════════════════════════════════════════════════════════
FRASE, TARGET = "TODO PENDIENTE OCUPA UN LUGAR", 468.0
def ajustar(txt, font, target, ratio=0.25):
    lo, hi = 8.0, 64.0
    for _ in range(46):
        mid = (lo+hi)/2.0
        if tw(txt, font, mid, mid*ratio) > target: hi = mid
        else: lo = mid
    return lo, lo*ratio
fs, ft = ajustar(FRASE, "Display", TARGET)
line(W/2.0-34, 300, W/2.0+34, 300, wd=0.5, alpha=0.9)
tx(W/2.0, 266, FRASE, "Display", fs, ft, INK, align="c")
tx(W/2.0, 244, "LEVANTAMIENTO DE LO QUE NO SE VE", "Mono", 5.4, 2.6, GREY, align="c")
print("  frase: %.1f pt, ancho %.1f (libre %.1f por lado)"
      % (fs, tw(FRASE,"Display",fs,ft), (W - tw(FRASE,"Display",fs,ft))/2.0 - 74))

# ═══ 9 · norte, escala y rótulo ════════════════════════════════════════════
NX, NY = 132.0, 160.0
c.saveState(); c.setFillColor(INK); c.setFillAlpha(0.92)
p = c.beginPath(); p.moveTo(NX, NY+20); p.lineTo(NX+5.2, NY-14); p.lineTo(NX, NY-8)
p.lineTo(NX-5.2, NY-14); p.close(); c.drawPath(p, stroke=0, fill=1); c.restoreState()
circ(NX, NY+3, 20.0, wd=0.3, alpha=0.45)
tx(NX, NY+27, "N", "Jura", 7.0, 0, INK, align="c")

EX0 = 196.0
line(EX0, NY-6, EX0+120, NY-6, wd=0.5)
for k in range(5):
    xx = EX0 + 30.0*k
    line(xx, NY-6, xx, NY-1, wd=0.35, alpha=0.8)
    tx(xx, NY+2.5, "%d" % k, "Mono", 4.4, 0.6, GREY, align="c")
c.saveState(); c.setFillColor(INK); c.setFillAlpha(0.85)
c.rect(EX0, NY-9.6, 30, 3.6, stroke=0, fill=1)
c.rect(EX0+60, NY-9.6, 30, 3.6, stroke=0, fill=1); c.restoreState()
tx(EX0, NY-20, "ESCALA GRÁFICA · UNIDAD = UNA SEMANA", "Mono", 4.6, 1.2, GREY)

RX, RY, RW, RH = 500.0, 100.0, 230.0, 88.0
rect(RX, RY, RW, RH, wd=0.7, alpha=0.9)
line(RX, RY+RH-30, RX+RW, RY+RH-30, wd=0.35, alpha=0.7)
line(RX, RY+28, RX+RW, RY+28, wd=0.35, alpha=0.7)
line(RX+RW*0.56, RY, RX+RW*0.56, RY+28, wd=0.35, alpha=0.7)
tx(RX+9, RY+RH-20, "CATASTRO ÍNTIMO", "Jura", 9.0, 4.2, INK)
tx(RX+RW-9, RY+RH-20, "I", "Display", 13.0, 0, OCHRE, align="r")
tx(RX+9, RY+RH-44, "PLANTA DE CONJUNTO", "Jura", 7.0, 2.4, INK, alpha=0.9)
tx(RX+9, RY+RH-56, "LEVANTADO DEL TABLERO — EN CURSO", "Mono", 5.0, 1.2, GREY)
tx(RX+9, RY+11, "ESC. 1:1   14·IX", "Mono", 5.2, 1.2, INK, alpha=0.9)
tx(RX+RW-9, RY+11, "LÁM. 01 / 01", "Mono", 5.2, 1.2, GREY, align="r")

c.showPage(); c.save()
print("ok ->", OUT)
