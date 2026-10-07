export function safeAuthDestination(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 1500 ||
    !/^\/(?!\/)/.test(value) ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  )
    return "/app";
  try {
    const url = new URL(value, "https://ediv.invalid");
    if (url.origin !== "https://ediv.invalid") return "/app";
    if (
      ![
        "/ranking",
        "/aprender",
        "/mercado",
        "/assessoria",
        "/suporte",
        "/app",
        "/",
      ].some(
        (path) =>
          url.pathname === path ||
          (path === "/app" && url.pathname.startsWith("/app/")) ||
          (path === "/ranking" &&
            /^\/ranking\/acao\/[A-Za-z0-9.-]{1,16}$/.test(url.pathname)),
      )
    )
      return "/app";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/app";
  }
}

export function authLink(page: "cadastro" | "entrar", next: string) {
  return "/" + page + "?next=" + encodeURIComponent(safeAuthDestination(next));
}
