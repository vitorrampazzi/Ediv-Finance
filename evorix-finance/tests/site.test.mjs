import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  publicPages,
  pageMetadata,
  accountPaths,
  retiredPages,
  retiredPageDestination,
  siteOrigin,
} from "../site-pages.mjs";

test("llms.txt contém somente links públicos canônicos e descreve o acesso restrito", async () => {
  const content = await readFile(
    new URL("../public/llms.txt", import.meta.url),
    "utf8",
  );
  assert.match(content, /^# Escola do Dividendo\n/);
  assert.match(content, /exigem autenticação/);
  assert.match(content, /dados fictícios/);
  const links = [...content.matchAll(/\]\((https?:\/\/[^)]+)\)/g)];
  assert.ok(links.length >= 5);
  for (const [, href] of links) {
    const url = new URL(href);
    assert.equal(url.origin, siteOrigin);
    assert.ok(Object.hasOwn(publicPages, url.pathname));
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
  }
});

test("home apresenta dividendos e pesquisa de ações nos metadados", () => {
  const home = pageMetadata("/");
  assert.match(home.title, /Dividendos.*pesquisa de ações/);
  assert.ok(home.title.length <= 60);
  assert.ok(home.description.length <= 160);
  assert.equal(home.canonical, "https://escoladodividendo.com.br/");
});

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

test("catálogo retirado não é indexável e links antigos redirecionam para ranking", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  for (const [source, destination] of Object.entries(retiredPages)) {
    assert.equal(publicPages[source], undefined);
    assert.equal(pageMetadata(source).noindex, true);
    assert.equal(retiredPageDestination(source + "/"), destination);
    assert.ok(
      config.redirects.some(
        (rule) =>
          rule.source === source &&
          rule.destination === destination &&
          rule.permanent,
      ),
    );
    assert.equal(
      config.rewrites.some((rule) => rule.source === source),
      false,
    );
  }
  assert.equal(retiredPageDestination("/ranking"), null);
  assert.equal(retiredPageDestination("/app/ranking/acao/DEMO1"), null);
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
  const directives = Object.fromEntries(
    headers["Content-Security-Policy"]
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources]),
  );
  assert.deepEqual(directives["script-src"], [
    "'self'",
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
  ]);
  assert.deepEqual(directives["object-src"], ["'none'"]);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});
