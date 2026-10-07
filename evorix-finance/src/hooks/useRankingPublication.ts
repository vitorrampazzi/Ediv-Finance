import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/authContext";
import { apiRequest, ApiError } from "../lib/api";
import type { Ranking } from "../lib/ranking";
const empty: Ranking = {
  id: null,
  title: "Ranking de cenários",
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  entries: [],
  updatedAt: null,
  sourceFileName: null,
  canManage: false,
  history: [],
};
export function useRankingPublication(publication: string) {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const userId = user?.id;
  const [ranking, setRanking] = useState<Ranking>(empty);
  const [requestLoading, setLoading] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const requestKey =
    (userId || "visitor") + ":" + (userId ? publication : "latest");
  const loading = requestLoading || authLoading || loadedFor !== requestKey;
  const [error, setError] = useState("");
  const load = useCallback(
    (signal?: AbortSignal) =>
      apiRequest<Ranking>(
        "/api/rankings" +
          (publication && userId
            ? "?publication=" + encodeURIComponent(publication)
            : ""),
        { signal },
      ),
    [publication, userId],
  );
  const applyRanking = useCallback((data: Ranking) => {
    setRanking(data);
    setError("");
  }, []);
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    load(controller.signal)
      .then(async (data) => {
        if (!controller.signal.aborted) await applyRanking(data);
      })
      .catch(async (reason) => {
        if (
          !controller.signal.aborted &&
          reason instanceof ApiError &&
          reason.status === 401
        ) {
          try {
            await refreshSession();
          } catch {
            if (!controller.signal.aborted)
              setError(
                "Não foi possível verificar sua sessão. Atualize a página e entre novamente.",
              );
          }
          return;
        }
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedFor(requestKey);
        }
      });
    return () => controller.abort();
  }, [load, applyRanking, authLoading, requestKey, refreshSession]);

  return {
    ranking,
    loading,
    error,
    setError,
    load,
    applyRanking,
    setLoading,
    setLoadedFor,
    requestKey,
  };
}
