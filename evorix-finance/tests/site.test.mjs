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
  structuredData,
} from "../site-pages.mjs";

test("llms.txt contém somente links públicos canônicos e descreve o acesso restrito", async () => {
  const content = await readFile(
    new URL("../public/llms.txt", import.meta.url),
    "utf8",
  );
  assert.match(content, /^# Escola do Dividendo\r?\n/);
  assert.match(content, /exigem autenticação/);
  assert.match(content, /dados fictícios/);
  assert.match(content, /ranking real/);
  assert.match(content, /sem atualização ao vivo/);
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

test("home usa exatamente o nome público da marca no título", () => {
  const home = pageMetadata("/");
  assert.equal(home.title, "Escola do Dividendo");
  assert.ok(home.title.length <= 60);
  assert.ok(home.description.length <= 160);
  assert.equal(home.canonical, "https://escoladodividendo.com.br/");
});

test("aba do navegador mostra só a marca em todas as rotas", () => {
  for (const path of [
    ...Object.keys(publicPages),
    ...accountPaths,
    "/app",
    "/app/ranking",
    "/404",
  ])
    assert.equal(pageMetadata(path).title, "Escola do Dividendo");
  assert.equal(
    pageMetadata("/ranking").socialTitle,
    "Ranking de Ações | Escola do Dividendo",
  );
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

test("dados estruturados: marca na home e trilha nas páginas públicas", () => {
  const [organization, website] = structuredData("/");
  assert.equal(organization["@type"], "Organization");
  assert.equal(organization.url, siteOrigin + "/");
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.name, "Escola do Dividendo");
  const [crumbs] = structuredData("/ranking/");
  assert.equal(crumbs["@type"], "BreadcrumbList");
  assert.deepEqual(
    crumbs.itemListElement.map((item) => [item.name, item.item]),
    [
      ["Início", siteOrigin + "/"],
      ["Ranking de Ações", siteOrigin + "/ranking"],
    ],
  );
  for (const path of [...accountPaths, "/app", "/app/ranking", "/404"])
    assert.deepEqual(structuredData(path), []);
  assert.deepEqual(structuredData("/ranking", true), []);
});

test("cada página pública tem a data real da última mudança de conteúdo", () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const [path, page] of Object.entries(publicPages)) {
    assert.match(page.updated, /^\d{4}-\d{2}-\d{2}$/, path);
    assert.ok(page.updated <= today, path);
  }
});

test("página de empresa só é indexável fora de QA e sem canonical na casca", () => {
  const shell = pageMetadata("/ranking/acao/TIMS3");
  assert.equal(shell.noindex, false);
  assert.equal(shell.canonical, null);
  assert.equal(shell.title, "Escola do Dividendo");
  assert.equal(pageMetadata("/ranking/acao/TIMS3", true).noindex, true);
  assert.equal(pageMetadata("/app/ranking/acao/TIMS3").noindex, true);
  assert.equal(pageMetadata("/ranking/acao/../x").noindex, true);
});
