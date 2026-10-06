import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export function useRegistrationAvailability() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    revision: number;
    available?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ available: boolean; message: string }>(
      "/api/auth/availability",
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult({ revision, ...data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            revision,
            error:
              "Não foi possível conferir a disponibilidade do cadastro. Tente novamente.",
          });
      });
    return () => controller.abort();
  }, [revision]);
  return {
    current: result?.revision === revision ? result : null,
    retry: () => setRevision((value) => value + 1),
  };
}
