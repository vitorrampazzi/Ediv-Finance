// Medição de base de carga das páginas públicas (Playwright, Node ESM).
//
// Como rodar (em evorix-finance/):
//   Local (preview do dist atual):   npx vite preview --port 4173
//                                    BASE_URL=http://localhost:4173 node tests/perf-baseline.mjs
//   Local (dist de base, porta 4175): npx vite preview --outDir .test-artifacts/dist-base --port 4175
//                                    BASE_URL=http://localhost:4175 node tests/perf-baseline.mjs
//
// Variáveis:
//   BASE_URL        padrão http://127.0.0.1:4173. Use http://localhost:4175 quando servir o dist de base.
//   RUNS            cargas por página e viewport (padrão 3).
//   VIEWPORT        "390" ou "1280": limita a um viewport.
//   ONLY            lista de caminhos separados por vírgula (ex.: /ranking/acao/TIMS3,/glossario).
//   ATTRIBUTION=1   tabela de atribuição: cada layout-shift com value, hadRecentInput, horário e
//                   sources (seletor do nó, previousRect e currentRect).
//   CAPTURE_API=1   grava em .test-artifacts/perf-api/ as respostas JÁ recebidas de GET /api/learning,
//                   /api/rankings/public, /api/rankings/status e /api/auth/me (status, contentType, body).
//                   Nenhuma requisição nova. Sem cabeçalhos e sem cookies. Não grava corpo com
//                   e-mail ou chave sensível; relata o motivo.
//   MOCK_API=1      responde esses quatro endpoints com os arquivos de .test-artifacts/perf-api/,
//                   com atraso MOCK_DELAY_MS. Os demais /api/* seguem como hoje. Cada navegação de
//                   página recebe o HTML que a Vercel serviria, pelos rewrites de vercel.json, lido
//                   de DIST_DIR (ex.: /glossario -> glossario/index.html; /ranking/acao/X -> acao.html).
//   MOCK_DELAY_MS   atraso das respostas simuladas em ms (padrão 600).
//   DIST_DIR        diretório de onde vem acao.html no modo MOCK_API (padrão .test-artifacts/dist-base).
//
// Trava de produção: se BASE_URL não for localhost nem 127.0.0.1, o script só roda com
//   ATTRIBUTION=1 RUNS=1 VIEWPORT=390 ONLY=/ranking/acao/TIMS3,/glossario, sem MOCK_API.
//   Em qualquer outra combinação sai com erro antes de qualquer requisição.
//
// Regras: só GET (qualquer outro método é abortado); analytics e monitoramento bloqueados
// (Google Analytics/Tag Manager, Clarity, /_vercel/insights); sem login, sem formulário,
// sem clicar no aviso de cookies.
//
// Navegador: tenta o Chromium do Playwright; se não existir, usa o Google Chrome instalado
// (channel "chrome"). Mesmo padrão de tests/browser.mjs. Não instala nada.
//
// Este arquivo NÃO entra no `npm test`.

import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const ARTIFACTS_DIR = resolve(REPO_ROOT, ".test-artifacts/perf-api");

