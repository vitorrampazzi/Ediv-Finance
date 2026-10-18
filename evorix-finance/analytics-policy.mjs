export const analyticsConsentKey = "ediv-analytics-consent-v1";
export const analyticsConsentVersion = "2026-10-17";
export const analyticsConsentLifetime = 180 * 24 * 60 * 60 * 1000;
// Public GA4 measurement identifier for the Web stream created by the owner.
export const configuredMeasurementId = "G-M8REFJ819V";

export function validMeasurementId(value) {
  return typeof value === "string" && /^G-[A-Z0-9]{6,20}$/.test(value);
}

const pages = {
  "/": "Página inicial",
  "/mercado": "Mercado de ações",
  "/ranking": "Ranking de ações",
  "/aprender": "Escola de dividendos",
  "/glossario": "Glossário",
  "/assessoria": "Assessoria",
  "/metodologia": "Metodologia",
  "/app": "Início da escola",
  "/app/ranking": "Ranking de ações",
  "/app/analises": "Análises de ações",
  "/app/aprender": "Escola de dividendos",
};

// Only known routes, static titles and aggregated company screens can leave
// the site. Never pass query, hash, token, search, name or document.title.
export function analyticsPage(pathname) {
  if (
    typeof pathname !== "string" ||
    pathname.includes("?") ||
    pathname.includes("#")
  )
    return null;
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  if (pages[path]) return { path, title: pages[path] };
  const company = path.match(/^(\/app)?\/ranking\/acao\/[A-Za-z0-9._-]{1,16}$/);
  if (company)
    return {
      path: (company[1] || "") + "/ranking/acao/empresa",
      title: "Pesquisa de uma empresa",
    };
  return null;
}

export function analyticsReferrer(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const knownSources = [
      "www.google.com",
      "www.google.com.br",
      "google.com",
      "google.com.br",
      "www.bing.com",
      "bing.com",
      "duckduckgo.com",
      "www.duckduckgo.com",
      "search.yahoo.com",
      "www.youtube.com",
      "youtube.com",
      "www.instagram.com",
      "instagram.com",
      "l.instagram.com",
      "www.facebook.com",
      "m.facebook.com",
      "l.facebook.com",
      "facebook.com",
      "t.co",
      "escoladodividendo.com.br",
      "www.escoladodividendo.com.br",
    ];
    return knownSources.includes(url.hostname) ? url.origin + "/" : "";
  } catch {
    return "";
  }
}

export function createConsentStore(storage, now = Date.now) {
  let snapshot;
  const listeners = new Set();
  function read() {
    let record;
    let persisted = true;
    try {
      if (!storage) throw Error("Unavailable");
      record = JSON.parse(storage.getItem(analyticsConsentKey) || "null");
    } catch {
      persisted = false;
    }
    const valid =
      record?.version === analyticsConsentVersion &&
      ["granted", "denied"].includes(record.choice) &&
      Number.isFinite(record.updatedAt) &&
      record.updatedAt <= now() &&
      now() - record.updatedAt < analyticsConsentLifetime;
    return Object.freeze({ choice: valid ? record.choice : null, persisted });
  }
  const notify = () => listeners.forEach((listener) => listener());
  return {
    get() {
      return (snapshot ??= read());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    choose(choice) {
      if (!["granted", "denied"].includes(choice)) return;
      let persisted = true;
      try {
        if (!storage) throw Error("Unavailable");
        storage.setItem(
          analyticsConsentKey,
          JSON.stringify({
            version: analyticsConsentVersion,
            choice,
            updatedAt: now(),
          }),
        );
      } catch {
        persisted = false;
      }
      snapshot = Object.freeze({ choice, persisted });
      notify();
    },
    reconcile() {
      snapshot = read();
      notify();
    },
  };
}

const denied = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

export function createAnalyticsController({
  measurementId,
  origin,
  enqueue,
  loadTag,
  setDisabled,
  clearCookies,
  initialReferrer = "",
}) {
  const configured = validMeasurementId(measurementId);
  const allowedOrigin = [
    "https://escoladodividendo.com.br",
    "https://www.escoladodividendo.com.br",
  ].includes(origin);
  let initialized = false;
  let consentGranted = false;
  let lastPage = null;
  let previousLocation = analyticsReferrer(initialReferrer);
  if (configured) setDisabled(true);
  return {
    configured,
    allowedOrigin,
    update({ choice, pathname, audienceAllowed = true }) {
      const page = analyticsPage(pathname);
      const active =
        configured &&
        allowedOrigin &&
        audienceAllowed &&
        choice === "granted" &&
        Boolean(page);
      if (!configured) return false;
      setDisabled(!active);
      if (choice !== "granted") {
        if (consentGranted) {
          // Disable transmission first, including any already-loaded Google tag.
          enqueue("consent", "update", { ...denied });
        }
        clearCookies();
        consentGranted = false;
      }
      if (!active) {
        lastPage = null;
        return false;
      }
      const location = "https://escoladodividendo.com.br" + page.path;
      const metadata = {
        page_location: location,
        page_title: page.title,
        page_referrer: previousLocation,
      };
      if (!initialized) {
        enqueue("consent", "default", { ...denied });
        enqueue("js", new Date());
        enqueue("set", {
          ...metadata,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        });
        enqueue("consent", "update", {
          ...denied,
          analytics_storage: "granted",
        });
        enqueue("config", measurementId, {
          ...metadata,
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          cookie_expires: analyticsConsentLifetime / 1000,
        });
        loadTag(measurementId);
        initialized = true;
      } else if (!consentGranted) {
        enqueue("consent", "update", {
          ...denied,
          analytics_storage: "granted",
        });
      }
      consentGranted = true;
      if (lastPage === page.path) return false;
      enqueue("set", metadata);
      enqueue("event", "page_view", {
        ...metadata,
        page_path: page.path,
        send_to: measurementId,
      });
      lastPage = page.path;
      previousLocation = location;
      return true;
    },
  };
}
