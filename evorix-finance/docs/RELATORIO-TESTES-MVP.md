# Testes do MVP — 9 de outubro de 2026

## Escopo e resultados

A rodada percorreu os fluxos atuais de pesquisa de ações, aprendizado, suporte e conta. Testes de cálculo e segurança também cobrem APIs antigas ainda mantidas no servidor, mesmo sem carteira no menu do MVP.

| Verificação                                 | Resultado                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Unitários                                   | 24 aprovados                                                                |
| API com Express e MySQL reais               | 15 cenários aprovados; 16 testes no contador do Node, incluindo o teste pai |
| Navegador: fluxos principais                | 31 aprovados                                                                |
| Navegador: falhas, aprendizado e importação | 16 aprovados                                                                |
| Backup e restauração                        | Aprovados em bancos temporários                                             |
| Cadastro real em produção                   | 3 verificações aprovadas, incluindo a limpeza                               |
| Leituras após o deploy em produção          | 29 aprovadas                                                                |
| Lint, TypeScript e build                    | Aprovados; HTML gerado para as 9 rotas públicas                             |

As duas suítes de navegador capturaram **zero exceções de JavaScript**. As telas públicas e da equipe foram verificadas em larguras de 360, 768 e 1366 px, incluindo ausência de rolagem horizontal da página. A prévia de planilha pode rolar dentro da sua tabela.

## Conta e segurança

- Campos obrigatórios e e-mail inválido impedem o envio do formulário.
- Cadastro cria conta pendente; login só funciona depois da confirmação.
- Reenvio de confirmação gera outro link e bloqueia repetição imediata.
- Confirmação faz apenas uma requisição, inclusive com repetição de efeitos do React em desenvolvimento. O token permanece de uso único.
- Senha errada é recusada; login correto recupera o destino solicitado.
- Mostrar/ocultar senha preserva o valor digitado.
- Logout bloqueia novamente as páginas privadas.
- Recuperação, confirmação das duas senhas e troca de senha atual foram exercitadas pelo formulário.
- Encerrar todas as sessões também invalida uma segunda janela.
- Exportação contém somente dados da própria conta e não expõe hashes.
- Exclusão exige senha e a palavra `EXCLUIR`; cancelar preserva a conta, senha errada é recusada e a exclusão válida impede novo login.
- Usuário comum não acessa Administração ou Atendimentos da equipe. Administrador pode alterar perfis e consultar a auditoria, inclusive no celular.
- A API rejeita escrita de origem externa, acesso a dados de outras contas e tentativas de obter privilégios no cadastro. Bloqueio da conta revoga sessões; o último administrador é protegido.

## Pesquisas, importação e análise

- Visitante recebe a apresentação e o convite para cadastro sem acesso aos dados privados do ranking.
- Busca, estado sem resultados e limpeza dos filtros recuperam a lista correta.
- Abrir uma empresa começa no topo; navegação entre empresas preserva a publicação consultada. Links externos usam as proteções esperadas.
- Comparações de empresas e versões, explicações de indicadores e notificações foram verificadas.
- Rascunho recupera dados, metadados e campos incompletos. A API rejeita sobrescrita de uma revisão desatualizada.
- Alterar dados ou autoria invalida a prévia. A publicação depende da confirmação explícita e preserva as versões anteriores.
- Importação pelo seletor de arquivos aceita CSV e Excel. O Excel fictício preservou potencial `27.5` e preço-alvo `42.75` na prévia, no MySQL e na tela da empresa.
- Extensão inválida, arquivo acima de 1 MB, Excel corrompido e ticker repetido foram recusados. Trocar o arquivo descarta a prévia anterior.
- Falha de catálogo apresenta erro e nova tentativa; não aparece como se existissem zero ações.

## Aprendizado e suporte

- Visitante conclui a primeira aula com progresso local e não recebe o texto das aulas restritas.
- Respostas corretas são validadas no servidor; resposta errada não conclui a aula.
- Progresso da conta persiste após recarga e em outra sessão.
- Falha de carregamento ou salvamento oferece nova tentativa sem conclusão fictícia.
- Reiniciar exercícios pede confirmação; cancelar preserva o progresso.
- Playlist móvel mantém foco e posição, e o botão Voltar restaura a aula.
- Laboratório calcula dividend yield, payout e potencial; denominador zero é recusado.
- Sessão expirada durante o salvamento retorna ao login sem gravar progresso indevido.
- Pergunta privada, resposta do analista e atualização para o usuário foram exercitadas. A API impede leitura de conversas de outra conta e respostas por usuário comum.
- Falha simulada da IA experimental mantém a alternativa educativa. A API da IA permanece desativada em produção.

