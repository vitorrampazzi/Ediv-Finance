import test from "node:test";
import assert from "node:assert/strict";
import { researchModuleSummary } from "../research-module-summary.mjs";

test("demo resume os valores exatos do detalhe, incluindo negativos e zero", () => {
  const entry = {
    balanceSheet:
      "Ativos totais: R$ 1.600 mi\nPassivos totais: R$ 700 mi\nPatrimônio líquido: R$ 900 mi",
    incomeStatement:
      "Receita líquida: R$ 240 mi\nLucro líquido: R$ 48 mi\nMargem líquida: 20%",
    cashFlow:
      "Caixa operacional: R$ 72 mi\nCaixa de investimentos: R$ -35 mi\nVariação de caixa: R$ -3 mi",
    companyInformation:
      "Empresa: Exemplo (fictícia)\nSetor: Energia\nCódigo demonstrativo: DEMO1",
    netDebt:
      "Dívida bruta: R$ 120 mi\nCaixa e equivalentes: R$ 120 mi\nDívida líquida: R$ 0 mi",
    statistics:
      "Margem líquida: 20%\nReferência simulada: R$ 18,00\nPreço-alvo simulado: R$ 22,50",
  };
  assert.deepEqual(researchModuleSummary(entry, "balanceSheet", true), [
    { label: "Ativos totais", value: "R$ 1.600 mi" },
    { label: "Patrimônio líquido", value: "R$ 900 mi" },
  ]);
  assert.deepEqual(
    researchModuleSummary(entry, "incomeStatement", true).map(
      (line) => line.value,
    ),
    ["R$ 240 mi", "R$ 48 mi"],
  );
  assert.deepEqual(
    researchModuleSummary(entry, "cashFlow", true).map((line) => line.value),
    ["R$ 72 mi", "R$ -3 mi"],
  );
  assert.deepEqual(
    researchModuleSummary(entry, "companyInformation", true).map(
      (line) => line.value,
    ),
    ["Energia", "DEMO1"],
  );
  assert.deepEqual(researchModuleSummary(entry, "netDebt", true)[0], {
    label: "Dívida líquida",
    value: "R$ 0 mi",
  });
  assert.deepEqual(researchModuleSummary(entry, "statistics", true)[0], {
    label: "Margem líquida",
    value: "20%",
  });
});

test("publicação real mantém texto publicado sem selecionar ou inventar métricas de demo", () => {
  const entry = {
    netDebt:
      "Fonte: relatório anual\nDívida líquida: não divulgada\nNotas adicionais",
  };
  assert.deepEqual(researchModuleSummary(entry, "netDebt"), [
    { label: null, value: "Fonte: relatório anual" },
    { label: null, value: "Dívida líquida: não divulgada" },
  ]);
  assert.deepEqual(researchModuleSummary({ netDebt: "0" }, "netDebt"), [
    { label: null, value: "0" },
  ]);
});

test("dados ausentes/inválidos nunca ganham números fictícios", () => {
  for (const value of [null, undefined, "", " \n ", 0, {}]) {
    assert.deepEqual(
      researchModuleSummary({ statistics: value }, "statistics", true),
      [],
    );
  }
  assert.deepEqual(
    researchModuleSummary({ ticker: "PETR4" }, "statistics"),
    [],
  );
  assert.deepEqual(
    researchModuleSummary({ __proto__: "anything" }, "__proto__", true),
    [],
  );
});

test("resumo real longo sinaliza redução e não altera a origem", () => {
  const text = "Conteúdo publicado ".repeat(40);
  const entry = { companyInformation: text };
  const result = researchModuleSummary(entry, "companyInformation");
  assert.equal(result[0].value.endsWith("…"), true);
  assert.equal(result[0].value.length <= 181, true);
  assert.equal(entry.companyInformation, text);
});
