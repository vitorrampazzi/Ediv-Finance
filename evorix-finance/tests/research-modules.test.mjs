import test from "node:test";
import assert from "node:assert/strict";
import {
  researchModules,
  hasResearchModule,
  researchModuleAnchor,
  researchModuleLink,
} from "../research-modules.mjs";

test("módulos são os seis conteúdos pedidos, com âncoras únicas", () => {
  assert.deepEqual(
    researchModules.map(({ key }) => key),
    [
      "balanceSheet",
      "incomeStatement",
      "cashFlow",
      "companyInformation",
      "netDebt",
      "statistics",
    ],
  );
  assert.equal(new Set(researchModules.map(({ anchor }) => anchor)).size, 6);
});

test("disponibilidade exige texto publicado, não valores de métricas nem whitespace", () => {
  assert.equal(
    hasResearchModule(
      { balanceSheet: "Ativos: consulte o relatório" },
      "balanceSheet",
    ),
    true,
  );
  assert.equal(hasResearchModule({ netDebt: "0" }, "netDebt"), true);
  for (const value of [undefined, null, "", " \n\t", 0, 100, {}, []]) {
    assert.equal(
      hasResearchModule({ balanceSheet: value }, "balanceSheet"),
      false,
    );
  }
  assert.equal(hasResearchModule({ thesis: "Texto" }, "thesis"), false);
  assert.equal(hasResearchModule(null, "balanceSheet"), false);
});

test("link de módulo preserva ticker, versão, modo e filtros; substitui apenas hash", () => {
  const base =
    "/app/ranking/acao/PETR4?visual=real&publication=27&busca=petro&setor=Energia&prazo=12&ordem=company";
  assert.equal(
    researchModuleLink(base, "balanceSheet"),
    `${base}#pesquisa-balanco`,
  );
  assert.equal(
    researchModuleLink(`${base}#riscos`, "netDebt"),
    `${base}#pesquisa-divida-liquida`,
  );
  assert.equal(researchModuleLink(base, "not-a-module"), base);
  assert.equal(researchModuleAnchor("__proto__"), null);
});
