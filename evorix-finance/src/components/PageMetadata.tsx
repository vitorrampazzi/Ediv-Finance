import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageMetadata } from "../../site-pages.mjs";
import { qaEnvironment } from "../lib/features";

export function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const metadata = pageMetadata(pathname, qaEnvironment);
    document.title = metadata.title;
    for (const [key, value] of Object.entries({
      description: metadata.description,
      robots: metadata.noindex ? "noindex, nofollow" : "index, follow",
      "og:title": metadata.title,
      "og:description": metadata.description,
      "og:url": metadata.canonical || "",
      "twitter:title": metadata.title,
      "twitter:description": metadata.description,
    })) {
      const attribute = key.startsWith("og:") ? "property" : "name";
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = value;
    }
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (metadata.canonical && !metadata.noindex) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = metadata.canonical;
    } else canonical?.remove();
  }, [pathname]);
  return null;
}
