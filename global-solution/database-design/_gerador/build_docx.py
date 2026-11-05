"""Gera a versão editável (.docx) do documento, com o mesmo conteúdo do PDF.

Uso: python build_docx.py saida.docx diagrama.png
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_pdf as P  # noqa: E402  (reaproveita relações e chaves)
import content as C  # noqa: E402

M = P.M
NAVY = RGBColor(0x1E, 0x4E, 0x8C)
WINE = RGBColor(0xA3, 0x21, 0x4F)
INK = RGBColor(0x1F, 0x24, 0x30)
MUTED = RGBColor(0x6B, 0x72, 0x80)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
FONT = "Calibri"
MONO = "Consolas"


# ----------------------------------------------------------------- utilidades
def shade(cell_or_par, hex_color):
    el = cell_or_par._tc if hasattr(cell_or_par, "_tc") else cell_or_par._p
    pr = el.get_or_add_tcPr() if hasattr(cell_or_par, "_tc") else el.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    pr.append(shd)


def par_border_left(par, hex_color, size=24):
    pPr = par._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), str(size))
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), hex_color)
    bdr.append(left)
    pPr.append(bdr)


def add_runs(par, text, size=None, color=None, bold_all=False):
    """Converte **negrito** e `código` em runs."""
    tokens = re.split(r"(\*\*.+?\*\*|`.+?`)", text)
    for tk in tokens:
        if not tk:
            continue
        if tk.startswith("**") and tk.endswith("**"):
            r = par.add_run(tk[2:-2])
            r.bold = True
        elif tk.startswith("`") and tk.endswith("`"):
            r = par.add_run(tk[1:-1])
            r.font.name = MONO
            r._element.rPr.rFonts.set(qn("w:eastAsia"), MONO)
            r.font.size = Pt((size or 10) - 1)
            r.font.color.rgb = RGBColor(0x26, 0x30, 0x44)
            if bold_all:
                r.bold = True
            continue
        else:
            r = par.add_run(tk)
            if bold_all:
                r.bold = True
        if size:
            r.font.size = Pt(size)
        if color is not None:
            r.font.color.rgb = color
    return par


def field(par, instr, placeholder=""):
    """Insere um campo do Word (PAGE, NUMPAGES, TOC...)."""
    r1 = par.add_run()
    b = OxmlElement("w:fldChar")
    b.set(qn("w:fldCharType"), "begin")
    b.set(qn("w:dirty"), "true")
    r1._r.append(b)
    r2 = par.add_run()
    t = OxmlElement("w:instrText")
    t.set(qn("xml:space"), "preserve")
    t.text = f" {instr} "
    r2._r.append(t)
    r3 = par.add_run()
    s = OxmlElement("w:fldChar")
    s.set(qn("w:fldCharType"), "separate")
    r3._r.append(s)
    r4 = par.add_run(placeholder)
    r5 = par.add_run()
    e = OxmlElement("w:fldChar")
    e.set(qn("w:fldCharType"), "end")
    r5._r.append(e)
    return r4


def set_cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        el = OxmlElement(f"w:{k}")
        el.set(qn("w:w"), str(v))
        el.set(qn("w:type"), "dxa")
        mar.append(el)
    tblPr.append(mar)


def fix_widths(t, widths):
    t.autofit = False
    tblPr = t._tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    grid = t._tbl.tblGrid
    for gc, w in zip(grid.findall(qn("w:gridCol")), widths):
        gc.set(qn("w:w"), str(int(w.twips if hasattr(w, "twips") else w)))
    for row in t.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = w


def repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    h = OxmlElement("w:tblHeader")
    h.set(qn("w:val"), "true")
    trPr.append(h)
    cant = OxmlElement("w:cantSplit")
    trPr.append(cant)


def no_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def table(doc, cols, rows, widths_pct, total_cm=17.0, size=8.5, align=None, header=True):
    align = align or {}
    t = doc.add_table(rows=0, cols=len(cols))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_cell_margins(t)
    widths = [Cm(total_cm * w / 100) for w in widths_pct]
    if header:
        hr = t.add_row()
        repeat_header(hr)
        for i, c in enumerate(cols):
            cell = hr.cells[i]
            cell.width = widths[i]
            shade(cell, "1E2A3D")
            p = cell.paragraphs[0]
            add_runs(p, c, size=size, color=WHITE, bold_all=True)
            if align.get(i) == "right":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for ri, r in enumerate(rows):
        row = t.add_row()
        no_split(row)
        for i, v in enumerate(r):
            cell = row.cells[i]
            cell.width = widths[i]
            if ri % 2 == 1:
                shade(cell, "F5F6F8")
            parts = str(v).split("<br>")
            p = cell.paragraphs[0]
            add_runs(p, parts[0], size=size)
            for extra in parts[1:]:
                add_runs(cell.add_paragraph(), extra, size=size)
            if align.get(i) == "right":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    # bordas suaves
    tblPr = t._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "D9DDE3" if edge not in ("left", "right", "insideV") else "FFFFFF")
        borders.append(el)
    tblPr.append(borders)
    fix_widths(t, widths)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


def caption(doc, text):
    p = doc.add_paragraph()
    add_runs(p, text, size=8, color=MUTED)
    p.paragraph_format.space_after = Pt(8)


# ----------------------------------------------------------------- documento
def setup(doc):
    st = doc.styles["Normal"]
    st.font.name = FONT
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    st.font.size = Pt(10.5)
    st.font.color.rgb = INK
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.line_spacing = 1.15
    for name, size, color in (("Heading 1", 18, INK), ("Heading 2", 13, NAVY), ("Heading 3", 11, INK)):
        h = doc.styles[name]
        h.font.name = FONT
        h.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
        h.font.size = Pt(size)
        h.font.bold = True
        h.font.color.rgb = color
        h.paragraph_format.space_before = Pt(14 if name != "Heading 1" else 0)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.top_margin = sec.bottom_margin = Cm(2.0)
    sec.left_margin, sec.right_margin = Cm(2.2), Cm(1.9)
    # pede ao Word para atualizar os campos (sumário e páginas) ao abrir
    settings = doc.settings.element
    upd = OxmlElement("w:updateFields")
    upd.set(qn("w:val"), "true")
    settings.append(upd)


def footer(section):
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0]
    p.text = ""
    usable = section.page_width - section.left_margin - section.right_margin
    p.paragraph_format.tab_stops.add_tab_stop(usable, WD_TAB_ALIGNMENT.RIGHT)
    add_runs(p, C.FOOTER, size=7.5, color=MUTED)
    r = p.add_run("\t")
    r.font.size = Pt(7.5)
    ph = field(p, "PAGE", "1")
    ph.font.size = Pt(7.5)
    p.add_run(" / ").font.size = Pt(7.5)
    ph2 = field(p, "NUMPAGES", "1")
    ph2.font.size = Pt(7.5)


def cover(doc):
    sec = doc.sections[0]
    sec.different_first_page_header_footer = True
    p = doc.add_paragraph()
    add_runs(p, C.COVER["inst"].upper(), size=9.5, color=WINE, bold_all=True)
    p.paragraph_format.space_after = Pt(2)
    p = doc.add_paragraph()
    add_runs(p, C.COVER["evento"], size=11, color=MUTED)
    for _ in range(6):
        doc.add_paragraph()
    p = doc.add_paragraph()
    add_runs(p, " " + C.COVER["disciplina"].upper() + " ", size=9.5, color=WHITE, bold_all=True)
    shade(p, "1E4E8C")
    p.paragraph_format.right_indent = Cm(12.3)
    p = doc.add_paragraph()
    r = p.add_run(C.COVER["titulo"])
    r.bold = True
    r.font.size = Pt(40)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(6)
    p = doc.add_paragraph()
    add_runs(p, C.COVER["subtitulo"], size=14, color=RGBColor(0x37, 0x41, 0x51))
    for _ in range(6):
        doc.add_paragraph()
    p = doc.add_paragraph()
    add_runs(p, "EQUIPE", size=8, color=MUTED, bold_all=True)
    p.paragraph_format.space_after = Pt(0)
    p = doc.add_paragraph()
    add_runs(p, C.EQUIPE, size=13, bold_all=True)
    p = doc.add_paragraph()
    add_runs(p, "INTEGRANTES (ORDEM ALFABÉTICA)", size=8, color=MUTED, bold_all=True)
    p.paragraph_format.space_after = Pt(2)
    t = doc.add_table(rows=0, cols=2)
    for n, rm in C.INTEGRANTES:
        row = t.add_row()
        row.cells[0].width, row.cells[1].width = Cm(7), Cm(4)
        add_runs(row.cells[0].paragraphs[0], n, size=11)
        add_runs(row.cells[1].paragraphs[0], f"RM {rm}", size=11)
    fix_widths(t, [Cm(7), Cm(4)])
    for _ in range(5):
        doc.add_paragraph()
    p = doc.add_paragraph()
    add_runs(p, C.DATA, size=10, color=MUTED)
    p.add_run().add_break(WD_BREAK.PAGE)


def _fld(run, kind):
    el = OxmlElement("w:fldChar")
    el.set(qn("w:fldCharType"), kind)
    run._r.append(el)


def toc(doc, entries=None):
    from docx.enum.text import WD_TAB_LEADER
    p = doc.add_paragraph()
    add_runs(p, "Sumário", size=18, bold_all=True)
    p.paragraph_format.space_after = Pt(14)
    if not entries:
        p = doc.add_paragraph()
        ph = field(p, 'TOC \\o "1-2" \\h \\z \\u',
                   "Clique com o botão direito aqui e escolha “Atualizar campo” para gerar o sumário.")
        ph.font.color.rgb = MUTED
        p.add_run().add_break(WD_BREAK.PAGE)
        return
    usable = Cm(21.0 - 2.2 - 1.9)
    for i, (lvl, text, page) in enumerate(entries):
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.tab_stops.add_tab_stop(usable, WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        pf.space_after = Pt(2 if lvl == 2 else 3)
        pf.space_before = Pt(0 if lvl == 2 else 8)
        if lvl == 2:
            pf.left_indent = Cm(0.7)
        if i == 0:
            _fld(p.add_run(), "begin")
            r = p.add_run()
            t = OxmlElement("w:instrText")
            t.set(qn("xml:space"), "preserve")
            t.text = ' TOC \\o "1-2" \\h \\z \\u '
            r._r.append(t)
            _fld(p.add_run(), "separate")
        r = p.add_run(f"{text}\t{page}")
        r.font.size = Pt(10.5 if lvl == 1 else 10)
        r.bold = lvl == 1
        if i == len(entries) - 1:
            _fld(p.add_run(), "end")
    doc.paragraphs[-1].add_run().add_break(WD_BREAK.PAGE)


def new_section(doc, landscape, a3=False):
    sec = doc.add_section(WD_SECTION.NEW_PAGE)
    if landscape:
        sec.orientation = WD_ORIENT.LANDSCAPE
        if a3:
            sec.page_width, sec.page_height = Cm(42.0), Cm(29.7)
        else:
            sec.page_width, sec.page_height = Cm(29.7), Cm(21.0)
        sec.left_margin = sec.right_margin = Cm(1.5)
        sec.top_margin = sec.bottom_margin = Cm(1.4)
    else:
        sec.orientation = WD_ORIENT.PORTRAIT
        sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
        sec.top_margin = sec.bottom_margin = Cm(2.0)
        sec.left_margin, sec.right_margin = Cm(2.2), Cm(1.9)
    footer(sec)
    return sec


def body(doc, png):
    first_h1 = True
    for b in C.blocks():
        kind = b[0]
        if kind == "h1":
            if not first_h1:
                doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
            first_h1 = False
            doc.add_heading(b[2], level=1)
        elif kind == "h2":
            doc.add_heading(b[2], level=2)
        elif kind == "p":
            add_runs(doc.add_paragraph(), re.sub(r"\[(\d)\]", r"[\1]", b[1]))
        elif kind == "callout":
            p = add_runs(doc.add_paragraph(), b[1])
            shade(p, "FBF1F5")
            par_border_left(p, "A3214F")
        elif kind in ("ul", "ol"):
            style = "List Bullet" if kind == "ul" else "List Number"
            for item in b[1]:
                p = doc.add_paragraph(style=style)
                add_runs(p, item)
                p.paragraph_format.space_after = Pt(3)
        elif kind == "ficha":
            t = doc.add_table(rows=0, cols=2)
            t.style = "Table Grid"
            set_cell_margins(t, 80, 80, 110, 110)
            for k, v in b[1]:
                row = t.add_row()
                no_split(row)
                row.cells[0].width, row.cells[1].width = Cm(4.8), Cm(12.2)
                shade(row.cells[0], "F3F5F8")
                add_runs(row.cells[0].paragraphs[0], k, size=9, color=NAVY, bold_all=True)
                add_runs(row.cells[1].paragraphs[0], v, size=9)
            fix_widths(t, [Cm(4.8), Cm(12.2)])
            doc.add_paragraph()
        elif kind == "scope":
            t1, l1, t2, l2 = b[1]
            t = doc.add_table(rows=1, cols=2)
            t.style = "Table Grid"
            set_cell_margins(t, 100, 100, 120, 120)
            for cell, title, items, color in ((t.rows[0].cells[0], t1, l1, "EEF6F4"),
                                              (t.rows[0].cells[1], t2, l2, "F5F5F6")):
                cell.width = Cm(8.5)
                shade(cell, color)
                add_runs(cell.paragraphs[0], title, size=9.5, bold_all=True)
                for it in items:
                    p = cell.add_paragraph(style="List Bullet")
                    add_runs(p, it, size=9)
            fix_widths(t, [Cm(8.5), Cm(8.5)])
            doc.add_paragraph()
        elif kind == "table":
            spec = b[1]
            table(doc, spec["cols"], spec["rows"], spec.get("widths", [100 / len(spec["cols"])] * len(spec["cols"])),
                  size=8.5 if "result" not in spec.get("class", "") else 8, align=spec.get("align"))
            if spec.get("caption"):
                caption(doc, spec["caption"])
        elif kind == "relations":
            fk_by = {(fk["child"], fk["columns"][0]): fk for fk in M["fks"]}
            rows = []
            for i, (parent, child, col, leitura) in enumerate(C.RELACOES, 1):
                fk = fk_by[(child, col)]
                rows.append([str(i), parent.replace("T_EC_", ""), child.replace("T_EC_", ""),
                             "**0..1 : N**" if fk["optional"] else "**1 : N**", f"`{fk['name'].lower()}`", leitura])
            table(doc, ["#", "Pai", "Filho", "Card.", "Chave estrangeira", "Leitura"], rows,
                  [5, 15, 17, 9, 25, 29], size=8, align={0: "right"})
        elif kind == "dictionary":
            for _, t, _, _ in C.BLOCO_TABELA:
                tb = M["tables"][t]
                doc.add_heading(t, level=3)
                p = doc.add_paragraph()
                add_runs(p, tb["comment"], size=9, color=MUTED)
                rows = [[f"`{c['name']}`", f"`{c['type']}`", "S" if c["nullable"] else "N", P.key_label(t, c),
                         C.DESC[t][c["name"]]] for c in tb["columns"]]
                table(doc, ["Coluna", "Tipo", "Nulo", "Chave", "Descrição"], rows, [25, 17, 7, 18, 33], size=8)
        elif kind == "sql":
            for i, line in enumerate(b[1].split("\n")):
                p = doc.add_paragraph()
                r = p.add_run(line if line else " ")
                r.font.name = MONO
                r._element.rPr.rFonts.set(qn("w:eastAsia"), MONO)
                r.font.size = Pt(8)
                shade(p, "F6F8FA")
                par_border_left(p, "1E4E8C", 18)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.0
                p.paragraph_format.keep_with_next = True
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "figure":
            f = b[1]
            new_section(doc, landscape=True, a3=True)
            doc.add_heading(f["title"], level=2)
            doc.add_picture(png, width=Cm(38.5))
            caption(doc, f["caption"])
            new_section(doc, landscape=False)
        elif kind == "refs":
            for i, r in enumerate(b[1], 1):
                p = doc.add_paragraph()
                add_runs(p, f"[{i}] " + r, size=9)
        else:
            raise ValueError(kind)


def headings():
    out = []
    for b in C.blocks():
        if b[0] == "h1":
            out.append((1, b[2]))
        elif b[0] == "h2":
            out.append((2, b[2]))
        elif b[0] == "figure":
            out.append((2, b[1]["title"]))
    return out


def page_numbers(docx_path):
    """Converte com o LibreOffice e encontra a página de cada título."""
    import subprocess
    import tempfile
    import pypdf
    tmp = tempfile.mkdtemp(dir=HERE)
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", docx_path, "--outdir", tmp],
                   check=True, capture_output=True, timeout=240)
    pdf = os.path.join(tmp, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
    pages = [" ".join(pg.extract_text().split()) for pg in pypdf.PdfReader(pdf).pages]
    found, start = [], 2  # o sumário fica na página 2; títulos começam depois
    for lvl, text in headings():
        key = " ".join(text.split())
        for i in range(start, len(pages)):
            if key in pages[i]:
                found.append((lvl, text, i + 1))
                start = i
                break
        else:
            raise RuntimeError(f"título não encontrado: {text}")
    return found


def build(out, png, entries=None):
    doc = Document()
    setup(doc)
    cover(doc)
    # o rodapé com número de página começa depois da capa
    footer(doc.sections[0])
    first = doc.sections[0].first_page_footer
    first.is_linked_to_previous = False
    toc(doc, entries)
    body(doc, png)
    doc.core_properties.title = f"{C.SOLUCAO} · Database Design"
    doc.core_properties.author = ", ".join(n for n, _ in C.INTEGRANTES)
    doc.save(out)
    print("ok:", out)


if __name__ == "__main__":
    out, png = sys.argv[1], sys.argv[2]
    build(out, png)                      # 1ª passagem: descobre as páginas
    entries = page_numbers(out)
    build(out, png, entries)             # 2ª passagem: sumário preenchido
    check = page_numbers(out)
    assert [e[2] for e in check] == [e[2] for e in entries], "paginação mudou entre passagens"
    print("sumário:", [(t[:28], p) for _, t, p in entries])
