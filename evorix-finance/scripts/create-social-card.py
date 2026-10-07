from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Deterministic brand layout, not a generated financial chart or forecast.
image = Image.new("RGB", (1200, 630), "#363c47")
draw = ImageDraw.Draw(image)
fonts = Path("C:/Windows/Fonts")
regular = ImageFont.truetype(str(fonts / "segoeui.ttf"), 38)
large = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 88)
small = ImageFont.truetype(str(fonts / "segoeui.ttf"), 25)
draw.rectangle((70, 75, 77, 540), fill="#24989b")
draw.text((115, 80), "ESCOLA DO DIVIDENDO", font=small, fill="#8fc4c2")
draw.text((110, 145), "Ediv Finance", font=large, fill="#f2f4f7")
draw.text((115, 290), "Ações. Dividendos. Conhecimento.", font=regular, fill="#f2f4f7")
draw.text((115, 360), "Entenda os cenários e os riscos.", font=regular, fill="#bfc5cf")
draw.line((115, 470, 1080, 470), fill="#697080", width=1)
draw.text((115, 505), "escoladodividendo.com.br", font=small, fill="#8fc4c2")
image.save(Path(__file__).resolve().parents[1] / "public/og-ediv.png")
