# Roadmap de SEO

## Precisa de decisão do dono

1. **Páginas públicas por ação.** Decidir quais empresas podem ter página aberta.
   - Hoje a composição e o tamanho do ranking são fechados; a API pública mostra só as 3 primeiras.
   - Proposta: uma lista aprovada em `site-pages.mjs`, com ticker e nome. Cada empresa ganha uma página pré-renderizada com H1, texto sobre o que a pesquisa cobre, links para glossário, aulas e metodologia, e convite ao cadastro.
   - Números aparecem só quando já forem públicos.
   - Sem essa lista, não há como atender buscas por ticker.
2. **Títulos de aba por página.** Hoje todas as abas mostram "Escola do Dividendo".
   - Títulos como "Ranking de Ações | Escola do Dividendo" ajudam o Google a entender cada página e costumam melhorar o CTR.
3. **Destino da `/assessoria`:** colocar um link no rodapé ou tirá-la do índice até o lançamento.
4. **Página "Sobre":** com os responsáveis reais pela pesquisa (nomes, registros profissionais, se houver) e a política editorial. Não inventar dados.

## Técnico (sem decisão pendente)

1. Liberar `/api/rankings/public` no robots.txt junto com o item 1, para o Google renderizar a prévia do ranking.
2. Converter `ediv-logo-clean.png` (135 KB) e a imagem social (1,3 MB) para WebP/JPEG otimizados quando houver ferramenta de imagem no projeto.
3. Medir LCP, INP e CLS reais (campo) com `web-vitals` ou pelo relatório do Search Console, quando houver tráfego.
4. Eventos de cursos no GA4 (`view_course`, `start_course` e `complete_course`), com lista fechada de IDs.
5. Course e VideoObject quando as aulas tiverem URL própria e os vídeos estiverem publicados.

## Crescimento orgânico contínuo

- **Links externos:** link do site na bio do Instagram do corretor, no YouTube, no LinkedIn e em parcerias. É o que mais acelera a indexação de um site novo.
- **Search Console:** acompanhar a cada 2 a 4 semanas as páginas indexadas, as consultas com impressões e as páginas com CTR baixo.
- **Conteúdo:** publicar os conteúdos de `SEO-KEYWORDS.md` com revisão editorial, um por vez, sempre com links para o glossário, as aulas e o ranking.
