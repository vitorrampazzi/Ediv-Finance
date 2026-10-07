import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicPages, pageMetadata, accountPaths } from "../site-pages.mjs";

test("metadados públicos são únicos e contas/QA não são indexáveis", () => {
  assert.equal(
    new Set(Object.values(publicPages).map((p) => p.title)).size,
    Object.keys(publicPages).length,
  );
  for (const path of Object.keys(publicPages)) {
    assert.match(
      pageMetadata(path).canonical,
      /^https:\/\/escoladodividendo\.com\.br\//,
    );
    assert.equal(pageMetadata(path).noindex, false);
    assert.equal(pageMetadata(path, true).noindex, true);
  }
  for (const path of [...accountPaths, "/app/carteira", "/rota-inexistente"]) {
    assert.equal(pageMetadata(path).noindex, true);
    assert.equal(pageMetadata(path).canonical, null);
  }
});
test("rotas desconhecidas não são reescritas para HTML com status 200", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  assert.equal(
    config.rewrites.some((rule) => ["/(.*)", "/:path*"].includes(rule.source)),
    false,
  );
  for (const path of [
    ...Object.keys(publicPages).filter((p) => p !== "/"),
    ...accountPaths,
  ])
    assert.ok(config.rewrites.some((rule) => rule.source === path));
  const headers = Object.fromEntries(
    config.headers[0].headers.map((header) => [header.key, header.value]),
  );
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Content-Security-Policy"], /script-src 'self';/);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});
