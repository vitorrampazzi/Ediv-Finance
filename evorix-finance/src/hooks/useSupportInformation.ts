import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { SupportInformation } from "../lib/support";

export function useSupportInformation() {
  const [info, setInfo] = useState<SupportInformation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<SupportInformation>("/api/support/information", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setInfo(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Não foi possível carregar os contatos da equipe.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { info, loading, error };
}
