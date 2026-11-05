"""Monta o HTML do documento e gera o PDF com WeasyPrint."""
import html
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import content as C  # noqa: E402
import meta  # noqa: E402

M = meta.load()


def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[(\d)\]", r'<a class="cite" href="#ref-\1">[\1]</a>', t)
    return t


def table(spec):
    cols, rows = spec["cols"], spec["rows"]
    widths = spec.get("widths")
    align = spec.get("align", {})
    out = [f'<table class="tbl {spec.get("class", "")}">']
    if widths:
        out.append("<colgroup>" + "".join(f'<col style="width:{w}%">' for w in widths) + "</colgroup>")
    out.append("<thead><tr>" + "".join(
        f'<th class="{"r" if align.get(i) == "right" else ""}">{inline(c)}</th>' for i, c in enumerate(cols)) + "</tr></thead><tbody>")
    for r in rows:
        out.append("<tr>" + "".join(
            f'<td class="{"r" if align.get(i) == "right" else ""}">{inline(str(v))}</td>' for i, v in enumerate(r)) + "</tr>")
    out.append("</tbody></table>")
    if spec.get("caption"):
        out.append(f'<p class="tcap">{inline(spec["caption"])}</p>')
    return "\n".join(out)


def relations_table():
    fk_by = {(fk["child"], fk["columns"][0]): fk for fk in M["fks"]}
    rows = []
    for i, (parent, child, col, leitura) in enumerate(C.RELACOES, 1):
        fk = fk_by[(child, col)]
        assert fk["parent"] == parent
        card = "0..1 : N" if fk["optional"] else "1 : N"
        rows.append([str(i), f"`{parent.replace('T_EC_', '')}`", f"`{child.replace('T_EC_', '')}`",
                     f"**{card}**", f"`{fk['name'].lower()}`", leitura])
    assert len(rows) == len(M["fks"]) == 17
    return table({"cols": ["#", "Pai", "Filho", "Card.", "Chave estrangeira", "Leitura"],
                  "widths": [4, 12, 16, 8, 25, 35], "class": "rel", "rows": rows, "align": {0: "right"}})


def key_label(t, c):
    parts = []
    if c["pk"]:
        parts.append("PK")
    if c["fk"]:
        parts.append(f"FK → {c['fk'].replace('T_EC_', '')}")
    if c["uk"]:
        multi = any(c["name"] in u["columns"] and len(u["columns"]) > 1
                    for u in M["uniques"] if u["table"] == t)
        parts.append("UK (composta)" if multi else "UK")
    return " · ".join(parts)


def dictionary():
    out = []
    order = [t for _, t, _, _ in C.BLOCO_TABELA]
    for t in order:
        tb = M["tables"][t]
        rows = []
        for c in tb["columns"]:
            rows.append([f"`{c['name']}`", f"`{c['type']}`", "S" if c["nullable"] else "N",
                         key_label(t, c), C.DESC[t][c["name"]]])
        out.append(f'<div class="dict"><h3>{t}</h3><p class="dcom">{inline(tb["comment"])}</p>')
        out.append(table({"cols": ["Coluna", "Tipo", "Nulo", "Chave", "Descrição"],
                          "widths": [24, 16, 6, 18, 36], "class": "dic", "rows": rows}))
        out.append("</div>")
    # garante que toda coluna tem descrição
    for t, tb in M["tables"].items():
        for c in tb["columns"]:
            assert c["name"] in C.DESC[t], (t, c["name"])
    return "\n".join(out)