function readIntEnv(name, fallback, min) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) throw new Error(`${name} inválido: ${raw}`);
  return value;
}

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const RUNS = readIntEnv("RUNS", 3, 1);
const ATTRIBUTION = process.env.ATTRIBUTION === "1";
const CAPTURE_API = process.env.CAPTURE_API === "1";
const MOCK_API = process.env.MOCK_API === "1";
const MOCK_DELAY_MS = readIntEnv("MOCK_DELAY_MS", 600, 0);
const DIST_DIR = resolve(REPO_ROOT, process.env.DIST_DIR || ".test-artifacts/dist-base");
const VIEWPORT_FILTER = (process.env.VIEWPORT || "").trim();
const ONLY_FILTER = (process.env.ONLY || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const PAGES = ["/", "/ranking", "/ranking/acao/TIMS3", "/aprender", "/glossario", "/entrar", "/cadastro"];
const VIEWPORTS = [
  { name: "390px", width: 390, height: 844 },
  { name: "1280px", width: 1280, height: 800 },
];
const PRODUCTION_ONLY = "/ranking/acao/TIMS3,/glossario";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const BLOCKED_HOSTS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|clarity\.ms|\/_vercel\/insights/i;
const SETTLE_MS = 3000;
const NAV_TIMEOUT_MS = 45000;
const FRAMER_CHUNK = /use-reduced-motion-[^/]*\.js/i;
const MOCK_ENDPOINTS = ["/api/learning", "/api/rankings/public", "/api/rankings/status", "/api/auth/me"];
// Mesma escolha da Vercel: lê os rewrites de vercel.json (exceto /api) e devolve o HTML
// que a rota serviria. "/" cai no index.html, como na Vercel. Outras rotas: null.
const VERCEL_RULES = JSON.parse(readFileSync(resolve(REPO_ROOT, "vercel.json"), "utf8"))
  .rewrites.filter((rule) => !rule.source.startsWith("/api/"))
  .map((rule) => ({
    regex: new RegExp(
      "^" +
        rule.source.replace(/\/:[A-Za-z]+\*/g, "(?:/(.*))?").replace(/:[A-Za-z]+/g, "([^/]+)") +
        "/?$",
    ),
    destination: rule.destination.split("?")[0],
  }));
function vercelPageFor(pathname) {
  for (const rule of VERCEL_RULES) if (rule.regex.test(pathname)) return rule.destination;
  return pathname === "/" ? "/index.html" : null;
}
const SENSITIVE_BODY = /[\w.+-]+@[\w-]+\.[\w.-]+|"(token|password|senha|secret|cookie|session|authorization|email|e-?mail|cpf)"\s*:/i;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function endpointFileName(endpoint) {
  return endpoint.replace(/^\/api\//, "").replace(/\//g, "-") + ".json";
}

function assertRunAllowed() {
  const host = new URL(BASE_URL).hostname;
  if (LOCAL_HOSTS.has(host)) return;
  const allowed =
    ATTRIBUTION &&
    RUNS === 1 &&
    VIEWPORT_FILTER === "390" &&
    ONLY_FILTER.join(",") === PRODUCTION_ONLY &&
    !MOCK_API;
  if (!allowed) {
    throw new Error(
      `BASE_URL ${BASE_URL} não é local. Só roda com ATTRIBUTION=1 RUNS=1 VIEWPORT=390 ONLY=${PRODUCTION_ONLY} (sem MOCK_API). Nenhuma requisição foi feita.`,
    );
  }
}

function selectPages() {
  const unknown = ONLY_FILTER.filter((item) => !PAGES.includes(item));
  if (unknown.length) throw new Error(`ONLY com caminho desconhecido: ${unknown.join(", ")}`);
  return ONLY_FILTER.length ? PAGES.filter((item) => ONLY_FILTER.includes(item)) : PAGES;
}

function selectViewports() {
  if (!VIEWPORT_FILTER) return VIEWPORTS;
  const selected = VIEWPORTS.filter((item) => item.name === `${VIEWPORT_FILTER}px`);
  if (!selected.length) throw new Error(`VIEWPORT inválido: ${VIEWPORT_FILTER} (use 390 ou 1280)`);
  return selected;
}

async function loadMocks() {
  const mocks = new Map();
  for (const endpoint of MOCK_ENDPOINTS) {
    const file = resolve(ARTIFACTS_DIR, endpointFileName(endpoint));
    if (!existsSync(file)) continue;
    mocks.set(endpoint, JSON.parse(await readFile(file, "utf8")));
  }
  if (mocks.size === 0) {
    throw new Error("MOCK_API=1 sem arquivos em .test-artifacts/perf-api/. Rode CAPTURE_API=1 antes.");
  }
  return mocks;
}

async function measureOnce(browser, pagePath, viewport, mocks) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "light",
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    const selectorOf = (node) => {
      if (!node || node.nodeType !== 1) return null;
      const parts = [];
      let current = node;
      for (let depth = 0; current && current.nodeType === 1 && depth < 6; depth += 1) {
        let part = current.tagName.toLowerCase();
        if (current.id) {
          parts.unshift(`${part}#${current.id}`);
          break;
        }
        const classes = Array.from(current.classList).slice(0, 2);
        if (classes.length) part += "." + classes.join(".");
        parts.unshift(part);
        current = current.parentElement;
      }
      return parts.join(" > ");
    };
    const rect = (r) =>
      r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null;
    window.__perf = { lcp: null, cls: 0, shifts: [] };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__perf.lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* navegador sem LCP: fica null */
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__perf.cls += entry.value;
          window.__perf.shifts.push({
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            startTime: Math.round(entry.startTime * 10) / 10,
            sources: (entry.sources || []).map((source) => ({
              node: selectorOf(source.node),
              previousRect: rect(source.previousRect),
              currentRect: rect(source.currentRect),
            })),
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* navegador sem CLS: fica 0 */
    }
  });

  const page = await context.newPage();
  let requestCount = 0;
  const finished = [];
  const apiErrors = [];
  const captured = [];
  let blocked = 0;
  let nonGetAborted = 0;
  let mockHits = 0;
  let mockFailures = 0;

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") {
      nonGetAborted += 1;
      return route.abort();
    }
    if (BLOCKED_HOSTS.test(request.url())) {
      blocked += 1;
      return route.abort();
    }
    if (MOCK_API && request.isNavigationRequest()) {
      const page = vercelPageFor(url.pathname);
      if (page) {
        try {
          const html = await readFile(resolve(DIST_DIR, page.replace(/^\//, "")), "utf8");
          return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
        } catch {
          mockFailures += 1;
          return route.continue();
        }
      }
    }
    if (MOCK_API && mocks.has(url.pathname)) {
      const mock = mocks.get(url.pathname);
      await sleep(MOCK_DELAY_MS);
      mockHits += 1;
      return route.fulfill({ status: mock.status, contentType: mock.contentType, body: mock.body });
    }
    return route.continue();
  });

  page.on("request", () => {
    requestCount += 1;
  });
  page.on("requestfinished", (request) => {
    finished.push(request);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api")) return;
    const method = response.request().method();
    if (response.status() >= 400) {
      apiErrors.push({ method, path: url.pathname, status: response.status() });
    }
    if (CAPTURE_API && method === "GET" && MOCK_ENDPOINTS.includes(url.pathname)) {
      captured.push(response);
    }
  });

  const url = `${BASE_URL}${pagePath}`;
  let status = null;
  let navError = null;
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    status = response ? response.status() : null;
  } catch (error) {
    navError = error instanceof Error ? error.message.split("\n")[0] : String(error);
  }

  await page.waitForTimeout(SETTLE_MS);

  const perf = await page
    .evaluate(() => window.__perf)
    .catch(() => ({ lcp: null, cls: 0, shifts: [] }));
  const bodyTextLength = await page
    .evaluate(() => (document.body ? document.body.innerText.trim().length : 0))
    .catch(() => 0);

  let jsBytes = 0;
  for (const request of finished) {
    const sizes = await request.sizes().catch(() => null);
    const transferred = sizes ? sizes.responseBodySize : 0;
    const isScript = request.resourceType() === "script" || /\.m?js(\?|$)/i.test(request.url());
    if (isScript) jsBytes += transferred;
  }
  const framerLoaded = finished.some((request) => FRAMER_CHUNK.test(request.url()));

  const capturedBodies = [];
  if (CAPTURE_API) {
    for (const response of captured) {
      const body = await response.body().catch(() => null);
      capturedBodies.push({
        endpoint: new URL(response.url()).pathname,
        status: response.status(),
        contentType: response.headers()["content-type"] || "",
        body: body ? body.toString("utf8") : null,
      });
    }
  }

  await context.close();

  return {
    requests: requestCount,
    jsBytes,
    lcp: typeof perf.lcp === "number" ? perf.lcp : null,
    cls: typeof perf.cls === "number" ? perf.cls : null,
    shifts: Array.isArray(perf.shifts) ? perf.shifts : [],
    framerLoaded,
    status,
    navError,
    emptyBody: bodyTextLength < 80,
    apiErrors,
    blocked,
    nonGetAborted,
    mockHits,
    mockFailures,
    capturedBodies,
  };
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function fmt(value, digits = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/d";
}

