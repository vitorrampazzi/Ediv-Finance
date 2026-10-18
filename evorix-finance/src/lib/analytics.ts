import { useSyncExternalStore } from "react";
import {
  createAnalyticsController,
  createConsentStore,
  analyticsConsentKey,
  configuredMeasurementId,
} from "../../analytics-policy.mjs";

// Public measurement identifier, never an API secret. Blank means no Google tag.
export const analyticsMeasurementId = String(
  import.meta.env.VITE_GA4_MEASUREMENT_ID ?? configuredMeasurementId,
).trim();
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
let consentStore: ReturnType<typeof createConsentStore> | undefined;
let controller: ReturnType<typeof createAnalyticsController> | undefined;
const serverSnapshot = Object.freeze({ choice: null, persisted: true });

function store() {
  if (!consentStore) {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Session-only consent. */
    }
    consentStore = createConsentStore(storage);
    const reconcile = () => {
      consentStore?.reconcile();
      if (consentStore?.get().choice !== "granted")
        controller?.update({
          choice: "denied",
          pathname: "",
          audienceAllowed: false,
        });
    };
    window.addEventListener("storage", (event) => {
      if (event.key === analyticsConsentKey || event.key === null) reconcile();
    });
    window.addEventListener("focus", reconcile);
  }
  return consentStore;
}
const subscribe = (listener: () => void) => store().subscribe(listener);
const getSnapshot = () => store().get();
export function useAnalyticsConsent() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
export function chooseAnalytics(choice: "granted" | "denied") {
  if (choice === "denied")
    analyticsController().update({
      choice,
      pathname: "",
      audienceAllowed: false,
    });
  store().choose(choice);
}
const environmentSubscribe = () => () => {};
const environmentSnapshot = () =>
  analyticsController().configured && analyticsController().allowedOrigin;
export function useAnalyticsAvailable() {
  return useSyncExternalStore(
    environmentSubscribe,
    environmentSnapshot,
    () => false,
  );
}
export function openPrivacyPreferences() {
  window.dispatchEvent(new Event("ediv:privacy-preferences"));
}

function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));
  const hostParts = window.location.hostname.split(".");
  const domains = [
    "",
    ...hostParts.map((_, index) => "." + hostParts.slice(index).join(".")),
  ];
  for (const name of names)
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? "; domain=" + domain : ""}`;
    }
}
export function analyticsController() {
  if (!controller) {
    const target = window;
    controller = createAnalyticsController({
      measurementId: analyticsMeasurementId,
      origin: window.location.origin,
      initialReferrer: document.referrer,
      enqueue(...args) {
        target.dataLayer ??= [];
        target.gtag ??= function () {
          // eslint-disable-next-line prefer-rest-params -- Google's documented command queue uses an Arguments object.
          target.dataLayer!.push(arguments);
        };
        target.gtag(...args);
      },
      loadTag(id) {
        if (document.getElementById("ediv-ga4-tag")) return;
        const script = document.createElement("script");
        script.id = "ediv-ga4-tag";
        script.async = true;
        script.src =
          "https://www.googletagmanager.com/gtag/js?id=" +
          encodeURIComponent(id);
        script.referrerPolicy = "origin";
        document.head.appendChild(script);
      },
      setDisabled(disabled) {
        target[`ga-disable-${analyticsMeasurementId}`] = disabled;
      },
      clearCookies: clearAnalyticsCookies,
    });
  }
  return controller;
}
