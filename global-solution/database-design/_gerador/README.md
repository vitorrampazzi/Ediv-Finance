# Gerador do documento (não entregar)

Estes scripts geram `EmbarqueCerto_DatabaseDesign.pdf`, o `.docx` e o diagrama a partir dos
metadados exportados do Oracle (`cols.csv`, `cons.csv`, `tcom.csv`) e dos resultados das
consultas (`q1.csv`, `q2.csv`, `q3.csv`).

- `content.py`: textos do documento, como nome da equipe, integrantes, seções e referências.
- `diagram.py`: diagrama do modelo em SVG (layout manual, notação pé de galinha).
- `build_pdf.py`: HTML + CSS convertido em PDF com WeasyPrint.
- `build_docx.py`: versão editável com python-docx; usa o LibreOffice para numerar o sumário.
- `meta.sql`: exporta os metadados do Oracle depois de rodar o DDL.

Requisitos: Python 3 com `weasyprint`, `python-docx`, `pypdf` e `pillow`, além de Node com
Playwright (para gerar o PNG do diagrama) e LibreOffice.

```bash
python diagram.py diagrama.svg
node shot.js diagrama.svg diagrama_hd.png 2.5
python build_pdf.py ../EmbarqueCerto_DatabaseDesign.pdf diagrama.svg
python build_docx.py ../EmbarqueCerto_DatabaseDesign_editavel.docx diagrama_hd.png
```
