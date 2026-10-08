# POC: pesquisa de ações e educação sobre dividendos

Esta proposta é desenvolvida na branch QA. A versão de produção continua na main.

## Experiência proposta

1. O login abre o ranking de previsões. A navegação principal reúne Ranking,
   Análises de ações e Escola de dividendos.
2. Cada linha do ranking abre um caderno da empresa. A URL preserva a versão
   da publicação e o modo real/demonstração.
3. O caderno apresenta a tese/opinião, riscos, contexto da empresa, estatísticas
   e fundamentos disponíveis na pesquisa. As empresas fictícias têm narrativas
   ilustrativas. Para publicações reais, a tese e informações da empresa são os
   campos já editáveis na planilha/editor; histórias próprias ainda não publicadas
   mostram um espaço pendente, sem criar conteúdo em nome do corretor.
4. A escola tem dois cursos e quatro aulas, com seleção de capítulos, material
   de leitura, exercícios, progresso e laboratório de conceitos (DY, payout e
   potencial). A primeira aula é aberta; as demais seguem o acesso por conta.
5. A nova animação usa folhas de pesquisa, gráfico abstrato e livro. Não utiliza
   Bitcoin, criptomoedas, moedas giratórias ou dados apresentados como cotações.

## Vídeos

As gravações ainda não foram fornecidas. `src/lib/learningCatalog.ts` concentra
os capítulos e suas URLs de vídeo, inicialmente `null`.

Após receber um vídeo autorizado, preencha `videoEmbedUrl` com um destes formatos:

- `https://www.youtube-nocookie.com/embed/ID_DO_VIDEO` (ID com 11 caracteres)
- `https://player.vimeo.com/video/ID_NUMERICO`

O player só carrega após o clique em **Carregar vídeo**, sem reprodução automática.
A política CSP permite somente esses dois hosts de embed. Até a publicação,
a leitura e o exercício funcionam e o espaço de vídeo indica que está pendente.

## Gestão e dados existentes

Administração de usuários, perfis, atendimento, editor de pesquisa, rascunhos,
importação da planilha, prévia, publicação, histórico e comparação permanecem.

Visão geral, Carteira e Favoritos saíram da experiência. Seus endereços antigos
redirecionam para o ranking; a conta não pede total investido nem oferece registro
de operações. Os módulos e dados anteriores não foram apagados. Nesta POC,
as APIs antigas continuam protegidas e disponíveis para compatibilidade,
exportação e controles de dados. Um encerramento definitivo da API e uma
política de retenção precisam ser planejados antes da mudança comercial.

Nenhuma migração, credencial, cobrança, acesso persistente ou dado de produção
foi alterado para esta POC. Os IDs antigos das aulas preservam o progresso;
`carteira` é apenas um ID técnico da aula de lucro, caixa e sustentabilidade.

## Material que ainda falta

- Pesquisa real e identificação profissional do responsável.
- Opiniões e histórias que o corretor deseja publicar sobre as empresas reais.
- Gravações dos cursos e autorização para incorporá-las.
- Revisão do conteúdo educativo pelo corretor e aprovação da direção visual.

Os exemplos fictícios permanecem identificados dentro do ranking e dos cadernos.
