import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { sumMoney } from "../lib/finance";
import {
  fetchPortfolio,
  localToday,
  type AssetType,
  type PortfolioData,
  type PortfolioTransaction,
} from "../lib/portfolio";
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    positions: [],
    transactions: [],
    transactionCount: 0,
    historyPage: 1,
    historyPages: 1,
    transactionHistoryTruncated: false,
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    side: "BUY" as "BUY" | "SELL",
    ticker: "",
    assetName: "",
    assetType: "ACAO" as AssetType,
    quantity: "",
    unitPrice: "",
    fees: "0",
    tradedAt: localToday(),
  });

  const loadPortfolio = useCallback(
    async (page = historyPage) => {
      setError("");
      try {
        const result = await fetchPortfolio(page);
        setPortfolio(result);
        if (result.historyPage !== page) setHistoryPage(result.historyPage);
        return result;
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar a carteira.",
        );
      } finally {
        setLoading(false);
      }
      return null;
    },
    [historyPage],
  );

  useEffect(() => {
    let active = true;
    fetchPortfolio(historyPage)
      .then((result) => {
        if (active) setPortfolio(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a carteira.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [historyPage]);

  const investedTotal = useMemo(
    () => sumMoney(portfolio.positions.map((position) => position.costBasis)),
    [portfolio.positions],
  );
  const quotedPositions = useMemo(
    () =>
      portfolio.positions.filter((position) => position.marketValue !== null),
    [portfolio.positions],
  );
  const marketValue = useMemo(
    () => sumMoney(quotedPositions.map((position) => position.marketValue!)),
    [quotedPositions],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(
        "/api/portfolio/transactions" + (editingId ? "/" + editingId : ""),
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            ticker: form.ticker.toUpperCase(),
            fees: form.fees || "0",
          }),
        },
      );
      setMessage(
        editingId
          ? "Operação corrigida. A carteira foi recalculada."
          : "Operação registrada na sua carteira.",
      );
      setEditingId("");
      setForm((current) => ({
        ...current,
        ticker: "",
        assetName: "",
        quantity: "",
        unitPrice: "",
        fees: "0",
      }));
      setHistoryPage(1);
      await loadPortfolio(1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar a operação.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (transaction: PortfolioTransaction) => {
    setDeletingId(transaction.id);
    setError("");
    setMessage("");
    try {
      await apiRequest(
        `/api/portfolio/transactions/${encodeURIComponent(transaction.id)}`,
        { method: "DELETE" },
      );
      setPendingDeleteId("");
      setMessage(
        `Operação de ${transaction.ticker} excluída. A carteira foi recalculada.`,
      );
      await loadPortfolio();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a operação.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return {
    portfolio,
    loading,
    editingId,
    setEditingId,
    saving,
    deletingId,
    pendingDeleteId,
    setPendingDeleteId,
    historyPage,
    setHistoryPage,
    error,
    message,
    form,
    setForm,
    loadPortfolio,
    investedTotal,
    quotedPositions,
    marketValue,
    submit,
    deleteTransaction,
  };
}
