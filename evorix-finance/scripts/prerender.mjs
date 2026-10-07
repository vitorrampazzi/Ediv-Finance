import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { build } from "vite";
import {
  publicPages,
  accountPaths,
  pageMetadata,
  siteOrigin,
} from "../site-pages.mjs";
import { lessons, glossary } from "../server/learning-content.js";
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
  const learning = {
    access: "preview",
    completed: [],
    glossary,
    lessons: lessons.map((lesson, index) =>
      index === 0
        ? { ...lesson, locked: false }
        : { id: lesson.id, title: lesson.title, locked: true },
    ),
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
      "og:title": meta.title,
      "og:description": meta.description,
      "og:url": meta.canonical || "",
      "twitter:title": meta.title,
      "twitter:description": meta.description,
    })) {
      const attr = name.startsWith("og:") ? "property" : "name";
      result = result.replace(
        new RegExp(`<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*/?>`, "s"),
        `<meta ${attr}="${name}" content="${escape(value)}" />`,
      );
    }
    const canonical =
      meta.canonical && !meta.noindex
        ? `<link rel="canonical" href="${meta.canonical}" />`
        : "";
    return result
      .replace(
        "</head>",
        `${canonical}<meta name="robots" content="${meta.noindex ? "noindex, nofollow" : "index, follow"}" /></head>`,
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
  await writeFile(
    "dist/404.html",
    html(
      "/404",
      '<main style="padding:3rem;font-family:system-ui"><h1>Página não encontrada</h1><p>Confira o endereço ou volte ao início.</p><a href="/">Voltar ao início</a></main>',
    ),
  );
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
      qa
        ? ""
        : Object.keys(publicPages)
            .map((path) => `<url><loc>${siteOrigin}${path}</loc></url>`)
            .join("")
    }</urlset>`,
  );
  await writeFile(
    "dist/robots.txt",
    qa
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nDisallow: /api/\nDisallow: /app\nDisallow: /verificar\nDisallow: /redefinir-senha\nSitemap: ${siteOrigin}/sitemap.xml\n`,
  );
  console.info(
    `HTML público gerado para ${Object.keys(publicPages).length} rotas; QA=${qa}.`,
  );
}
