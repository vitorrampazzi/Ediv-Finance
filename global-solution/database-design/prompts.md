# Registro de prompts (IA como copiloto)

O briefing da GS permite usar IA para aprender e revisar, desde que a equipe registre os
prompts em `prompts.md` e saiba explicar cada linha do que entregar. Este arquivo registra o
que foi pedido ao assistente (Claude) na parte de **Database Design**. Revisem antes de usar.

## Prompts

1. *(com o PDF da GS anexado)* “claude segue o documento da minha global solution, analise as
   materias dynamic programing e database design, sao as materias que eu vou estar responsavel,
   preciso que voce desenvolva essas duas materias pra mim. primeiro vamos realizar a gs de
   Database design, me entregue um documento com tudo que eu preciso entregar beleza?”
2. “Vitor Rampazzi franco 562270 / Daniel Brito 566236 / Gustavo Borsato 5646211”
   (integrantes e RMs, para a capa)
3. “chat eu tinha falado pra voce seguir com o tema de metro trem e etc”
   (tema escolhido: Trem, metrô e BRT)

## O que a IA produziu

- Modelo de dados com 11 tabelas e 17 relacionamentos, documentação em PDF e em .docx
  (capa, sumário, objetivo, escopo, funcionalidades, ODS, diagrama, dicionário de dados).
- Scripts DDL, DML e DQL testados num Oracle Database XE 21c.
- Pesquisa de contexto com fontes citadas no PDF (Metrô-SP, Rede Nossa São Paulo/Ipec, DGABC).

## O que a equipe precisa fazer

- Gerar o diagrama no Oracle Data Modeler a partir do DDL (passo a passo no `LEIA-ME.md`).
- Revisar o conteúdo e conferir nome da equipe e RMs.
- Estudar o modelo e as consultas para conseguir explicar cada parte.
