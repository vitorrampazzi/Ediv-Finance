"""Gera o diagrama do modelo lógico (SVG) a partir dos metadados do Oracle.

Notação: pé de galinha (Engenharia da Informação).
  lado pai  : ||  exatamente um  ·  o|  zero ou um (FK opcional)
  lado filho: o<  zero ou muitos
"""
import math
import os
import sys
from html import escape

from PIL import ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta  # noqa: E402

FONT_SANS = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
FONT_SANS_SB = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
FONT_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf"

W = 270          # largura das caixas
HH = 26          # altura do cabeçalho
R = 17           # altura de cada coluna
PAD = 5          # respiro acima/abaixo das colunas

INK = "#1f2430"
MUTED = "#6b7280"
LINE = "#3d4656"
HEAD = {  # cor do cabeçalho por bloco
    "rede": "#1e4e8c",
    "info": "#a3214f",
    "pass": "#0f6b5c",
}
BLOCO = {
    "T_EC_OPERADORA": "rede", "T_EC_LINHA": "rede", "T_EC_ESTACAO": "rede", "T_EC_LINHA_ESTACAO": "rede",
    "T_EC_TIPO_OCORRENCIA": "info", "T_EC_OCORRENCIA": "info", "T_EC_CONFIRMACAO": "info",
    "T_EC_REGISTRO_LOTACAO": "info",
    "T_EC_USUARIO": "pass", "T_EC_TRAJETO": "pass", "T_EC_ALERTA": "pass",
}

POS = {
    "T_EC_TRAJETO": (680, 20),
    "T_EC_ALERTA": (1010, 200),
    "T_EC_TIPO_OCORRENCIA": (350, 250),
    "T_EC_OCORRENCIA": (680, 240),
    "T_EC_USUARIO": (20, 330),
    "T_EC_ESTACAO": (1340, 300),
    "T_EC_CONFIRMACAO": (350, 525),
    "T_EC_LINHA": (680, 555),
    "T_EC_LINHA_ESTACAO": (1010, 570),
    "T_EC_OPERADORA": (350, 665),
    "T_EC_REGISTRO_LOTACAO": (680, 775),
}
CANVAS = (1660, 950)
LEGEND = (1010, 712, 600, 128)

M = meta.load()
TABLES = M["tables"]


def box(t):
    x, y = POS[t]
    n = len(TABLES[t]["columns"])
    return x, y, W, HH + PAD + n * R + PAD


def row_y(t, col):
    x, y = POS[t]
    for i, c in enumerate(TABLES[t]["columns"]):
        if c["name"] == col:
            return y + HH + PAD + i * R + R / 2
    raise KeyError(col)


