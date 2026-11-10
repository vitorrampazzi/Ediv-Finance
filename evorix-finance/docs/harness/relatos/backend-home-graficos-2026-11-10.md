# Backend: histórico anual de lucro e payout na importação (10/11/2026)

## Objetivo

Implementar a seção "Dados: duas colunas opcionais na planilha da pesquisa" de
`docs/HOME-E-GRAFICOS-2026-11-10.md`. Sem `src/`, `package.json`, `.env`,
migração, commit, push ou deploy. Banco não usado.

## Arquivos

- `server/dividend-import.js`
  - `annualHistoryColumns` (l. 16), `netIncomeValue` (l. 30), `payoutValue`
    (l. 48), `parseAnnualSeries` (l. 65), `parseAnnualHistory` (l. 114),
    `mergeHistory` (l. 128).
  - `parseDividendRows`: as 21 colunas continuam obrigatórias e únicas. As duas
    opcionais (`Lucro líquido anual`, `Payout anual`; normalizadas, então
    `lucro_liquido_anual` e `payout_anual` também valem) entram em qualquer
    posição (l. 155). Qualquer outra coluna continua recusada, e a mensagem agora
    cita as duas opcionais. A entrada ganha `annualHistory` logo depois de
    `dividendAnalysis` (l. 227).
  - `parseDividendWorkbook`: cada série pode vir em uma só aba. Se vier nas duas,
    precisa ser igual; senão o erro é o "Dados conflitantes" de sempre (l. 281).
  - Planilha legada (`parseRows`): os aliases `lucro_liquido_anual` e
    `payout_anual` (l. 351) geram o mesmo `annualHistory` (l. 457). É preciso
    porque o modelo para download (`/modelos/ranking.csv`) é o legado.
- `server/research-diff.js`: `annualHistory` entra em `researchKeys` e a
  comparação é canônica (ordem de chaves e ausência contra `null` não contam
  como mudança). Publicações antigas sem a chave não aparecem como alteradas.
- `public/modelos/ranking.csv`: `lucro_liquido_anual;payout_anual` no fim,
  vazias. BOM e CRLF mantidos.
- `docs/RANKING-CORRETOR.md`: nova seção curta com as colunas e o formato.
- `docs/DASHBOARD-DIVIDENDOS.md`: um parágrafo ligando as duas colunas.
- Testes: `tests/dividend-import.test.mjs` (+8) e `tests/public-ranking.test.mjs`
  (+1). Nenhum arquivo de teste novo, então `package.json` não precisa mudar.

## Formato guardado

```json
"annualHistory": {
  "netIncome": [ { "year": 2022, "value": "-1500000" },
                 { "year": 2024, "value": "2345678900.00" } ],
  "payout":    [ { "year": 2023, "value": "0.452000" } ]
}
```

- `year` é número, e `value` é sempre texto. Cada lista sai em ordem de ano.
- Uma célula vazia deixa sua chave como `null`. Com as duas vazias (ou sem as
  colunas), `"annualHistory": null`.
- `netIncome` guarda o decimal em reais com ponto como separador decimal,
  preservando as casas digitadas. O ponto entre grupos de três dígitos é milhar
  (`1.234` vira `1234`), e `R$` no início é aceito.
- `payout` aceita porcentagem com ou sem `%` e vírgula ou ponto decimal, e
  guarda a fração com 6 casas via `toFixed(6)` (`-0.000000` vira `0.000000`).
- Pares `ANO: valor` ou `ANO = valor`, separados por `;` ou quebra de linha.
- Ano de 1990 até o ano corrente, sem repetir. Até 30 pares e 1.500 caracteres
  por célula.
- Lucro até 1e15 em valor absoluto; payout de −1000% a 1000%.
- Os erros são `ImportError` em português com "na linha N" (contando o
  cabeçalho), como os demais.

## Rota pública

`publicRanking` e `publicRankingWithMarket` montam cada entrada campo a campo
(`rank`, `ticker`, `companyName`, três métricas e `market`), então
`annualHistory` não sai. Um teste novo confere isso nos dois. `GET
/api/rankings` (logado) e a prévia da equipe devolvem a entrada inteira, com
`annualHistory`. A publicação grava `JSON.stringify(entries)` em `entries_json`
sem filtrar campos, então prévia, publicação, comparação e histórico carregam
o campo sem outra mudança em `server/rankings.js`.

## Verificações

- `node --test tests/dividend-import.test.mjs`: 18/18 passou (10 antigos + 8 novos).
- `node --test tests/public-ranking.test.mjs`: 5/5 passou (+1).
- `npm test`: 266/266 passou.
- `npm run lint`: passou.
- Não executados: `test:integration`, browser e build. Exigem MySQL descartável
  ou não cobrem esta mudança, e o Aiven está desligado.

## Riscos e pendências

1. **Tela de comparação (frontend).** `src/components/ResearchTools.tsx` não tem
   rótulo nem renderização para `annualHistory`. Quando o histórico muda entre
   versões, a tela mostra a chave crua e `[object Object]`. Sugestão: rótulo
   "Histórico anual" e lista ano a valor (lucro em R$, payout em %). Pode ser
   necessário ajustar também o tipo `Entry`.
2. **Impressão digital da publicação.** As entradas novas sempre trazem
   `annualHistory` (mesmo `null`). Reenviar um arquivo idêntico a uma publicação
   anterior a esta mudança gera uma versão nova em vez de reaproveitar a antiga.
   É uma única vez, sem perda de dados.
3. **Ano corrente** pelo relógio do servidor (UTC na Vercel). Na virada do ano,
   pode diferir por algumas horas do horário de Brasília.
4. **Ambiguidade no lucro.** `1.234` é lido como milhar. Quem digitar um decimal
   com ponto e três casas terá o valor multiplicado por mil. Está documentado no
   guia do corretor.
5. O XLSX com as duas colunas foi coberto pelo parser e pelo CSV, não por um
   arquivo XLSX real: o gerador de XLSX dos testes só conhece as 21 colunas.

## Próximo passo

Interface: consumir `annualHistory` nos gráficos e na tela de comparação
(item 1). QA: validar importação real com as duas colunas em ambiente de teste.
