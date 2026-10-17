import test from "node:test";
import assert from "node:assert/strict";
import {
  companyLogoUrl,
  companySymbol,
  companyFallback,
} from "../company-logo.mjs";

test("preserva classe ON, PN e units e normaliza somente caixa/espaços", () => {
  for (const symbol of ["PETR3", "PETR4", "ITUB4", "TAEE11", "B3SA3"]) {
    assert.equal(
      companyLogoUrl(` ${symbol.toLowerCase()} `),
      `https://icons.brapi.dev/icons/${symbol}.svg`,
    );
  }
});

test("empresas fictícias e símbolos inválidos não solicitam imagens reais", () => {
  assert.equal(companyLogoUrl("PETR4", undefined, true), null);
  for (const value of [
    "",
    "../PETR4",
    "PETR4.SA",
    "^BVSP",
    "BTC-USD",
    "javascript:alert(1)",
    null,
  ]) {
    assert.equal(companySymbol(value), null);
    assert.equal(companyLogoUrl(value), null);
  }
});

test("origens arbitrárias, credenciais e URLs de outra empresa nunca chegam à imagem", () => {
  const canonical = "https://icons.brapi.dev/icons/PETR4.svg";
  for (const value of [
    "http://icons.brapi.dev/icons/PETR4.svg",
    "https://evil.test/logo.svg",
    "data:image/svg+xml,<svg/>",
    "https://icons.brapi.dev.evil.test/icons/PETR4.svg",
    "https://user:secret@icons.brapi.dev/icons/PETR4.svg",
    "https://icons.brapi.dev/icons/ITUB4.svg",
    `${canonical}?token=secret`,
    `${canonical}#anything`,
  ]) {
    assert.equal(companyLogoUrl("PETR4", value), canonical);
  }
  assert.equal(companyLogoUrl("PETR4", canonical), canonical);
});

test("fallback é texto do ticker, sem supor identidade de marca", () => {
  assert.equal(companyFallback(" petr4 "), "PETR4");
  assert.equal(companyFallback("EXEM11"), "EXEM11");
  assert.equal(companyFallback(null), "—");
});
