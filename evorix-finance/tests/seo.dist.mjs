// Checks the built site the way a crawler receives it. Run after `npm run build`.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  accountPaths,
  publicPages,
  retiredPages,
  siteOrigin,
} from "../site-pages.mjs";

const dist = new URL("../dist/", import.meta.url);
const read = (file) => readFileSync(new URL(file, dist), "utf8");
const pageFile = (path) =>
  path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
const meta = (html, attr, name) =>
  html.match(
    new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`),
  )?.[1];
const root = (html) => html.slice(html.indexOf('<div id="root">'));

test("páginas públicas chegam prontas para indexação", () => {
  const descriptions = new Set();
  for (const path of Object.keys(publicPages)) {
    const html = read(pageFile(path));
    const canonical = siteOrigin + path;
    assert.match(html, /<title>Escola do Dividendo<\/title>/, path);
    const description = meta(html, "name", "description");
    assert.ok(description && description.length >= 50, path);
    assert.ok(!descriptions.has(description), `descrição repetida em ${path}`);
    descriptions.add(description);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="${canonical}"`),
      path,
    );
    assert.equal(meta(html, "property", "og:url"), canonical, path);
    assert.equal(meta(html, "name", "robots"), "index, follow", path);
    assert.equal(root(html).match(/<h1[\s>]/g)?.length, 1, `um h1 em ${path}`);
    const schemas = [
      ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
    ].map(([, json]) => JSON.parse(json));
    assert.ok(schemas.length, `dados estruturados em ${path}`);
    for (const schema of schemas)
      assert.equal(schema["@context"], "https://schema.org", path);
  }
});

test("contas, área logada e 404 ficam fora do índice", () => {
  for (const file of [...accountPaths.map(pageFile), "app.html", "404.html"]) {
    const html = read(file);
    assert.equal(meta(html, "name", "robots"), "noindex, nofollow", file);
    assert.doesNotMatch(html, /rel="canonical"/, file);
    assert.equal(meta(html, "property", "og:url"), undefined, file);
    assert.doesNotMatch(html, /application\/ld\+json/, file);
  }
});

test("sitemap lista só páginas públicas, com a data real de cada uma", () => {
  const sitemap = read("sitemap.xml");
  assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?><urlset /);
  const urls = [
    ...sitemap.matchAll(
      /<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g,
    ),
  ].map(([, loc, lastmod]) => [loc, lastmod]);
  assert.deepEqual(
    urls,
    Object.entries(publicPages).map(([path, page]) => [
      siteOrigin + path,
      page.updated,
    ]),
  );
});

test("robots.txt bloqueia só o que é privado e aponta o sitemap", () => {
  const robots = read("robots.txt");
  for (const rule of ["/api/", "/app", "/verificar", "/redefinir-senha"])
    assert.match(robots, new RegExp(`^Disallow: ${rule}$`, "m"));
  for (const path of Object.keys(publicPages).filter((path) => path !== "/"))
    assert.doesNotMatch(robots, new RegExp(`^Disallow: ${path}$`, "m"));
  assert.match(robots, new RegExp(`^Sitemap: ${siteOrigin}/sitemap.xml$`, "m"));
});

test("links internos das páginas públicas levam a rotas existentes", () => {
  const known = new Set([
    ...Object.keys(publicPages),
    ...accountPaths,
    ...Object.keys(retiredPages),
  ]);
  const broken = [];
  for (const path of Object.keys(publicPages)) {
    for (const [, href] of root(read(pageFile(path))).matchAll(
      /href="(\/[^"#]*)/g,
    )) {
      const target = href.split("?")[0].replace(/(.)\/$/, "$1");
      const ok =
        known.has(target) ||
        target.startsWith("/app") ||
        /^\/ranking\/acao\/[A-Za-z0-9]+$/.test(target) ||
        existsSync(new URL(target.slice(1), dist));
      if (!ok) broken.push(`${path} → ${href}`);
    }
  }
  assert.deepEqual(broken, []);
});