# Rotas: (pai, filho, coluna FK, [pontos do pai até o filho], rótulo, (x, y) do rótulo)
def routes():
    rt = []
    # rede
    rt.append(("T_EC_OPERADORA", "T_EC_LINHA", "id_operadora",
               [(620, 740), (720, 740), (720, 693)], "opera", (640, 733)))
    rt.append(("T_EC_LINHA", "T_EC_LINHA_ESTACAO", "id_linha",
               [(950, row_y("T_EC_LINHA_ESTACAO", "id_linha")), (1010, row_y("T_EC_LINHA_ESTACAO", "id_linha"))],
               "passa por", (980, 600)))
    y3 = row_y("T_EC_LINHA_ESTACAO", "id_estacao")
    rt.append(("T_EC_ESTACAO", "T_EC_LINHA_ESTACAO", "id_estacao",
               [(1440, 438), (1440, y3), (1280, y3)], "atendida por", (1360, y3 - 7)))
    # ocorrências
    y4 = row_y("T_EC_OCORRENCIA", "id_tipo_ocorrencia")
    rt.append(("T_EC_TIPO_OCORRENCIA", "T_EC_OCORRENCIA", "id_tipo_ocorrencia",
               [(620, y4), (680, y4)], "classifica", (650, y4 - 7)))
    rt.append(("T_EC_LINHA", "T_EC_OCORRENCIA", "id_linha",
               [(815, 555), (815, 463)], "afetada por", (822, 512)))
    rt.append(("T_EC_ESTACAO", "T_EC_OCORRENCIA", "id_estacao",
               [(1340, 400), (950, 400)], "local de", (1145, 393)))
    rt.append(("T_EC_USUARIO", "T_EC_OCORRENCIA", "id_usuario",
               [(290, 430), (680, 430)], "relata", (485, 423)))
    yc0 = row_y("T_EC_CONFIRMACAO", "id_ocorrencia")
    rt.append(("T_EC_OCORRENCIA", "T_EC_CONFIRMACAO", "id_ocorrencia",
               [(680, 450), (655, 450), (655, yc0), (620, yc0)], "recebe", (662, 510)))
    yc1 = row_y("T_EC_CONFIRMACAO", "id_usuario")
    rt.append(("T_EC_USUARIO", "T_EC_CONFIRMACAO", "id_usuario",
               [(230, 468), (230, yc1), (350, yc1)], "confirma", (290, yc1 - 7)))
    # lotação
    yr1 = row_y("T_EC_REGISTRO_LOTACAO", "id_usuario")
    rt.append(("T_EC_USUARIO", "T_EC_REGISTRO_LOTACAO", "id_usuario",
               [(100, 468), (100, yr1), (680, yr1)], "informa lotação", (390, yr1 - 7)))
    rt.append(("T_EC_LINHA", "T_EC_REGISTRO_LOTACAO", "id_linha",
               [(815, 693), (815, 775)], "lotação na linha", (822, 737)))
    yr3 = row_y("T_EC_REGISTRO_LOTACAO", "id_estacao")
    rt.append(("T_EC_ESTACAO", "T_EC_REGISTRO_LOTACAO", "id_estacao",
               [(1610, 400), (1640, 400), (1640, yr3), (950, yr3)], "lotação na estação", (1300, yr3 - 7)))
    # passageiro
    yt1 = row_y("T_EC_TRAJETO", "id_usuario")
    rt.append(("T_EC_USUARIO", "T_EC_TRAJETO", "id_usuario",
               [(200, 330), (200, yt1), (680, yt1)], "salva", (440, yt1 - 7)))
    yo = row_y("T_EC_TRAJETO", "id_estacao_origem")
    rt.append(("T_EC_ESTACAO", "T_EC_TRAJETO", "id_estacao_origem",
               [(1500, 300), (1500, yo), (950, yo)], "origem", (1225, yo - 7)))
    yd = row_y("T_EC_TRAJETO", "id_estacao_destino")
    rt.append(("T_EC_ESTACAO", "T_EC_TRAJETO", "id_estacao_destino",
               [(1460, 300), (1460, yd), (950, yd)], "destino", (1225, yd + 13)))
    ya0 = row_y("T_EC_ALERTA", "id_trajeto")
    rt.append(("T_EC_TRAJETO", "T_EC_ALERTA", "id_trajeto",
               [(950, 160), (980, 160), (980, ya0), (1010, ya0)], "recebe", (986, 200)))
    ya1 = row_y("T_EC_ALERTA", "id_ocorrencia")
    rt.append(("T_EC_OCORRENCIA", "T_EC_ALERTA", "id_ocorrencia",
               [(950, ya1), (1010, ya1)], "gera", (980, ya1 + 13)))
    return rt


_fonts = {}


def text_w(s, size, font=FONT_SANS):
    key = (font, size)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(font, size)
    return _fonts[key].getlength(s)


