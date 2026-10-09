# Arquivos da marca

A imagem original fornecida está em `public/ediv-logo.png`. Ela permanece
preservada como referência. O site usa a versão com transparência real em
`public/ediv-logo-clean.png`, sem depender de mistura de cores em CSS. A margem
transparente preserva o círculo e a ponta do lápis por inteiro.

Os ícones da aba usam `ediv-icon-clean-32.png` e `ediv-icon-clean-192.png`.
`ediv-apple-clean.png` é o ícone para atalhos em dispositivos Apple.
`favicon.ico` oferece um fallback no endereço convencional do navegador.
Todos são exportados com canal alfa, a partir da mesma versão da marca.

## Origem da versão transparente

Ferramenta: `image_gen`, em modo de edição com fundo transparente. Após a edição,
os arquivos foram reduzidos para os tamanhos de uso, preservando o canal alfa.

Prompt usado:

> Use case: background-extraction. Edit target: the provided Ediv Finance logo
> image, for a production website header and browser favicon. Remove ONLY the
> entire black background and all black negative-space regions, including inside
> the D-shaped circular mark and between the tree branches, making them truly
> transparent alpha. Preserve the exact existing teal-green tree, outer letter
> D/circle and pencil silhouette, their shape, fine leaf and grass edge details,
> orientation, proportions and original green color. This is a background removal
> operation, not a logo redesign. Keep the complete mark, centered on a square
> transparent canvas with at least 8% uniform transparent padding on all sides.
> The complete logo, lower circle edge and pencil tip must remain visible.
> Clean anti-aliased edges
> without a black fringe. Do not add text, a plate, a background color, glow,
> shadow, extra elements or fake checkerboard. Preserve the logo identity as
> closely as possible.

A revisão atual também solicita cor sólida, sem gradiente ou sombra. Os arquivos
anteriores permanecem como referência; novos nomes evitam usar a imagem antiga
do cache do navegador.

## Prompt completo da correção atual

Ferramenta: `image_gen`, edição da imagem original com
`transparent_background=true`. Exportação posterior em PNG RGBA para 512, 192,
180 e 32 pixels; ICO contém o mesmo PNG de 32 pixels.

> Use case: background-extraction. Asset type: Ediv Finance website logo and
> favicon. Edit target: the original attached teal-green tree inside a D-shaped
> circular arrow/pencil emblem. Remove the solid black background completely,
> including EVERY black negative-space region inside the circle and pencil and
> between tree branches. Produce genuine transparent alpha, clean antialiased
> edges without black or dark fringes. Preserve the original flat solid teal
> color, exact emblem silhouette, proportions, orientation and branch/foliage
> details as closely as possible. The COMPLETE logo must be visible, including
> the entire circular lower edge and pencil tip, with at least 8% uniform empty
> transparent padding on all four sides. No shape may touch the image border or
> be cropped. This is extraction of an existing logo, not a redesign. No
> gradient, shadows, glow, text, plate, backdrop, extra details, fake checkerboard
> or black fill anywhere. Center the original entire emblem on a square
> transparent canvas.
