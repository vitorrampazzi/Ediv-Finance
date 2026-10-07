import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "../components/Card";
import { OrbitCoins } from "../components/OrbitCoins";
import { PortfolioPulse } from "../components/PortfolioPulse";
import { PortfolioExtras } from "../components/PortfolioExtras";
import { formatMoney } from "../lib/finance";

import { usePortfolio } from "../hooks/usePortfolio";
import {
  type AssetType,
  typeLabels,
  formatQuantity,
  formatDate,
  localToday,
} from "../lib/portfolio";
export const Carteira = () => {
  const {
    portfolio,
    loading,
    refreshing,
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
    submit,
    deleteTransaction,
  } = usePortfolio();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative flex flex-col items-start justify-between gap-4 border-b border-evo-border pb-7 sm:flex-row sm:items-center">
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold tracking-tight text-evo-textMain">
            Minha Carteira
          </h1>
          <p className="mt-1 text-evo-textSec">
            Registre manualmente compras e vendas e acompanhe uma estimativa
            pelas cotações disponíveis.
          </p>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          <OrbitCoins variant="portfolio" size="sm" />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
        >
          <CircleAlert size={17} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg border border-evo-green/20 bg-evo-green/5 p-3 text-sm text-evo-green"
        >
          {message}
        </p>
      )}

      <PortfolioPulse
        insights={portfolio.insights}
        loading={loading}
        refreshing={refreshing}
        compact
        onRefresh={() => void loadPortfolio()}
      />

      <Card variant="editorial" glow="none" className="space-y-4">
        <div>
          <h2
            id="operation-form"
            className="text-lg font-semibold text-evo-textMain"
          >
            {editingId ? "Corrigir operação" : "Registrar operação"}
          </h2>
          <p className="mt-1 text-sm text-evo-textSec">
            Os valores são anotações pessoais; não enviamos ordens à corretora.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm text-evo-textSec">
            Operação
            <select
              value={form.side}
              onChange={(event) =>
                setForm({ ...form, side: event.target.value as "BUY" | "SELL" })
              }
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            >
              <option value="BUY">Compra</option>
              <option value="SELL">Venda</option>
            </select>
          </label>
          <label className="text-sm text-evo-textSec">
            Ticker
            <input
              required
              maxLength={16}
              pattern="[A-Za-z0-9.-]+"
              value={form.ticker}
              onChange={(event) =>
                setForm({ ...form, ticker: event.target.value.toUpperCase() })
              }
              placeholder="Ex.: PETR4"
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <label className="text-sm text-evo-textSec">
            Nome do ativo
            <input
              required
              maxLength={120}
              value={form.assetName}
              onChange={(event) =>
                setForm({ ...form, assetName: event.target.value })
              }
              placeholder="Nome para identificar"
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <label className="text-sm text-evo-textSec">
            Classe
            <select
              value={form.assetType}
              onChange={(event) =>
                setForm({ ...form, assetType: event.target.value as AssetType })
              }
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-evo-textSec">
            Quantidade
            <input
              required
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,8})?"
              value={form.quantity}
              onChange={(event) =>
                setForm({
                  ...form,
                  quantity: event.target.value.replace(",", "."),
                })
              }
              placeholder="Ex.: 10"
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <label className="text-sm text-evo-textSec">
            Preço unitário (R$)
            <input
              required
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,8})?"
              value={form.unitPrice}
              onChange={(event) =>
                setForm({
                  ...form,
                  unitPrice: event.target.value.replace(",", "."),
                })
              }
              placeholder="Ex.: 25,50"
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <label className="text-sm text-evo-textSec">
            Taxas (R$)
            <input
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,8})?"
              value={form.fees}
              onChange={(event) =>
                setForm({ ...form, fees: event.target.value.replace(",", ".") })
              }
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <label className="text-sm text-evo-textSec">
            Data
            <input
              type="date"
              required
              max={localToday()}
              value={form.tradedAt}
              onChange={(event) =>
                setForm({ ...form, tradedAt: event.target.value })
              }
              className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-primary px-5 font-semibold text-white hover:bg-evo-primaryHover disabled:opacity-60"
            >
              <Plus size={17} />
              {saving
                ? "Salvando…"
                : editingId
                  ? "Salvar correção"
                  : "Adicionar operação"}
            </button>
            {editingId && (
              <button
                type="button"
                className="ml-3 min-h-11 px-3 text-sm underline"
                onClick={() => {
                  setEditingId("");
                  setForm({
                    side: "BUY",
                    ticker: "",
                    assetName: "",
                    assetType: "ACAO",
                    quantity: "",
                    unitPrice: "",
                    fees: "0",
                    tradedAt: localToday(),
                  });
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </Card>

      <PortfolioExtras
        refreshKey={JSON.stringify([
          portfolio.transactions,
          portfolio.positions.map((p) => [p.ticker, p.quantity, p.costBasis]),
        ])}
        onChanged={() => loadPortfolio().then(() => undefined)}
      />
      <Card variant="editorial" glow="none" className="overflow-hidden p-0">
        <div className="border-b border-evo-border p-5">
          <h2 className="font-semibold text-evo-textMain">
            Posições e preços estimados
          </h2>
          <p className="mt-1 text-sm text-evo-textSec">
            A estimativa usa a cotação mais recente recebida. Custos e
            quantidades vêm das operações que você informou.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <caption className="sr-only">
              Posições calculadas a partir de operações registradas e cotações
              disponíveis
            </caption>
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-evo-textSec">
                <th scope="col" className="p-4">
                  Ativo
                </th>
                <th scope="col" className="p-4 text-right">
                  Quantidade
                </th>
                <th scope="col" className="p-4 text-right">
                  Preço médio
                </th>
                <th scope="col" className="p-4 text-right">
                  Último preço
                </th>
                <th scope="col" className="p-4 text-right">
                  Valor de mercado
                </th>
                <th scope="col" className="p-4 text-right">
                  Variação estimada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-sm text-evo-textSec"
                  >
                    Carregando carteira…
                  </td>
                </tr>
              ) : portfolio.positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-sm text-evo-textSec"
                  >
                    Sua carteira ainda não tem operações registradas.
                  </td>
                </tr>
              ) : (
                portfolio.positions.map((position) => (
                  <tr key={position.ticker}>
                    <th
                      scope="row"
                      className="p-4 font-medium text-evo-textMain"
                    >
                      <span>{position.ticker}</span>
                      <span className="block text-xs font-normal text-evo-textSec">
                        {position.assetName} · {typeLabels[position.assetType]}
                      </span>
                    </th>
                    <td className="p-4 text-right text-evo-textMain">
                      {formatQuantity(position.quantity)}
                    </td>
                    <td className="p-4 text-right text-evo-textSec">
                      {formatMoney(position.averageCost)}
                    </td>
                    <td className="p-4 text-right text-evo-textSec">
                      {position.currentPrice
                        ? formatMoney(position.currentPrice)
                        : "Indisponível"}
                    </td>
                    <td className="p-4 text-right font-medium text-evo-textMain">
                      {position.marketValue
                        ? formatMoney(position.marketValue)
                        : "—"}
                    </td>
                    <td
                      className={`p-4 text-right ${Number(position.unrealizedPnl) >= 0 ? "text-evo-green" : "text-evo-red"}`}
                    >
                      {position.unrealizedPnl
                        ? formatMoney(position.unrealizedPnl)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card variant="editorial" glow="none" className="overflow-hidden p-0">
        <div className="border-b border-evo-border p-5">
          <h2 className="font-semibold text-evo-textMain">
            Histórico de operações
          </h2>
          <p className="mt-1 text-xs text-evo-textSec">
            Você pode editar ou excluir um registro incorreto; a carteira será
            recalculada.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">
              Histórico de operações, 100 registros por página
            </caption>
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-evo-textSec">
                <th scope="col" className="p-4">
                  Tipo
                </th>
                <th scope="col" className="p-4">
                  Ativo
                </th>
                <th scope="col" className="p-4 text-right">
                  Quantidade
                </th>
                <th scope="col" className="p-4 text-right">
                  Preço
                </th>
                <th scope="col" className="p-4 text-right">
                  Data
                </th>
                <th scope="col" className="p-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {portfolio.transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-sm text-evo-textSec"
                  >
                    Nenhuma operação registrada.
                  </td>
                </tr>
              ) : (
                portfolio.transactions.map((transaction) => {
                  const isPendingDelete = pendingDeleteId === transaction.id;
                  return (
                    <tr key={transaction.id}>
                      <td
                        className={`p-4 font-medium ${transaction.side === "BUY" ? "text-evo-green" : "text-evo-red"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {transaction.side === "BUY" ? (
                            <ArrowDownRight size={15} aria-hidden="true" />
                          ) : (
                            <ArrowUpRight size={15} aria-hidden="true" />
                          )}
                          {transaction.side === "BUY" ? "Compra" : "Venda"}
                        </span>
                      </td>
                      <th
                        scope="row"
                        className="p-4 font-medium text-evo-textMain"
                      >
                        {transaction.ticker}
                        <span className="block text-xs font-normal text-evo-textSec">
                          {transaction.assetName}
                        </span>
                      </th>
                      <td className="p-4 text-right text-evo-textSec">
                        {formatQuantity(transaction.quantity)}
                      </td>
                      <td className="p-4 text-right text-evo-textSec">
                        {formatMoney(transaction.unitPrice)}
                      </td>
                      <td className="p-4 text-right text-evo-textSec">
                        {formatDate(transaction.tradedAt)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          className="min-h-11 rounded-lg px-3 text-xs text-evo-accent"
                          aria-label={
                            "Editar operação de " + transaction.ticker
                          }
                          onClick={() => {
                            setEditingId(transaction.id);
                            setForm({
                              ...transaction,
                              tradedAt: transaction.tradedAt.slice(0, 10),
                            });
                            document
                              .getElementById("operation-form")
                              ?.scrollIntoView({ block: "center" });
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDeleteId(
                              isPendingDelete ? "" : transaction.id,
                            )
                          }
                          aria-expanded={isPendingDelete}
                          aria-controls={`delete-${transaction.id}`}
                          aria-label={`Excluir operação ${transaction.side === "BUY" ? "de compra" : "de venda"} de ${transaction.ticker}, ${formatQuantity(transaction.quantity)} unidades`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-evo-red transition hover:bg-evo-red/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-red"
                        >
                          <Trash2 size={15} aria-hidden="true" />{" "}
                          {isPendingDelete ? "Cancelar exclusão" : "Excluir"}
                        </button>
                        {isPendingDelete && (
                          <div
                            id={`delete-${transaction.id}`}
                            className="min-w-40 rounded-lg border border-evo-red/20 bg-evo-red/5 p-2 text-left"
                            aria-label={`Confirmar exclusão da operação de ${transaction.ticker}`}
                          >
                            <p className="text-xs leading-relaxed text-evo-textMain">
                              Excluir esta operação e recalcular a carteira?
                            </p>
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId("")}
                                className="min-h-8 rounded px-2 text-xs text-evo-textSec hover:bg-white/5"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === transaction.id}
                                onClick={() =>
                                  void deleteTransaction(transaction)
                                }
                                className="min-h-8 rounded bg-evo-red px-2 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {deletingId === transaction.id
                                  ? "Excluindo…"
                                  : "Confirmar"}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {portfolio.historyPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-evo-border p-4 text-xs text-evo-textSec">
            <span>
              Exibindo {portfolio.transactions.length} de{" "}
              {portfolio.transactionCount} operações.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyPage <= 1 || loading}
                onClick={() =>
                  setHistoryPage((current) => Math.max(1, current - 1))
                }
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-evo-border px-2 text-evo-textMain disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <span>
                Página {historyPage} de {portfolio.historyPages}
              </span>
              <button
                type="button"
                disabled={historyPage >= portfolio.historyPages || loading}
                onClick={() => setHistoryPage((current) => current + 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-evo-border px-2 text-evo-textMain disabled:opacity-40"
              >
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
        {portfolio.transactionHistoryTruncated && (
          <p className="border-t border-evo-border p-4 text-xs text-evo-textSec">
            As operações mais antigas podem ser acessadas pelas páginas do
            histórico; todas são consideradas no cálculo das posições.
          </p>
        )}
      </Card>
    </div>
  );
};
