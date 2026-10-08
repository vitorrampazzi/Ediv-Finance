# Arquivos da marca

A imagem original fornecida está em `public/ediv-logo.png`. Ela permanece
preservada como referência. O site usa a versão com transparência real em
`public/ediv-logo-transparent.png`, sem depender de mistura de cores em CSS.

Os ícones da aba usam `ediv-favicon-32.png` e `ediv-favicon-192.png`.
`ediv-apple-touch-icon.png` é o ícone para atalhos em dispositivos Apple.
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
> transparent canvas with a small uniform safe margin. Clean anti-aliased edges
> without a black fringe. Do not add text, a plate, a background color, glow,
> shadow, extra elements or fake checkerboard. Preserve the logo identity as
> closely as possible.
