import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { publicPages, accountPaths } from "../site-pages.mjs";

// Production checks are read-only: no account, publication or message is created.
const root = "https://escoladodividendo.com.br";
const checks = [];
async function check(name, work) {
  try {
    const evidence = await work();
    checks.push({ name, status: "passed", evidence });
    console.info("PASS:", name);
  } catch (error) {
    checks.push({ name, status: "failed", error: error.message });
    console.error("FAIL:", name, error.message);
  }
}
async function get(path) {
  return fetch(root + path, { signal: AbortSignal.timeout(30000) });
}
await mkdir(".test-artifacts", { recursive: true });
for (const [path, meta] of Object.entries(publicPages)) {
  await check(`Produção: HTML público ${path}`, async () => {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    for (const header of [
      "content-security-policy",
      "referrer-policy",
      "x-frame-options",
      "permissions-policy",
    ])
      assert.ok(response.headers.get(header), header + " ausente");
    const html = await response.text();
    assert.ok(html.includes(meta.title), "Título da rota ausente");
    assert.ok(/<h1[\s>]/.test(html), "A página não tem título H1");
    assert.match(html, /rel="canonical"/);
    return {
      status: response.status,
      title: meta.title,
      securityHeaders: true,
      prerendered: true,
    };
  });
}
for (const path of accountPaths) {
  await check(`Produção: acesso à página de conta ${path}`, async () => {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="root"/);
    return { status: response.status };
  });
}
await check("Produção: URL inexistente retorna 404", async () => {
  const response = await get("/__ediv_smoke_rota_inexistente");
  assert.equal(response.status, 404);
  return { status: response.status };
});
await check("Produção: API conectada ao MySQL", async () => {
  const response = await get("/api/health");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
  return { status: response.status, database: "ok" };
});
await check("Produção: cadastro habilitado", async () => {
  const response = await get("/api/auth/availability");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.available, true, data.message);
  return { status: response.status, available: data.available };
});
for (const path of [
  "/api/auth/me",
  "/api/rankings",
  "/api/rankings/drafts",
  "/api/admin/users",
  "/api/support",
  "/api/support/team",
  "/api/notifications",
]) {
  await check(`Produção: visitante bloqueado em ${path}`, async () => {
    const response = await get(path);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("content-type"), /application\/json/);
    await response.body?.cancel();
    return { status: response.status };
  });
}
await check("Produção: catálogo real contém somente ações/units", async () => {
  const response = await get(
    "/api/market/assets?type=stock&page=1&limit=8&sortBy=volume&sortOrder=desc&search=",
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.assets.length > 0);
  assert.ok(data.total >= data.assets.length);
  for (const item of data.assets) {
    assert.equal(item.type, "stock");
    assert.ok(!item.subType || ["stock", "unit"].includes(item.subType));
    assert.ok(Number(item.price) >= 0);
  }
  return {
    status: response.status,
    count: data.assets.length,
    total: data.total,
    source: "brapi.dev",
  };
});
await check(
  "Produção: aula pública e demais conteúdos protegidos",
  async () => {
    const response = await get("/api/learning");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.access, "preview");
    assert.ok(data.lessons[0].text || data.lessons[0].sections?.length);
    assert.ok(
      data.lessons
        .slice(1)
        .every((lesson) => lesson.locked && !lesson.text && !lesson.answer),
    );
    return {
      status: response.status,
      access: data.access,
      lessons: data.lessons.length,
    };
  },
);
await check(
  "Produção: informações públicas da equipe disponíveis",
  async () => {
    const response = await get("/api/support/information");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Object.hasOwn(data, "professionalName"));
    return {
      status: response.status,
      professionalIdentified: Boolean(data.professionalName),
      supportEmailConfigured: Boolean(data.email),
    };
  },
);
await check("Produção: API experimental de IA está desativada", async () => {
  const response = await get("/api/assistant/status");
  assert.equal(response.status, 404);
  return { status: response.status };
});
await check("Produção: sitemap contém a página de metodologia", async () => {
  const response = await get("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /\/metodologia/);
  return { status: response.status };
});
await writeFile(
  ".test-artifacts/production-report.json",
  JSON.stringify(
    { date: new Date().toISOString(), root, mode: "read-only", checks },
    null,
    2,
  ),
);
console.info(
  "Resultado produção:",
  checks.filter((check) => check.status === "passed").length,
  "/",
  checks.length,
);
if (checks.some((check) => check.status === "failed")) process.exitCode = 1;
