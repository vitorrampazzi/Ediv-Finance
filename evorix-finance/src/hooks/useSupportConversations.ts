import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authContext";
import { ApiError, apiRequest } from "../lib/api";
import type { SupportConversation, SupportThread } from "../lib/support";

const failureMessage = (reason: unknown) =>
  reason instanceof Error
    ? reason.message
    : "Não foi possível concluir. Tente novamente.";

export function useSupportConversations(teamView: boolean) {
  const { refreshSession } = useAuth();
  const apiBase = teamView ? "/api/support/team" : "/api/support";
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState("");
  const [conversation, setConversation] = useState<SupportConversation | null>(
    null,
  );
  const [loadedDetail, setLoadedDetail] = useState("");
  const [detailError, setDetailError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionTarget, setActionTarget] = useState<"create" | "conversation">(
    "conversation",
  );
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pendingAction = useRef(false);
  const checkAccess = useCallback(
    (reason: unknown) => {
      if (
        reason instanceof ApiError &&
        (reason.status === 401 || reason.status === 403)
      )
        void refreshSession().catch(() => {});
    },
    [refreshSession],
  );

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await apiRequest<{ threads: SupportThread[] }>(apiBase, {
        signal,
      });
      if (!signal?.aborted) {
        setThreads(data.threads);
        setListError("");
      }
    },
    [apiBase],
  );

  const loadDetail = useCallback(
    async (id: string, signal?: AbortSignal) => {
      try {
        const data = await apiRequest<SupportConversation>(apiBase + "/" + id, {
          signal,
        });
        if (!signal?.aborted) {
          setConversation(data);
          setDetailError(null);
        }
      } catch (reason) {
        if (!signal?.aborted) {
          setDetailError({ id, message: failureMessage(reason) });
          checkAccess(reason);
        }
        throw reason;
      } finally {
        if (!signal?.aborted) setLoadedDetail(id);
      }
    },
    [apiBase, checkAccess],
  );

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ threads: SupportThread[] }>(apiBase, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setThreads(data.threads);
          setListError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setListError(failureMessage(reason));
          checkAccess(reason);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [apiBase, checkAccess]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    apiRequest<SupportConversation>(apiBase + "/" + selected, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setConversation(data);
          setDetailError(null);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setDetailError({ id: selected, message: failureMessage(reason) });
          checkAccess(reason);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedDetail(selected);
      });
    return () => controller.abort();
  }, [apiBase, selected, checkAccess]);

  const act = async (
    work: () => Promise<void>,
    target: "create" | "conversation" = "conversation",
  ) => {
    if (pendingAction.current) return false;
    pendingAction.current = true;
    setBusy(true);
    setActionError("");
    setActionTarget(target);
    setAnnouncement("");
    try {
      await work();
      return true;
    } catch (reason) {
      checkAccess(reason);
      setActionError(failureMessage(reason));
      return false;
    } finally {
      pendingAction.current = false;
      setBusy(false);
    }
  };

  const refreshListAfterSave = async () => {
    try {
      await loadList();
    } catch (reason) {
      setListError(
        "Sua mensagem foi salva, mas a lista não pôde ser atualizada. Tente atualizar as conversas.",
      );
      checkAccess(reason);
    }
  };

  const create = async (subject: string, body: string) => {
    let createdId = "";
    const saved = await act(async () => {
      const data = await apiRequest<{ id: string }>("/api/support", {
        method: "POST",
        body: JSON.stringify({ subject, body, sharePortfolio: false }),
      });
      createdId = data.id;
      setConversation(null);
      setDetailError(null);
      setSelected(data.id);
      setAnnouncement(
        "Pergunta enviada. Você pode acompanhar a resposta nesta conversa.",
      );
      await refreshListAfterSave();
    }, "create");
    return saved ? createdId : null;
  };

  const sendReply = async (body: string, status: string) =>
    act(async () => {
      const id = selected;
      await apiRequest(apiBase + "/" + id + "/messages", {
        method: "POST",
        body: JSON.stringify({ body, ...(teamView ? { status } : {}) }),
      });
      setAnnouncement("Mensagem enviada e registrada na conversa.");
      await Promise.all([
        loadDetail(id).catch(() => {}),
        refreshListAfterSave(),
      ]);
    });

  const refreshList = () =>
    act(async () => {
      try {
        await loadList();
        setLoading(false);
      } catch (reason) {
        setListError(failureMessage(reason));
        checkAccess(reason);
      }
    });

  const refreshConversation = () =>
    act(async () => {
      setLoadedDetail("");
      setDetailError(null);
      await loadDetail(selected).catch(() => {});
    });

  const revokeSharing = () =>
    act(async () => {
      const id = selected;
      await apiRequest("/api/support/" + id + "/consent", {
        method: "PATCH",
        body: JSON.stringify({ sharePortfolio: false }),
      });
      setConversation((current) =>
        current?.thread.id === id
          ? {
              ...current,
              thread: { ...current.thread, share_portfolio: false },
              portfolio: null,
            }
          : current,
      );
      setAnnouncement("Acesso aos registros anteriores revogado.");
    });

  return {
    threads,
    selected,
    loading,
    busy,
    listError,
    actionError: actionTarget === "conversation" ? actionError : "",
    createError: actionTarget === "create" ? actionError : "",
    announcement,
    visible: conversation?.thread.id === selected ? conversation : null,
    detailLoading: Boolean(selected && loadedDetail !== selected),
    detailError: detailError?.id === selected ? detailError.message : "",
    select: (id: string) => {
      if (pendingAction.current || id === selected) return;
      setActionError("");
      setAnnouncement("");
      setLoadedDetail("");
      setDetailError(null);
      setSelected(id);
    },
    create,
    sendReply,
    refreshList,
    refreshConversation,
    revokeSharing,
  };
}
