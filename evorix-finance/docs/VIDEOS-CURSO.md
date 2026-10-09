# Vídeos do curso

A escola mantém a leitura e os exercícios enquanto a equipe reúne os vídeos.
O player já existe e só conecta ao provedor após o clique em Carregar vídeo.

## Navegação dos minicursos

A faixa de minicursos usa rolagem horizontal e setas, sem limitar a quantidade de
cursos à largura da tela. Ao abrir um curso, sua playlist aparece à direita do
vídeo no desktop e abaixo, em uma faixa horizontal, no celular. As aulas podem
ser escolhidas na lista ou pelas setas anterior/próxima, sem reprodução
automática. Trocar de aula desmonta o player anterior.

As aulas bloqueadas abrem o convite de acesso por conta. A indicação de conclusão
refere-se ao exercício, não à porcentagem assistida do vídeo. Não há vídeo ou
duração de vídeo fictícios: as estimativas exibidas são de leitura.

O bloco “Seu percurso” indica a próxima aula com exercício pendente. Ao abrir
um curso, a interface prefere seu próximo capítulo não concluído; cursos terminados
podem ser revisados. A seleção fica no endereço, por exemplo
`/app/aprender?aula=dividendos#sala-de-aula`, permitindo compartilhar ou voltar
diretamente ao capítulo. Reiniciar o progresso pede confirmação.

## Publicar quando o material chegar

1. Receber os vídeos selecionados, títulos e ordem dos capítulos. Confirmar que
   a equipe tem autorização para disponibilizar o material do curso no site.
2. Hospedar o vídeo no YouTube ou Vimeo. Não adicionar arquivos grandes de vídeo
   ao Git nem ao bundle do frontend.
3. Associar cada vídeo ao capítulo em `src/lib/learningCatalog.ts`, no campo
   `videoEmbedUrl`, preservando os IDs das aulas para manter o progresso salvo.
   Para novas aulas, adicionar também a definição educativa em
   `server/learning-content.js` e incluir o ID no curso correspondente em
   `learningCourses`. O catálogo determina a ordem e os componentes montam as
   faixas e playlists automaticamente; o banco já aceita novos IDs de aula.
4. Usar `https://www.youtube-nocookie.com/embed/ID` ou
   `https://player.vimeo.com/video/ID`. Esses são os provedores aceitos pelo
   validador e pela política de segurança do site.
5. Revisar os textos e exercícios com o corretor para acompanhar o conteúdo real
   do curso, depois publicar o código em produção.

Os URLs continuam `null` até receber o material. Não há vídeo fictício publicado
nem upload de vídeo pelo painel nesta etapa. Aulas restritas por conta no Ediv
não tornam automaticamente privado um vídeo no provedor: o acesso ao vídeo deve
ser configurado lá caso necessário.
