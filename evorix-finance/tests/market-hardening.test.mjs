import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
  filterRows,
  isEquityAsset,
  sortedEquityRows,
} from "../server/market/asset-catalog.js";

// Reference: the listing as it was before the snapshot cache (filter, sort,
// then search). The cached rows must produce the same order and the same hits.
function legacyList(items, { search, sortBy, sortOrder }) {
  const normalizedSearch = search.toLocaleLowerCase("pt-BR");
  const sortField = {
    volume: "volume",
    change: "changePercent",
    market_cap: "marketCap",
  }[sortBy];
  const filtered = items
    .filter((asset) => asset.price !== null)
    .filter(isEquityAsset)
    .filter(
      (asset) =>
        !normalizedSearch ||
        `${asset.symbol} ${asset.name} ${asset.sector || ""} ${asset.subSector || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
    );
  filtered.sort((left, right) => {
    const sign = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "name")
      return (
        sign * String(left.name).localeCompare(String(right.name), "pt-BR")
      );
    return (
      sign * ((Number(left[sortField]) || 0) - (Number(right[sortField]) || 0))
    );
  });
  return filtered.map((asset) => asset.symbol);
}

function fixture() {
  const sectors = ["Financeiro", "Energia", "", "Saúde"];
  const items = [];
  for (let i = 0; i < 60; i++) {
    items.push({
      symbol: `TST${String(i).padStart(2, "0")}${i % 3 === 0 ? "3" : "4"}`,
      name: i % 7 === 0 ? "Ação Ç Tie" : `Companhia ${i % 5} Ávila`,
      sector: sectors[i % sectors.length],
      subSector: i % 4 === 0 ? "Bancos" : null,
      price: i % 11 === 0 ? null : 10 + i,
      volume: i % 6 === 0 ? 0 : (i * 37) % 19,
      changePercent: i % 5 === 0 ? null : ((i * 13) % 9) - 4,
      marketCap: i % 8 === 0 ? undefined : i * 1000,
      logoUrl: null,
      type: i % 13 === 0 ? "fund" : "stock",
      subType: i % 17 === 0 ? "bdr" : i % 9 === 0 ? "unit" : "stock",
    });
  }
  return items;
}

test("listagem em cache tem a mesma ordem e as mesmas buscas da versão anterior", () => {
  const items = fixture();
  const sorts = ["volume", "change", "market_cap", "name"];
  const orders = ["asc", "desc"];
  const searches = ["", "tst1", "ÁVILA", "energia", "bancos", "zzz", "ç"];
  for (const sortBy of sorts)
    for (const sortOrder of orders)
      for (const search of searches) {
        const expected = legacyList(items, { search, sortBy, sortOrder });
        const rows = sortedEquityRows(items, sortBy, sortOrder);
        const actual = filterRows(rows, search.toLocaleLowerCase("pt-BR")).map(
          (row) => row.asset.symbol,
        );
        assert.deepEqual(
          actual,
          expected,
          `${sortBy} ${sortOrder} "${search}"`,
        );
      }
});

test("o mesmo snapshot reutiliza as linhas ordenadas e um novo snapshot recalcula", () => {
  const items = fixture();
  const first = sortedEquityRows(items, "volume", "desc");
  assert.equal(sortedEquityRows(items, "volume", "desc"), first);
  assert.notEqual(sortedEquityRows(items, "volume", "asc"), first);
  const next = fixture();
  assert.notEqual(sortedEquityRows(next, "volume", "desc"), first);
});

test("snapshot não é alterado pelas buscas", () => {
  const items = fixture();
  const rows = sortedEquityRows(items, "name", "asc");
  const before = rows.map((row) => row.asset.symbol).join("|");
  filterRows(rows, "tst1").slice(0, 5);
  assert.equal(rows.map((row) => row.asset.symbol).join("|"), before);
});

// The rate limiter stores its counters in MySQL. This stub keeps them in
// memory, with the same column names the limit store reads and writes.
async function startMarketApi() {
  // Placeholder settings only: no connection is opened, the pool is stubbed.
  Object.assign(process.env, {
    NODE_ENV: "development",
    MYSQL_HOST: "db.invalid",
    MYSQL_PORT: "3306",
    MYSQL_USER: "ediv_unit_only",
    MYSQL_PASSWORD: "unit-only-not-a-secret",
    MYSQL_DATABASE: "ediv_unit_only",
    MYSQL_SSL: "false",
    APP_BASE_URL: "http://127.0.0.1:4180",
    APP_ORIGIN: "http://127.0.0.1:4180",
    TRUST_PROXY: "false",
    SMTP_URL: "",
    MAIL_FROM: "",
    BRAPI_API_KEY: "",
  });
  for (const name of [
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_URL",
    "BRAPI_PLAN",
    "BRAPI_DAILY_BUDGET",
  ])
    delete process.env[name];
  const { pool } = await import("../server/database.js");
  const counters = new Map();
  pool.execute = async (sql, params = []) => {
    if (sql.startsWith("DELETE FROM request_limits")) return [{}];
    if (sql.startsWith("INSERT INTO request_limits")) {
      const bucket = params[0];
      const entry = counters.get(bucket) ?? { hits: 0 };
      entry.hits += 1;
      entry.expires = "2099-01-01 00:00:00.000";
      counters.set(bucket, entry);
      return [{}];
    }
    if (sql.startsWith("SELECT hits, expires_at")) {
      const entry = counters.get(params[0]);
      return [entry ? [{ hits: entry.hits, expires_at: entry.expires }] : []];
    }
    throw new Error("SQL inesperado no teste: " + sql.slice(0, 60));
  };
  const { marketRouter } = await import("../server/market.js");
  const app = express();
  app.use("/api/market", marketRouter);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const base = "http://127.0.0.1:" + server.address().port;
  return {
    base,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("rotas que podem chamar o provedor têm limite próprio de 12 por minuto", async () => {
  const api = await startMarketApi();
  try {
    // Not covered by the list: answers without any provider call.
    const path = "/api/market/history/ABCD3?range=1mo";
    const statuses = [];
    for (let i = 0; i < 13; i++) {
      const response = await fetch(api.base + path);
      statuses.push(response.status);
    }
    assert.equal(
      statuses.slice(0, 12).every((status) => status === 200),
      true,
    );
    assert.equal(statuses[12], 429);
  } finally {
    await api.close();
  }
});
