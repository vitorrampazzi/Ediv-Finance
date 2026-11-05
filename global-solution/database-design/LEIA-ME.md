# GS 2026.2 · Database Design · Embarque Certo

CitizenTech da equipe: **Embarque Certo**, com lotação, atrasos e informação em tempo real
para quem depende de trem, metrô e BRT em São Paulo.

Prazo: **19/11, às 23h55**, na tarefa de Database Design do Teams. Só um integrante envia.

## O que enviar (4 arquivos)

| Item do enunciado | Pontos | Arquivo |
|---|---|---|
| 1. Apresentação do projeto (capa, sumário, objetivo e escopo, funcionalidades) | 10 | `EmbarqueCerto_DatabaseDesign.pdf` |
| 2. Diagrama do modelo lógico (Oracle Data Modeler) | 20 | `EmbarqueCerto_DatabaseDesign.pdf` (seção 2.2) |
| 3. Script DDL | 20 | `sql/01_DDL_EmbarqueCerto.sql` |
| 4. Script DML (5 linhas ou mais por tabela) | 20 | `sql/02_DML_EmbarqueCerto.sql` |
| 5. Script DQL (3 consultas) | 30 | `sql/03_DQL_EmbarqueCerto.sql` |

Não envie a pasta `apoio/` nem a pasta `_gerador/`, e não coloque link de diagrama em nuvem.

## Antes de enviar (pendências)

1. **Gerar o diagrama no Oracle Data Modeler (item 2, 20 pontos).** O enunciado pede o
   diagrama *feito no Oracle Data Modeler*. A Figura 1 do PDF foi gerada a partir do mesmo
   modelo, mas não saiu do Data Modeler. Faça a troca assim (leva uns 5 minutos):
   1. Abra o **Oracle SQL Developer Data Modeler**.
   2. **File > Import > DDL File** e selecione `apoio/DDL_importar_no_Data_Modeler.sql`
      (é o mesmo DDL, sem o bloco de limpeza, que atrapalha a importação).
   3. Escolha **Oracle Database 19c** (ou a versão mais próxima) e confirme.
      Na janela de comparação, clique em **Merge**.
   4. O diagrama relacional aparece com as 11 tabelas e os 17 relacionamentos. Organize com
      botão direito > **Auto Layout** e ajuste à mão, usando a Figura 1 do PDF como guia.
   5. Se o professor quiser também o *modelo lógico* com entidades: com o diagrama relacional
      aberto, clique em **Engineer to Logical Model** (botão `<<`) e depois em **Engineer**.
      Em **View > Logical Diagram Notation**, escolha **Information Engineering** para ver as
      cardinalidades em pé de galinha.
   6. Exporte com **File > Print Diagram > To Image File** (PNG).
   7. Abra `EmbarqueCerto_DatabaseDesign_editavel.docx`, troque a imagem da página do
      diagrama pela sua e ajuste a legenda para *“…gerado no Oracle SQL Developer Data
      Modeler”*. Depois use **Arquivo > Salvar como > PDF**.
      Outra opção: mande o PNG para o Claude e peça o PDF final com a figura nova.
   Os menus podem mudar um pouco conforme a versão ou o idioma do Data Modeler.
2. **Nome da equipe:** na capa está *Embarque Certo*. Se a equipe usa outro nome, troque.
3. **RM do Gustavo:** veio como `5646211` (7 dígitos; os outros têm 6). Confira.
4. **Mesma solução nas 7 disciplinas:** mande a *Ficha da CitizenTech* (seção 1.2 do PDF)
   para a equipe. O pessoal de Java (DDD) pode reaproveitar estas tabelas no DER deles.

## Como testar os scripts no Oracle da FIAP

No SQL Developer, conectado ao Oracle da FIAP (o mesmo das aulas), abra os arquivos nesta
ordem e rode cada um com **Executar Script (F5)**:

1. `01_DDL_EmbarqueCerto.sql` cria 11 tabelas e 17 chaves estrangeiras. Pode rodar de novo
   à vontade: o bloco do início apaga as tabelas do projeto antes de recriar.
2. `02_DML_EmbarqueCerto.sql` insere 132 linhas (de 5 a 22 por tabela) e faz COMMIT.
3. `03_DQL_EmbarqueCerto.sql` executa as 3 consultas e devolve 10, 9 e 5 linhas.

Tudo foi testado no Oracle Database XE 21c, sem erros. Se os acentos aparecerem estranhos no
SQL Developer, vá em *Tools > Preferences > Environment > Encoding* e escolha **UTF-8**.

## Para explicar o projeto (cada integrante precisa saber)

- **3 blocos:** rede (operadora, linha, estação, linha_estacao), informação em tempo real
  (tipo, ocorrência, confirmação, registro de lotação) e passageiro (usuário, trajeto, alerta).
- **3 relacionamentos N:N** viraram tabelas associativas com chave composta:
  `LINHA_ESTACAO`, `CONFIRMACAO` e `ALERTA`.
- **2 chaves estrangeiras opcionais** em `OCORRENCIA`: `id_estacao` (NULL = linha inteira) e
  `id_usuario` (NULL = aviso oficial). A constraint `ck_ec_ocorrencia_autor` garante a regra.
- **TRAJETO liga duas vezes em ESTACAO** (origem e destino): mesma tabela, papéis diferentes.
- **Consultas:** 1) ocorrências por estação (INNER JOIN); 2) ranking de lotação no pico com
  COUNT/AVG/MAX (INNER JOIN + GROUP BY); 3) painel “situação das linhas” com LEFT OUTER JOIN.
  Na consulta 3, o filtro de situação fica no `ON` para não sumir com as linhas sem ocorrência.
- **Ponte com Dynamic Programming:** `T_EC_LINHA_ESTACAO` guarda a rede como grafo (ordem e
  minutos entre estações) e `T_EC_ESTACAO.nr_min_baldeacao` guarda o tempo de troca de linha.
  O algoritmo de rotas da próxima entrega usa esses dados.

## Arquivos desta pasta

```
database-design/
├── EmbarqueCerto_DatabaseDesign.pdf           ← entregar (itens 1 e 2)
├── EmbarqueCerto_DatabaseDesign_editavel.docx ← para trocar o diagrama ou o nome da equipe
├── sql/                                        ← entregar (itens 3, 4 e 5)
├── apoio/                                      ← não entregar: DDL para o Data Modeler e diagrama em PNG/SVG
├── _gerador/                                   ← não entregar: scripts que geram o PDF e o .docx
├── prompts.md                                  ← registro do uso de IA, pedido no briefing
└── LEIA-ME.md
```