## Correções encontradas nesta rodada

1. **Confirmação de e-mail:** abortar a primeira requisição não desfazia um token já consumido no servidor. O efeito repetido podia fazer outra requisição e mostrar erro após confirmar. Agora o componente reutiliza a mesma requisição e tem limite de espera. O teste verifica que há somente um POST.
2. **Editor de pesquisa:** os contadores de caracteres entravam no nome acessível dos campos. Agora os campos têm identificação estável e o contador é uma descrição separada.
3. **Assessoria:** a página pública não tinha título H1. A hierarquia do título foi corrigida, preservando sua aparência.

Os seletores antigos dos testes também foram atualizados para os controles do MVP atual.

## Produção e isolamento

As correções foram publicadas em `main`, no commit `c45276d`, com [deploy aprovado na Vercel](https://vercel.com/vitors-projects-7b84bd52/ediv-finance/84dhtxCRNHJoC2iz6oFb3TFxHLcY). Após a publicação, o domínio oficial passou nas **29 verificações de leitura**: páginas públicas e de conta, títulos e metadados públicos, headers de segurança, URL inexistente com 404, conexão MySQL, bloqueios de visitante, catálogo real de ações/units, acesso às aulas, informações públicas de suporte, sitemap e IA desativada.

O navegador também exibiu o título H1 corrigido da Assessoria em produção, sem avisos ou erros de console capturados nessa visita. Antes da correção, a rodada inicial de produção havia identificado a ausência desse H1.

Foi criado um único cadastro temporário em produção, com alias do e-mail do proprietário e autorização específica. O servidor respondeu 202 ao cadastro com SMTP configurado, ocultou o token da resposta e recusou login antes da confirmação. A conta e seus tokens foram removidos por identidade exata ao terminar. Contas existentes e senhas não foram alteradas.

O restante das operações de criação, publicação, edição, exclusão e restauração ocorreu em schemas aleatórios `ediv_test_*`, com contas e pesquisas fictícias. A consulta final confirmou **zero schemas temporários remanescentes** no Aiven.

O backup foi testado com dados sintéticos: chave errada e destino já preenchido foram recusados, e contas, perfis, rascunhos, progresso e notificações foram restaurados. Sessões não foram restauradas. Nenhuma chave de backup existente foi substituída.

## Repetir os testes

```powershell
npm test
npm run test:integration:aiven
npm run test:browser:aiven
npm run test:backup:aiven
npm run lint
npm run build
npm run test:production
```

`test:browser:aiven` executa as duas suítes em processos separados e de forma sequencial. Os mesmos testes entram no CI pelo comando `test:browser`, usando o MySQL descartável do runner, sem credenciais de produção. `test:production` faz apenas leituras do domínio oficial; o teste de cadastro real não faz parte desse comando ou do CI.

Relatórios JSON e capturas ficam em `.test-artifacts/`, ignorado pelo Git. As credenciais continuam nos arquivos locais de ambiente ignorados.

## Limites da evidência

- Navegador automatizado: Chromium, com redução de movimento. Esta rodada não constitui validação completa de Safari, Firefox, aparelhos físicos, leitores de tela ou carga de muitos usuários simultâneos.
- Nos testes isolados, brapi e Gemini foram simulados para controlar falhas e cotas. Em produção, o catálogo e o MySQL reais foram consultados.
- O cadastro real comprovou aceitação do envio pelo SMTP. Recebimento na caixa de entrada, spam e leitura do e-mail dependem do destinatário. A confirmação pelo link foi testada no ambiente isolado.
- Reprodução e conclusão de vídeos reais do curso ainda dependem do envio e da configuração dos vídeos do corretor.
- Os dados de autoria, registro e contato e a pesquisa real ainda dependem do responsável. Esta rodada valida o funcionamento da ferramenta e não o conteúdo das previsões.
- Nenhuma suíte garante ausência de todos os defeitos possíveis; os resultados se referem aos cenários descritos e às execuções desta rodada.