function fmtRect(rect) {
  return rect ? `${rect.x}, ${rect.y} · ${rect.w}×${rect.h}` : "—";
}

function notesFor(runs) {
  const notes = new Set();
  for (const run of runs) {
    if (run.navError) notes.add(`erro de navegação: ${run.navError}`);
    if (run.status !== null && run.status >= 400) notes.add(`HTTP ${run.status}`);
    if (run.emptyBody) notes.add("conteúdo vazio");
    if (run.apiErrors.length > 0) notes.add(`API com erro (${run.apiErrors.length})`);
    if (run.nonGetAborted > 0) notes.add(`não GET abortado (${run.nonGetAborted})`);
  }
  return notes.size ? [...notes].join("; ") : "ok";
}

async function saveCaptures(captures) {
  const lines = [];
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  for (const endpoint of MOCK_ENDPOINTS) {
    const item = captures.get(endpoint);
    const name = endpointFileName(endpoint);
    if (!item) {
      lines.push(`- ${endpoint}: não capturado (a página medida não chamou este endpoint)`);
      continue;
    }
    if (item.body === null) {
      lines.push(`- ${endpoint}: não gravado (corpo indisponível, status ${item.status})`);
      continue;
    }
    if (SENSITIVE_BODY.test(item.body)) {
      lines.push(`- ${endpoint}: não gravado (corpo contém possível dado pessoal ou segredo; não relatado aqui)`);
      continue;
    }
    const payload = { status: item.status, contentType: item.contentType, body: item.body };
    await writeFile(resolve(ARTIFACTS_DIR, name), JSON.stringify(payload, null, 2) + "\n", "utf8");
    lines.push(`- ${endpoint}: gravado em .test-artifacts/perf-api/${name} (status ${item.status})`);
  }
  return lines;
}