def unit(ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    d = math.hypot(dx, dy) or 1
    return dx / d, dy / d


def marker_parent(px, py, ux, uy, optional):
    """Extremidade do pai. (ux, uy) aponta da linha para dentro da caixa."""
    nx, ny = -uy, ux
    out = []
    for dist in ([6, 11] if not optional else [6]):
        cx, cy = px - ux * dist, py - uy * dist
        out.append(f'<line x1="{cx - nx * 6:.1f}" y1="{cy - ny * 6:.1f}" x2="{cx + nx * 6:.1f}" y2="{cy + ny * 6:.1f}"/>')
    if optional:
        cx, cy = px - ux * 15, py - uy * 15
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="4" fill="#fff"/>')
    return out


def marker_child(px, py, ux, uy):
    """Extremidade do filho: zero ou muitos (o<)."""
    nx, ny = -uy, ux
    bx, by = px - ux * 11, py - uy * 11
    out = [
        f'<line x1="{bx:.1f}" y1="{by:.1f}" x2="{px + nx * 7:.1f}" y2="{py + ny * 7:.1f}"/>',
        f'<line x1="{bx:.1f}" y1="{by:.1f}" x2="{px - nx * 7:.1f}" y2="{py - ny * 7:.1f}"/>',
        f'<line x1="{bx:.1f}" y1="{by:.1f}" x2="{px:.1f}" y2="{py:.1f}"/>',
    ]
    cx, cy = px - ux * 17, py - uy * 17
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="4" fill="#fff"/>')
    return out


def badge(c):
    if c["pk"] and c["fk"]:
        return "PF", "#7a4e00", "#fde7b0"
    if c["pk"]:
        return "PK", "#7a4e00", "#fde7b0"
    if c["fk"]:
        return "FK", "#1e4e8c", "#dbe7f7"
    if c["uk"]:
        return "UK", "#0f6b5c", "#d5efe9"
    return None


def render_table(t):
    x, y, w, h = box(t)
    color = HEAD[BLOCO[t]]
    s = [f'<g class="tbl" id="{t}">',
         f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="#ffffff" stroke="{color}" stroke-width="1.4"/>',
         f'<path d="M{x},{y + 6} a6,6 0 0 1 6,-6 h{w - 12} a6,6 0 0 1 6,6 v{HH - 6} h-{w} z" fill="{color}"/>',
         f'<text x="{x + 10}" y="{y + 17.5}" class="th">{escape(t)}</text>']
    for i, c in enumerate(TABLES[t]["columns"]):
        cy = y + HH + PAD + i * R
        mid = cy + R / 2
        if i % 2 == 1:
            s.append(f'<rect x="{x + 1}" y="{cy}" width="{w - 2}" height="{R}" fill="#f4f6f9"/>')
        b = badge(c)
        if b:
            label, fg, bg = b
            s.append(f'<rect x="{x + 7}" y="{mid - 6.5}" width="21" height="13" rx="3" fill="{bg}"/>')
            s.append(f'<text x="{x + 17.5}" y="{mid + 3.3}" class="bd" fill="{fg}" text-anchor="middle">{label}</text>')
        cls = "cn opt" if c["nullable"] else "cn"
        s.append(f'<text x="{x + 34}" y="{mid + 3.8}" class="{cls}">{escape(c["name"])}</text>')
        s.append(f'<text x="{x + w - 22}" y="{mid + 3.6}" class="ct" text-anchor="end">{escape(c["type"])}</text>')
        if c["nullable"]:
            s.append(f'<circle cx="{x + w - 11}" cy="{mid}" r="3" fill="none" stroke="{MUTED}" stroke-width="1"/>')
        else:
            s.append(f'<circle cx="{x + w - 11}" cy="{mid}" r="3" fill="{INK}"/>')
        # aviso se o texto não couber
        need = 34 + text_w(c["name"], 11) + 12 + text_w(c["type"], 10, FONT_MONO) + 22
        if need > w:
            print(f"AVISO: {t}.{c['name']} não cabe ({need:.0f}px)", file=sys.stderr)
    s.append("</g>")
    return s


def render_legend():
    x, y, w, h = LEGEND
    s = [f'<g class="legend"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="#fafbfc" stroke="#d6dae1"/>',
         f'<text x="{x + 14}" y="{y + 22}" class="lt">Legenda</text>']
    # chaves
    items = [("PK", "#7a4e00", "#fde7b0", "chave primária"), ("FK", "#1e4e8c", "#dbe7f7", "chave estrangeira"),
             ("PF", "#7a4e00", "#fde7b0", "primária e estrangeira"), ("UK", "#0f6b5c", "#d5efe9", "chave única")]
    for i, (lb, fg, bg, txt) in enumerate(items):
        cx = x + 14 + (i % 2) * 150
        cy = y + 44 + (i // 2) * 22
        s.append(f'<rect x="{cx}" y="{cy - 6.5}" width="21" height="13" rx="3" fill="{bg}"/>')
        s.append(f'<text x="{cx + 10.5}" y="{cy + 3.3}" class="bd" fill="{fg}" text-anchor="middle">{lb}</text>')
        s.append(f'<text x="{cx + 28}" y="{cy + 4}" class="lg">{txt}</text>')
    s.append(f'<circle cx="{x + 20}" cy="{y + 92}" r="3" fill="{INK}"/>')
    s.append(f'<text x="{x + 30}" y="{y + 96}" class="lg">obrigatória (NOT NULL)</text>')
    s.append(f'<circle cx="{x + 170}" cy="{y + 92}" r="3" fill="none" stroke="{MUTED}"/>')
    s.append(f'<text x="{x + 180}" y="{y + 96}" class="lg">opcional</text>')
    # cardinalidades
    lx = x + 330
    s.append(f'<g stroke="{LINE}" stroke-width="1.3" fill="none">')
    s.append(f'<line x1="{lx}" y1="{y + 44}" x2="{lx + 46}" y2="{y + 44}"/>')
    s += marker_parent(lx, y + 44, -1, 0, False)
    s.append(f'<line x1="{lx}" y1="{y + 70}" x2="{lx + 46}" y2="{y + 70}"/>')
    s += marker_parent(lx, y + 70, -1, 0, True)
    s.append(f'<line x1="{lx}" y1="{y + 96}" x2="{lx + 46}" y2="{y + 96}"/>')
    s += marker_child(lx, y + 96, -1, 0)
    s.append("</g>")
    s.append(f'<text x="{lx + 56}" y="{y + 48}" class="lg">exatamente um (1)</text>')
    s.append(f'<text x="{lx + 56}" y="{y + 74}" class="lg">zero ou um (0..1)</text>')
    s.append(f'<text x="{lx + 56}" y="{y + 100}" class="lg">zero ou muitos (0..N)</text>')
    s.append(f'<text x="{x + 14}" y="{y + h - 10}" class="ln">Cores: azul = rede · vinho = informação em tempo real · verde = passageiro</text>')
    s.append("</g>")
    return s


def render():
    cw, ch = CANVAS
    css = f"""
    .th {{ font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 600; fill: #ffffff; }}
    .cn {{ font-family: Inter, sans-serif; font-size: 11px; font-weight: 400; fill: {INK}; }}
    .opt {{ fill: {MUTED}; font-style: italic; }}
    .ct {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 400; fill: #4b5563; }}
    .bd {{ font-family: Inter, sans-serif; font-size: 8px; font-weight: 700; }}
    .rl {{ font-family: Inter, sans-serif; font-size: 10px; font-style: italic; font-weight: 400; fill: #4b5563; }}
    .halo {{ fill: #ffffff; stroke: #ffffff; stroke-width: 3.5px; stroke-linejoin: round; }}
    .lt {{ font-family: Inter, sans-serif; font-size: 12px; font-weight: 600; fill: {INK}; }}
    .lg {{ font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 400; fill: {INK}; }}
    .ln {{ font-family: Inter, sans-serif; font-size: 10px; font-weight: 400; fill: {MUTED}; }}
    """
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}">',
         f"<style>{css}</style>",
         f'<rect width="{cw}" height="{ch}" fill="#ffffff"/>']
    fk_by = {(fk["child"], fk["columns"][0]): fk for fk in M["fks"]}
    drawn = set()
    lines, markers, labels = [], [], []
    for parent, child, col, pts, label, lpos in routes():
        fk = fk_by[(child, col)]
        assert fk["parent"] == parent, (parent, child, col)
        drawn.add(fk["name"])
        d = "M" + " L".join(f"{px:.1f},{py:.1f}" for px, py in pts)
        lines.append(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="6"/>')
        lines.append(f'<path d="{d}" fill="none" stroke="{LINE}" stroke-width="1.3"/>')
        # direção para dentro da caixa do pai (primeiro ponto) e do filho (último ponto)
        ux, uy = unit(pts[1][0], pts[1][1], pts[0][0], pts[0][1])
        markers += marker_parent(pts[0][0], pts[0][1], ux, uy, fk["optional"])
        ux, uy = unit(pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1])
        markers += marker_child(pts[-1][0], pts[-1][1], ux, uy)
        if label:
            labels.append(f'<text x="{lpos[0]}" y="{lpos[1]}" class="rl halo" text-anchor="middle">{escape(label)}</text>')
            labels.append(f'<text x="{lpos[0]}" y="{lpos[1]}" class="rl" text-anchor="middle">{escape(label)}</text>')
    missing = {fk["name"] for fk in M["fks"]} - drawn
    assert not missing, f"FKs sem rota: {missing}"
    s += lines
    s.append(f'<g stroke="{LINE}" stroke-width="1.3" fill="none">')
    s += markers
    s.append("</g>")
    for t in POS:
        s += render_table(t)
    s += labels
    s += render_legend()
    s.append("</svg>")
    return "\n".join(s)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "diagrama.svg")
    with open(out, "w", encoding="utf-8") as f:
        f.write(render())
    print("ok:", out)
