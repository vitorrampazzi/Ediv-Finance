# Referência AGF e melhorias na Ediv Finance

Revisão de 15 de outubro de 2026, limitada às áreas que a Ediv já oferece:
ranking, pesquisa de empresas, análises e educação.

## O que foi observado

O REA abriu as páginas públicas em um Chrome com perfil temporário, capturou
interface, estrutura acessível e imagens, e registrou os passos da navegação.

| Referência pública | Observação | Aplicação na Ediv |
| --- | --- | --- |
| [AGF](https://agf.com.br/) | Navegação móvel e apresentação separada dos recursos de investimento e educação. | Manter as áreas existentes bem delimitadas e reduzir o espaço dos controles antes da lista no celular. |
| [Aplicativo AGF](https://agf.com.br/aplicativo) | A apresentação pública reúne busca de empresas, rankings, filtros e indicadores. | Facilitar a consulta do ranking e das análises, com números alinhados e contexto de filtros preservado. |
| [Cursos AGF](https://agf.com.br/cursos) | Cursos apresentados por assunto e etapa de aprendizado. | Organizar os minicursos, a aula selecionada e o progresso dos exercícios. |

A rota interna `app.agf.com.br/investimento/renda` redirecionou para o login.
Não foi possível observar seu ranking autenticado. Persistência de filtros,
comportamento das seções e playlist da Ediv são decisões de implementação próprias;
não há evidência de que a AGF use esses mesmos comportamentos.

## Alterações entregues

- **Ranking:** filtros validados na URL, chips removíveis, ordenação estável,
  colunas compactas no computador e cabeçalho menor no celular. Abrir uma pesquisa
  e voltar mantém busca, setor, prazo, ordenação e contexto da publicação.
- **Pesquisa de uma empresa:** navegação fixa por seções, com destaque da seção
  em leitura e deslocamento horizontal do menu para manter o item ativo visível.
  O destaque considera o espaço reservado ao cabeçalho ao navegar por âncoras.
- **Análises:** busca, ordenação e página na URL; botão de limpar; busca com
  pequeno intervalo para digitação; carregamento com estrutura estável. A coluna
  muda para valor de mercado quando essa ordenação está selecionada. Dados ausentes
  aparecem como indisponíveis.
- **Aulas:** estilos dos cursos e da playlist, indicação de seleção, progresso
  real dos exercícios e leitura estimada. A playlist é horizontal no celular e
  vertical no computador, com suporte ao teclado e à preferência por menos movimento.
- **Primeira renderização:** o HTML público de Aprender inclui seu CSS antes de
  carregar o JavaScript da rota.

## Evidência e limites da revisão

Compilação TypeScript/Vite e lint concluídos sem erros. Foram percorridos os fluxos
abaixo em uma prévia local isolada, usando usuário e respostas de API fictícios.
Essa revisão cobre o frontend; não certifica banco, envio de e-mail, autenticação
real nem a disponibilidade do provedor de cotações. Não foi executada suíte de testes.

| Fluxo observado | Resultado |
| --- | --- |
| Ranking em 360 × 800 e 390 × 844 | Primeira empresa visível mais cedo; controles e lista ajustados à largura. |
| Ranking filtrado → empresa → voltar | Filtros mantidos na URL e no ranking. |
| Pesquisa → Fundamentos, em 390 × 844 | Conteúdo correto e âncora Fundamentos marcada com `aria-current="location"`. |
| Análises → buscar LAB → ordenar por valor de mercado → página 2 | Busca, ordem e página refletidas na URL; valores de mercado apresentados. |
| Aprender → segundo curso → próxima aula, com movimento reduzido | Aula e playlist atualizadas; progresso mantido. |
| Aprender no computador → próxima aula | Playlist lateral e seleção atualizadas. |

Não houve erro de página registrado pelo REA nesses fluxos concluídos. Uma captura
inicial da pesquisa revelou o destaque incorreto de Estatísticas ao abrir Fundamentos;
o cálculo da posição foi corrigido e a captura repetida confirmou o destaque correto.
Capturas exploratórias interrompidas por seletores ambíguos não contam como fluxos
concluídos.

### Identificadores REA

- Home AGF: `ev_9bcfce41e916c06da2d5b20a528edd0efe77822527153ff91fa3f842b26cc6d5`
- Aplicativo AGF: `ev_f66a8c704f1351ed8d8499977ab4b80c028ac1dd3db6154dd49e95a674214361`
- Cursos AGF: `ev_8a5bbccbad6776054d493feb346ebbe193aa20886f80b30f2533dc036832bad0`
- Limite de acesso ao app AGF: `ev_40b1a39a5dc937610d61f7a801d8cbad89a4e1cae12ac5ef4ffff716e8222b3d`
- Ranking e retorno: `ev_d81339b67124d9d17a988900258374b85a5e7b13e500e74335e40bc5a9ff84b8`
- Ranking final em 360 px: `ev_d13edc71d62ff1e5c044a6ead6b78a090f918ea02d8a3ff7beadd9cd70ced335`
- Pesquisa com âncora corrigida: `ev_09adeecd9dbaa2d81a9a98fe3567e06c345f5e4a03a972b24b0f9bad9bb55f43`
- Busca, ordem e paginação: `ev_3d559cd05d9fb9f85871de228d5ce45a659fa5a0e46be8465b8840bc7a963fc1`
- Troca de curso e aula no celular: `ev_13ccd6180e86b0c0066d6599442f4c76e5bef7a27e2442d725ed6bc62df87f60`
- Playlist no computador: `ev_6e5815a15527257d71f4af83a17882df3a0675cca2b4d4a54b6deff154906da2`

As capturas completas ficam no artefato local `ediv-rea-revisao-15out.json`, fora do
repositório. Os vídeos continuam em preparação até o envio do material do corretor.
