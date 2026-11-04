import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { build } from "vite";
import {
  publicPages,
  accountPaths,
  pageMetadata,
  robotsTxt,
  siteOrigin,
  structuredData,
} from "../site-pages.mjs";
import { serializeLessons, glossary } from "../server/learning-content.js";
import { assistantInQa } from "../deployment-policy.mjs";

export async function prerender() {
  const qa =
    process.env.VERCEL_ENV !== "production" &&
    (assistantInQa || process.env.VERCEL_GIT_COMMIT_REF === "QA");
  await build({
    build: {
      ssr: "src/entry-server.tsx",
      outDir: ".test-artifacts/prerender",
      emptyOutDir: true,
    },
  });
  const { render } = await import(
    pathToFileURL(resolve(".test-artifacts/prerender/entry-server.js")).href
  );
  const shell = await readFile("dist/index.html", "utf8");
  // Public HTML arrives before React imports route CSS. Include each page's
  // stylesheet up front to keep illustrations, lessons and lists styled on mobile.
  const cssFiles = (await readdir("dist/assets"))
    .filter((name) => name.endsWith(".css"))
    .sort();
  const pageCss = {
    "/": /^(?:Home|ResearchSample|AccountHomeContent)-[\w-]+\.css$/,
    "/ranking": /^ResearchSample-[\w-]+\.css$/,
    "/aprender": /^Aprender-[\w-]+\.css$/,
  };
  const pageStyles = (path) =>
    cssFiles
      .filter(
        (name) =>
          pageCss[path]?.test(name) || /^CompanyLogo-[\w-]+\.css$/.test(name),
      )
      .map(
        (name) =>
          `<link rel="stylesheet" crossorigin href="/assets/${name}" />`,
      )
      .join("");
  const learning = {
    access: "preview",
    completed: [],
    glossary,
    lessons: serializeLessons(false),
  };
  const escape = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  function html(path, content) {
    const meta = pageMetadata(path, qa);
    let result = shell.replace(
      /<title>.*?<\/title>/s,
      `<title>${escape(meta.title)}</title>`,
    );
    for (const [name, value] of Object.entries({
      description: meta.description,
      "og:title": meta.socialTitle,
      "og:description": meta.description,
      "og:url": meta.canonical,
      "twitter:title": meta.socialTitle,
      "twitter:description": meta.description,
    })) {
      const attr = name.startsWith("og:") ? "property" : "name";
      result = result.replace(
        new RegExp(`<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*/?>`, "s"),
        // A page without a canonical address carries no og:url at all.
        value ? `<meta ${attr}="${name}" content="${escape(value)}" />` : "",
      );
    }
    // The home hero photo is the largest element of its first screen.
    const heroImage =
      path === "/"
        ? '<link rel="preload" as="image" href="/ediv-hero-forest.webp" fetchpriority="high" />'
        : "";
    const canonical =
      meta.canonical && !meta.noindex
        ? `<link rel="canonical" href="${meta.canonical}" />`
        : "";
    // JSON is a data block, not a script; "<" is escaped so it cannot end it.
    const schema = structuredData(path, qa)
      .map(
        (data) =>
          `<script type="application/ld+json">${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>`,
      )
      .join("");
    return result
      .replace(
        "</head>",
        `${heroImage}${pageStyles(path)}${canonical}${schema}<meta name="robots" content="${meta.noindex ? "noindex, nofollow" : "index, follow"}" /></head>`,
      )
      .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  }
  for (const path of Object.keys(publicPages)) {
    const dir = path === "/" ? "dist" : "dist" + path;
    await mkdir(dir, { recursive: true });
    await writeFile(dir + "/index.html", html(path, render(path, learning)));
  }
  for (const path of accountPaths) {
    await mkdir("dist" + path, { recursive: true });
    await writeFile("dist" + path + "/index.html", html(path, ""));
  }
  await writeFile("dist/app.html", html("/app", ""));
  // Shell for /ranking/acao/:ticker: indexable, with no canonical of its own.
  await writeFile("dist/acao.html", html("/ranking/acao/empresa", ""));
  await writeFile(
    "dist/404.html",
    html(
      "/404",
      '<main style="padding:3rem"><h1>Página não encontrada</h1><p>Confira o endereço ou volte ao início.</p><a href="/">Voltar ao início</a></main>',
    ),
  );
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
      qa
        ? ""
        : Object.keys(publicPages)
            .map(
              (path) =>
                `<url><loc>${siteOrigin}${path}</loc><lastmod>${publicPages[path].updated}</lastmod></url>`,
            )
            .join("")
    }</urlset>`,
  );
  await writeFile(
    "dist/robots.txt",
    qa ? "User-agent: *\nDisallow: /\n" : robotsTxt(),
  );
  console.info(
    `HTML público gerado para ${Object.keys(publicPages).length} rotas; QA=${qa}.`,
  );
}
