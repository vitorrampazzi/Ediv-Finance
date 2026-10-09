# Vídeos do curso

A escola mantém a leitura e os exercícios enquanto a equipe reúne os vídeos.
O player já existe e só conecta ao provedor após o clique em Carregar vídeo.

## Publicar quando o material chegar

1. Receber os vídeos selecionados, títulos e ordem dos capítulos. Confirmar que
   a equipe tem autorização para disponibilizar o material do curso no site.
2. Hospedar o vídeo no YouTube ou Vimeo. Não adicionar arquivos grandes de vídeo
   ao Git nem ao bundle do frontend.
3. Associar cada vídeo ao capítulo em `src/lib/learningCatalog.ts`, no campo
   `videoEmbedUrl`, preservando os IDs das aulas para manter o progresso salvo.
4. Usar `https://www.youtube-nocookie.com/embed/ID` ou
   `https://player.vimeo.com/video/ID`. Esses são os provedores aceitos pelo
   validador e pela política de segurança do site.
5. Revisar os textos e exercícios com o corretor para acompanhar o conteúdo real
   do curso, depois publicar o código em produção.

Os URLs continuam `null` até receber o material. Não há vídeo fictício publicado
nem upload de vídeo pelo painel nesta etapa. Aulas restritas por conta no Ediv
não tornam automaticamente privado um vídeo no provedor: o acesso ao vídeo deve
ser configurado lá caso necessário.