async function main() {
  assertRunAllowed();
  const pages = selectPages();
  const viewports = selectViewports();
  const mocks = MOCK_API ? await loadMocks() : new Map();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }

  const rows = [];
  const apiRows = new Map();
  const attribution = [];
  const captures = new Map();
  let totalBlocked = 0;
  try {
    for (const pagePath of pages) {
      for (const viewport of viewports) {
        const runs = [];
        for (let i = 0; i < RUNS; i += 1) {
          const run = await measureOnce(browser, pagePath, viewport, mocks);
          runs.push(run);
          for (const error of run.apiErrors) {
            const key = [pagePath, viewport.name, error.method, error.path, error.status].join("|");
            apiRows.set(key, (apiRows.get(key) || 0) + 1);
          }
          if (ATTRIBUTION) {
            for (const shift of run.shifts) {
              if (shift.sources.length === 0) {
                attribution.push({ page: pagePath, viewport: viewport.name, run: i + 1, shift, source: null });
              }
              for (const source of shift.sources) {
                attribution.push({ page: pagePath, viewport: viewport.name, run: i + 1, shift, source });
              }
            }
          }
          for (const item of run.capturedBodies) {
            if (!captures.has(item.endpoint)) captures.set(item.endpoint, item);
          }
        }
        totalBlocked += runs.reduce((sum, run) => sum + run.blocked, 0);
        rows.push({
          page: pagePath,
          viewport: viewport.name,
          requests: average(runs.map((run) => run.requests)),
          jsKb: average(runs.map((run) => run.jsBytes / 1024)),
          lcp: average(runs.map((run) => run.lcp)),
          cls: average(runs.map((run) => run.cls)),
          framer: runs.some((run) => run.framerLoaded),
          notes: notesFor(runs),
          mockHits: runs.reduce((sum, run) => sum + run.mockHits, 0),
          mockFailures: runs.reduce((sum, run) => sum + run.mockFailures, 0),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const out = [];
  out.push(
    `Base: ${BASE_URL} · cargas por página/viewport: ${RUNS} · analytics bloqueados: ${totalBlocked}` +
      (MOCK_API ? ` · MOCK_API ativo (atraso ${MOCK_DELAY_MS} ms; respostas simuladas: ${rows.reduce((s, r) => s + r.mockHits, 0)})` : ""),
  );
  out.push("");

  out.push("## Chamadas /api com erro");
  out.push("");
  if (apiRows.size === 0) {
    out.push("Nenhuma chamada /api com status ≥ 400 nas cargas medidas.");
  } else {
    out.push("| Página | Viewport | Método | Caminho | Status | Cargas com o erro |");
    out.push("|---|---|---|---|---|---|");
    for (const [key, count] of apiRows) {
      const [pagePath, viewportName, method, apiPath, status] = key.split("|");
      out.push(`| ${pagePath} | ${viewportName} | ${method} | ${apiPath} | ${status} | ${count} |`);
    }
  }
  out.push("");

  out.push("## Métricas de base");
  out.push("");
  out.push("| Página | Viewport | Requisições | JS (KB) | LCP (ms) | CLS | framer-motion baixado | Observação |");
  out.push("|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    out.push(
      `| ${row.page} | ${row.viewport} | ${fmt(row.requests)} | ${fmt(row.jsKb, 1)} | ${fmt(row.lcp)} | ${fmt(row.cls, 3)} | ${row.framer ? "sim" : "não"} | ${row.notes} |`,
    );
  }
  out.push("");

  if (ATTRIBUTION) {
    out.push("## Atribuição de layout-shift");
    out.push("");
    out.push("| Página | Viewport | Carga | Horário (ms) | Valor | hadRecentInput | Nó (sources) | previousRect | currentRect |");
    out.push("|---|---|---|---|---|---|---|---|---|");
    const sorted = [...attribution].sort(
      (a, b) => a.page.localeCompare(b.page) || a.shift.startTime - b.shift.startTime || a.run - b.run,
    );
    for (const item of sorted) {
      const node = item.source ? (item.source.node ?? "(nó removido)").replace(/\|/g, "\\|") : "—";
      out.push(
        `| ${item.page} | ${item.viewport} | ${item.run} | ${item.shift.startTime} | ${item.shift.value.toFixed(4)} | ${item.shift.hadRecentInput ? "sim" : "não"} | ${node} | ${item.source ? fmtRect(item.source.previousRect) : "—"} | ${item.source ? fmtRect(item.source.currentRect) : "—"} |`,
      );
    }
    if (attribution.length === 0) out.push("| — | — | — | — | — | — | nenhum layout-shift registrado | — | — |");
    out.push("");
  }

  if (CAPTURE_API) {
    out.push("## Captura de API (CAPTURE_API=1)");
    out.push("");
    for (const line of await saveCaptures(captures)) out.push(line);
    out.push("");
  }

  console.log(out.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
