import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export function useResearchStatus() {
  const [published, setPublished] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ published: boolean }>("/api/rankings/status", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setPublished(result.published);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return published;
}