def cover():
    lines = [("#EE372F", 70), ("#0455A1", 120), ("#007E5E", 170), ("#FED304", 220)]
    deco = ['<svg class="deco" viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg">']
    for i, (color, y) in enumerate(lines):
        x0 = 0 if i % 2 == 0 else 60
        x1 = 800 if i % 2 == 0 else 740
        deco.append(f'<path d="M{x0},{y} L{x1},{y}" stroke="{color}" stroke-width="7" stroke-linecap="round"/>')
        for k, sx in enumerate(range(x0 + 70, x1 - 30, 110)):
            r = 9 if (k + i) % 3 == 0 else 6
            deco.append(f'<circle cx="{sx}" cy="{y}" r="{r}" fill="#fff" stroke="{color}" stroke-width="4"/>')
    deco.append("</svg>")
    members = "".join(f"<tr><td>{html.escape(n)}</td><td class='rm'>RM {html.escape(rm)}</td></tr>"
                      for n, rm in C.INTEGRANTES)
    return f"""
<section class="cover">
  <div class="stripes"><span style="background:#EE372F"></span><span style="background:#0455A1"></span><span style="background:#007E5E"></span><span style="background:#FED304"></span><span style="background:#01A9A7"></span><span style="background:#008B8B"></span></div>
  <div class="cv-top">
    <p class="cv-inst">{html.escape(C.COVER['inst'])}</p>
    <p class="cv-evt">{html.escape(C.COVER['evento'])}</p>
  </div>
  <div class="cv-mid">
    <p class="cv-disc">{html.escape(C.COVER['disciplina'])}</p>
    <div class="cv-title">{html.escape(C.COVER['titulo'])}</div>
    <p class="cv-sub">{html.escape(C.COVER['subtitulo'])}</p>
  </div>
  {''.join(deco)}
  <div class="cv-team">
    <p class="cv-label">Equipe</p>
    <p class="cv-team-name">{html.escape(C.EQUIPE)}</p>
    <p class="cv-label">Integrantes (ordem alfabética)</p>
    <table class="cv-members">{members}</table>
  </div>
  <p class="cv-date">{html.escape(C.DATA)}</p>
</section>"""


def toc(blocks):
    items = []
    for b in blocks:
        if b[0] in ("h1", "h2"):
            items.append((b[0], b[1], b[2]))
        elif b[0] == "figure":
            items.append(("h2", b[1]["id"], b[1]["title"]))
    lis = "".join(f'<li class="{lvl}"><a href="#{i}">{html.escape(t)}</a></li>' for lvl, i, t in items)
    return f'<section class="toc-page"><h1 class="toc-title">Sumário</h1><ul class="toc">{lis}</ul></section>'


def render_blocks(blocks, svg_name):
    out = []
    for b in blocks:
        kind = b[0]
        if kind == "h1":
            out.append(f'<h1 id="{b[1]}">{inline(b[2])}</h1>')
        elif kind == "h2":
            out.append(f'<h2 id="{b[1]}">{inline(b[2])}</h2>')
        elif kind == "p":
            out.append(f"<p>{inline(b[1])}</p>")
        elif kind == "callout":
            out.append(f'<div class="callout">{inline(b[1])}</div>')
        elif kind == "ul":
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in b[1]) + "</ul>")
        elif kind == "ol":
            out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in b[1]) + "</ol>")
        elif kind == "ficha":
            rows = "".join(f'<tr><th>{inline(k)}</th><td>{inline(v)}</td></tr>' for k, v in b[1])
            out.append(f'<table class="ficha">{rows}</table>')
        elif kind == "scope":
            t1, l1, t2, l2 = b[1]
            col = lambda t, l, cls: (f'<td class="{cls}"><p class="sc-t">{inline(t)}</p><ul>'  # noqa: E731
                                     + "".join(f"<li>{inline(x)}</li>" for x in l) + "</ul></td>")
            out.append(f'<table class="scope"><tr>{col(t1, l1, "in")}{col(t2, l2, "out")}</tr></table>')
        elif kind == "table":
            out.append(table(b[1]))
        elif kind == "relations":
            out.append(relations_table())
        elif kind == "dictionary":
            out.append(dictionary())
        elif kind == "sql":
            out.append(f'<pre class="sql">{html.escape(b[1])}</pre>')
        elif kind == "figure":
            f = b[1]
            out.append(f'</section><section class="diagram-page"><h2 id="{f["id"]}">{inline(f["title"])}</h2>'
                       f'<img src="{svg_name}" alt="Diagrama do modelo lógico">'
                       f'<p class="figcap">{inline(f["caption"])}</p></section><section class="main">')
        elif kind == "refs":
            out.append('<ol class="refs">' + "".join(
                f'<li id="ref-{i}">{inline(r)}</li>' for i, r in enumerate(b[1], 1)) + "</ol>")
        else:
            raise ValueError(kind)
    return "\n".join(out)


