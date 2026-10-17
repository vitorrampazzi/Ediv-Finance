const logoOrigin = "https://icons.brapi.dev";

// Fractional trading uses the same issuer/share class. Remove only its terminal
// F for the image lookup; never replace PN/ON/units or change the displayed ticker.
export function companySymbol(value) {
  if (typeof value !== "string") return null;
  const symbol = value.trim().toUpperCase();
  return /^([A-Z][A-Z0-9]{3}\d{1,2})F?$/.exec(symbol)?.[1] ?? null;
}

export function companyLogoUrl(ticker, supplied, demo = false) {
  const symbol = companySymbol(ticker);
  if (demo || !symbol) return null;
  const canonical = `${logoOrigin}/icons/${symbol}.svg`;
  if (typeof supplied === "string") {
    try {
      const url = new URL(supplied);
      if (
        url.origin === logoOrigin &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === `/icons/${symbol}.svg`
      ) {
        return url.href;
      }
    } catch {
      /* Use the provider's exact-ticker image endpoint below. */
    }
  }
  return canonical;
}

export function companyFallback(ticker) {
  const text = typeof ticker === "string" ? ticker.trim().toUpperCase() : "";
  return text.replace(/[^A-Z0-9]/g, "").slice(0, 7) || "—";
}
