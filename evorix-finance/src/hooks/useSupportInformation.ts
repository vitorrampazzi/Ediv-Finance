import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { SupportInformation } from "../lib/support";

export function useSupportInformation() {
  const [revision, setRevision] = useState(0);
  const [resolvedRevision, setResolvedRevision] = useState(-1);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const [info, setInfo] = useState<SupportInformation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<SupportInformation>("/api/support/information", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setInfo(data);
          setError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInfo(null);
          setError("Não foi possível carregar os contatos da equipe.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setResolvedRevision(revision);
        }
      });
    return () => controller.abort();
  }, [revision]);
  const current = resolvedRevision === revision;
  return {
    info: current ? info : null,
    loading: loading || !current,
    error: current ? error : "",
    retry,
  };
}