CSS = """
@page {
  size: A4;
  margin: 20mm 19mm 20mm 21mm;
  @bottom-left { content: "%FOOTER%"; font: 400 7.5pt Inter; color: #6b7280; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 500 7.5pt Inter; color: #6b7280; }
}
@page cover { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
@page diagrama {
  size: A3 landscape;
  margin: 13mm 15mm 14mm 15mm;
}
html { font-family: Inter, sans-serif; font-size: 9.6pt; line-height: 1.55; color: #1f2430; }
body { margin: 0; }
p { margin: 0 0 .62em; text-align: left; hyphens: manual; }
strong { font-weight: 600; }
code { font-family: 'JetBrains Mono', monospace; font-size: .86em; background: #f1f3f6; padding: .5px 3px; border-radius: 3px; color: #263044; }
a { color: inherit; text-decoration: none; }
a.cite { color: #a3214f; font-weight: 600; font-size: .9em; }

/* ---------- capa ---------- */
.cover { page: cover; height: 297mm; position: relative; padding: 0; }
.stripes { display: flex; height: 7mm; }
.stripes span { flex: 1; display: block; }
.cv-top { padding: 16mm 22mm 0; }
.cv-inst { font: 600 10pt Inter; letter-spacing: .14em; text-transform: uppercase; color: #a3214f; margin: 0 0 2mm; }
.cv-evt { font: 400 11pt Inter; color: #4b5563; margin: 0; }
.cv-mid { padding: 34mm 22mm 0; }
.cv-disc { display: inline-block; font: 600 9.5pt Inter; letter-spacing: .12em; text-transform: uppercase; color: #fff; background: #1e4e8c; padding: 1.6mm 3.4mm; border-radius: 1.2mm; margin: 0 0 7mm; }
.cv-title { font: 700 42pt/1.05 Inter; letter-spacing: -.02em; margin: 0 0 5mm; color: #141824; }
.cv-sub { font: 400 14pt/1.4 Inter; color: #374151; margin: 0; max-width: 150mm; }
.deco { display: block; width: 186mm; margin: 14mm 0 0 12mm; }
.cv-team { padding: 12mm 22mm 0; }
.cv-label { font: 600 8pt Inter; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; margin: 0 0 1.6mm; }
.cv-team-name { font: 600 13pt Inter; margin: 0 0 7mm; }
.cv-members { border-collapse: collapse; font-size: 11pt; }
.cv-members td { padding: 1.4mm 10mm 1.4mm 0; border-bottom: .3mm solid #e5e7eb; }
.cv-members td.rm { font-family: 'JetBrains Mono', monospace; font-size: 10pt; color: #374151; }
.cv-date { position: absolute; left: 22mm; bottom: 16mm; font: 500 10pt Inter; color: #4b5563; margin: 0; }

/* ---------- sumário ---------- */
.toc-page { break-after: page; }
.toc-title { font: 700 20pt Inter; margin: 0 0 8mm; }
ul.toc { list-style: none; padding: 0; margin: 0; }
ul.toc li { margin: 0; }
ul.toc li.h1 { font-weight: 600; margin-top: 4.5mm; font-size: 10.5pt; }
ul.toc li.h2 { padding-left: 7mm; margin-top: 1.4mm; color: #374151; }
ul.toc li a::after { content: leader('.') target-counter(attr(href), page); color: #6b7280; font-weight: 400; }

/* ---------- títulos ---------- */
h1 { font: 700 18pt/1.2 Inter; letter-spacing: -.01em; margin: 0 0 6mm; padding-bottom: 3mm; border-bottom: .6mm solid #a3214f; break-before: page; color: #141824; }
h2 { font: 600 12.5pt/1.3 Inter; color: #1e4e8c; margin: 7mm 0 2.6mm; break-after: avoid; }
h3 { font: 600 10.5pt Inter; margin: 6mm 0 .6mm; color: #141824; break-after: avoid; }
h1 + h2 { margin-top: 0; }

/* ---------- blocos ---------- */
ul, ol { margin: 0 0 .8em; padding-left: 5.5mm; }
li { margin-bottom: .35em; }
.callout { background: #fbf1f5; border-left: 1.2mm solid #a3214f; padding: 3.2mm 4mm; margin: 2mm 0 4mm; border-radius: 0 1.5mm 1.5mm 0; }
table.ficha { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 1mm 0 3mm; }
table.ficha th { width: 30%; text-align: left; vertical-align: top; font-weight: 600; background: #f3f5f8; padding: 2.2mm 3mm; border-bottom: .3mm solid #fff; color: #1e4e8c; }
table.ficha td { padding: 2.2mm 3mm; border-bottom: .3mm solid #e5e7eb; vertical-align: top; }
table.scope { width: 100%; border-collapse: separate; border-spacing: 3mm 0; margin: 0 -3mm 3mm; font-size: 9pt; }
table.scope td { vertical-align: top; width: 50%; padding: 3mm 3.5mm 1mm; border-radius: 1.5mm; }
table.scope td.in { background: #eef6f4; border-top: 1mm solid #0f6b5c; }
table.scope td.out { background: #f5f5f6; border-top: 1mm solid #9ca3af; }
.sc-t { font-weight: 600; margin-bottom: 2mm; }
table.scope ul { padding-left: 4.5mm; }

table.tbl { width: 100%; border-collapse: collapse; font-size: 8.4pt; line-height: 1.42; margin: 1.5mm 0 3.5mm; }
table.tbl th { background: #1e2a3d; color: #fff; font-weight: 600; text-align: left; padding: 1.8mm 2mm; vertical-align: bottom; }
table.tbl tr { break-inside: avoid; }
table.tbl td { padding: 1.6mm 2mm; border-bottom: .25mm solid #e3e6eb; vertical-align: top; }
table.tbl tbody tr:nth-child(even) td { background: #f7f8fa; }
table.tbl .r { text-align: right; }
table.tbl code { font-size: .92em; background: transparent; padding: 0; }
table.func td:first-child { color: #1e4e8c; }
table.func td:last-child code, table.files td:first-child code { display: inline-block; }
table.overview tbody tr:last-child td { border-top: .4mm solid #1e2a3d; background: #fff; }
table.result { font-size: 8pt; }
table.narrow { width: 70%; }
table.rel { font-size: 7.9pt; }
table.rel td:nth-child(4) { white-space: nowrap; }
table.dic { font-size: 7.9pt; margin-top: .5mm; }
table.dic td:nth-child(3) { text-align: center; }
p.tcap { font-size: 7.8pt; color: #6b7280; margin: -2mm 0 4mm; }
pre.sql { font-family: 'JetBrains Mono', monospace; font-size: 7.8pt; line-height: 1.5; background: #f6f8fa; border: .25mm solid #e3e6eb; border-left: 1mm solid #1e4e8c; border-radius: 1mm; padding: 2.6mm 3.4mm; margin: 1mm 0 3mm; white-space: pre-wrap; }
.dict { break-inside: avoid; }
.dict h3 { font-family: 'JetBrains Mono', monospace; font-size: 9.2pt; }
p.dcom { color: #4b5563; font-size: 8.6pt; margin-bottom: 1mm; }
ol.refs { padding-left: 7mm; font-size: 8.6pt; }
ol.refs li { margin-bottom: 2.6mm; overflow-wrap: anywhere; }

/* ---------- página do diagrama ---------- */
.main { page: main; }
.diagram-page { page: diagrama; }
.diagram-page h2 { margin: 0 0 3mm; font-size: 15pt; }
.diagram-page img { width: 100%; display: block; }
.figcap { font-size: 9pt; color: #4b5563; margin-top: 3mm; }
"""


def build(out_pdf, svg_path):
    from weasyprint import HTML

    blocks = C.blocks()
    svg_name = os.path.basename(svg_path)
    body = cover() + '<section class="main">' + toc(blocks) + render_blocks(blocks, svg_name) + "</section>"
    css = CSS.replace("%FOOTER%", C.FOOTER)
    doc = f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{C.SOLUCAO} · Database Design</title>' \
          f'<style>{css}</style></head><body>{body}</body></html>'
    html_path = os.path.join(os.path.dirname(svg_path), "documento.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(doc)
    HTML(filename=html_path).write_pdf(out_pdf, pdf_variant=None)
    print("ok:", out_pdf)


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
