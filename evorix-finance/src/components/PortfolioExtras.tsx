import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "./Card";
import { apiRequest } from "../lib/api";
import { formatMoney, sumMoney, today } from "../lib/finance";
type EventRow = {
  id: string;
  ticker: string;
  kind: string;
  amount: string;
  factor: string;
  occurredAt: string;
  status: string;
  note: string | null;
};
type Data = {
  summary: {
    realizedPnl: string;
    receivedIncome: string;
    purchases: string;
    sales: string;
  };
  events: EventRow[];
  monthly: {
    month: string;
    costBasis: string;
    realizedPnl: string;
    income: string;
  }[];
  positions: { assetType: string; costBasis: string }[];
};
type Preview = {
  count: number;
  duplicates: number;
  entries: {
    ticker: string;
    side: string;
    quantity: string;
    price: string;
    date: string;
  }[];
};
const eventNames: Record<string, string> = {
  DIVIDEND: "Dividendo",
  JCP: "JCP",
  SPLIT: "Desdobramento / grupamento",
  BONUS: "Bonificação",
};
const initialEvent = () => ({
  ticker: "",
  kind: "DIVIDEND",
  amount: "",
  factor: "1",
  occurredAt: today(),
  status: "RECEIVED",
  note: "",
});
export function PortfolioExtras({
  onChanged,
  refreshKey,
}: {
  onChanged: () => Promise<void>;
  refreshKey: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState(initialEvent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const result = await apiRequest<Data>("/api/portfolio/activity");
    setData(result);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Data>("/api/portfolio/activity", { signal: controller.signal })
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar os eventos.",
          );
      });
    return () => controller.abort();
  }, [refreshKey]);
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  };
  const upload = (confirm: boolean) =>
    void action(async () => {
      if (!file) return;
      const result = await apiRequest<Preview>(
        "/api/portfolio/import" + (confirm ? "" : "/preview"),
        {
          method: "POST",
          headers: {
            "Content-Type": file.name.toLowerCase().endsWith(".xlsx")
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv",
          },
          body: file,
        },
      );
      if (confirm) {
        setMessage(
          result.count +
            " operações importadas; " +
            result.duplicates +
            " repetidas ignoradas.",
        );
        setPreview(null);
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        await Promise.all([load(), onChanged()]);
      } else setPreview(result);
    });
  const eventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action(async () => {
      await apiRequest("/api/portfolio/events", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: form.amount.replace(",", ".") || "0",
          factor: form.factor.replace(",", ".") || "1",
        }),
      });
      setForm(initialEvent());
      setMessage("Evento registrado.");
      await Promise.all([load(), onChanged()]);
    });
  };
  const corporate = ["SPLIT", "BONUS"].includes(form.kind);
  const classes = data
    ? [...new Set(data.positions.map((p) => p.assetType))]
    : [];
  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      <Card variant="editorial" glow="none">
        <h2 className="text-lg font-semibold">
          Importar ou exportar operações
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          CSV ou XLSX de compras e vendas, até 1 MB e 1.000 linhas. Aceita
          extratos de movimentação com Data, Movimentação, Produto, Quantidade e
          Preço unitário. Outros formatos da B3 precisam ser convertidos para o
          modelo; não existe conexão automática com a B3.
        </p>
        <p className="mt-2 text-xs text-evo-textSec">
          Colunas do modelo: tipo (BUY/SELL), ticker, empresa, classe
          (ACAO/FII/ETF/RENDA_FIXA/CRYPTO/OUTRO), quantidade, preco, taxas, data
          (AAAA-MM-DD). Linhas repetidas são ignoradas, inclusive dentro do
          arquivo. Operações idênticas no mesmo dia também são tratadas como
          repetidas; registre-as manualmente se forem negociações distintas.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="block min-w-0 flex-1 text-sm">
            Planilha de operações
            <input
              ref={fileInput}
              className="field mt-2 py-2 text-xs"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
              }}
              disabled={busy}
            />
          </label>
          <button
            className="action"
            disabled={!file || busy || file.size > 1_048_576}
            onClick={() => upload(false)}
          >
            Revisar arquivo
          </button>
          <a href="/api/portfolio/export" className="action">
            Exportar CSV
          </a>
          <a
            href="/modelos/carteira.csv"
            download
            className="min-h-11 px-2 py-3 text-sm underline"
          >
            Baixar modelo vazio
          </a>
        </div>
        {file && file.size > 1_048_576 && (
          <p role="alert" className="mt-2 text-sm">
            O arquivo excede 1 MB.
          </p>
        )}
        {preview && (
          <div className="mt-5 space-y-3">
            <p className="text-sm">
              {preview.count} operações novas · {preview.duplicates} repetidas.
              Confira antes de confirmar.
            </p>
            <div className="max-h-64 overflow-auto rounded-lg border border-evo-border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <caption className="sr-only">Prévia da importação</caption>
                <thead>
                  <tr>
                    {["Tipo", "Ativo", "Quantidade", "Preço", "Data"].map(
                      (h) => (
                        <th key={h} scope="col" className="p-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.entries.map((row, i) => (
                    <tr key={i}>
                      <td className="p-3">
                        {row.side === "BUY" ? "Compra" : "Venda"}
                      </td>
                      <td>{row.ticker}</td>
                      <td>{row.quantity}</td>
                      <td>{formatMoney(row.price)}</td>
                      <td>{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="action"
              disabled={busy || !preview.count}
              onClick={() => upload(true)}
            >
              Confirmar importação
            </button>
          </div>
        )}
      </Card>
      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <Card variant="editorial" glow="none">
              <h2 className="text-sm text-evo-textSec">
                Resultado realizado em vendas
              </h2>
              <p className="mt-2 font-numbers text-xl">
                {formatMoney(data.summary.realizedPnl)}
              </p>
              <p className="mt-2 text-xs text-evo-textSec">
                Resultado acumulado pelo custo médio registrado, após taxas
                informadas e antes de impostos.
              </p>
            </Card>
            <Card variant="editorial" glow="none">
              <h2 className="text-sm text-evo-textSec">Proventos recebidos</h2>
              <p className="mt-2 font-numbers text-xl">
                {formatMoney(data.summary.receivedIncome)}
              </p>
              <p className="mt-2 text-xs text-evo-textSec">
                Somente eventos registrados como recebidos. Anúncios não entram
                neste total.
              </p>
            </Card>
          </section>
          <Card variant="editorial" glow="none">
            <h2 className="text-lg font-semibold">Histórico dos registros</h2>
            <p className="mt-2 text-sm text-evo-textSec">
              Custo das posições abertas, resultado realizado e proventos
              acumulados ao fim de cada mês com movimentação. Este gráfico não é
              a evolução de preços ou do patrimônio de mercado.
            </p>
            {data.monthly.length ? (
              <div className="mt-5 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.monthly.map((m) => ({
                      ...m,
                      costBasis: Number(m.costBasis),
                      realizedPnl: Number(m.realizedPnl),
                      income: Number(m.income),
                    }))}
                    margin={{ left: 0, right: 16, top: 10, bottom: 10 }}
                  >
                    <XAxis dataKey="month" stroke="#C1C7D0" fontSize={11} />
                    <YAxis
                      stroke="#C1C7D0"
                      fontSize={11}
                      width={65}
                      tickFormatter={(v) =>
                        Number(v).toLocaleString("pt-BR", {
                          notation: "compact",
                        })
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#404651",
                        borderColor: "#545B66",
                        color: "#F2F4F7",
                      }}
                      formatter={(v) =>
                        Number(v).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      }
                    />
                    <Legend />
                    <Line
                      type="linear"
                      dataKey="costBasis"
                      name="Custo registrado"
                      stroke="#9CC7C5"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="realizedPnl"
                      name="Realizado"
                      stroke="#E8C88B"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="income"
                      name="Proventos"
                      stroke="#82B7A0"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-5 text-sm text-evo-textSec">
                Registre operações para visualizar o histórico.
              </p>
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer py-2">
                Ver números em tabela
              </summary>
              <div className="overflow-auto">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead>
                    <tr>
                      {["Mês", "Custo", "Realizado", "Proventos"].map((h) => (
                        <th scope="col" className="p-2" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.map((m) => (
                      <tr key={m.month}>
                        <th scope="row" className="p-2">
                          {m.month}
                        </th>
                        <td>{formatMoney(m.costBasis)}</td>
                        <td>{formatMoney(m.realizedPnl)}</td>
                        <td>{formatMoney(m.income)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <h3 className="mt-6 font-semibold">
              Distribuição do custo por classe
            </h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {classes.map((type) => (
                <div
                  key={type}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-evo-border p-3 text-sm"
                >
                  <dt>{type.replace("_", " ")}</dt>
                  <dd>
                    {formatMoney(
                      sumMoney(
                        data.positions
                          .filter((p) => p.assetType === type)
                          .map((p) => p.costBasis),
                      ),
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      )}
      <Card variant="editorial" glow="none">
        <h2 className="text-lg font-semibold">
          Proventos e eventos corporativos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          Registros manuais, sem calendário automático de anúncios. Para
          proventos, informe o total líquido recebido ou anunciado. Em
          desdobramentos, use o multiplicador da quantidade (ex.: 2 para dobrar;
          0,5 para reduzir pela metade). Bonificações usam o fator total e
          permitem adicionar o custo atribuído informado pela empresa. Confira
          os eventos no extrato: este controle não apura impostos.
          Desdobramentos e bonificações são aplicados antes das operações da
          data informada.
        </p>
        <form
          onSubmit={eventSubmit}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            Ativo
            <input
              className="field mt-1"
              required
              maxLength={16}
              pattern="[A-Za-z0-9.-]+"
              value={form.ticker}
              onChange={(e) =>
                setForm({ ...form, ticker: e.target.value.toUpperCase() })
              }
            />
          </label>
          <label className="text-sm">
            Evento
            <select
              className="field mt-1"
              value={form.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value,
                  status: "RECEIVED",
                  amount: "",
                  factor: "1",
                })
              }
            >
              {Object.entries(eventNames).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {corporate
              ? "Custo adicional atribuído (R$)"
              : "Total líquido (R$)"}
            <input
              className="field mt-1"
              required={!corporate}
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,8})?"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              disabled={form.kind === "SPLIT"}
            />
          </label>
          {corporate ? (
            <label className="text-sm">
              Multiplicador da quantidade
              <input
                className="field mt-1"
                required
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,8})?"
                value={form.factor}
                onChange={(e) => setForm({ ...form, factor: e.target.value })}
              />
            </label>
          ) : (
            <label className="text-sm">
              Situação
              <select
                className="field mt-1"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="RECEIVED">Recebido</option>
                <option value="ANNOUNCED">
                  Anunciado — ainda não recebido
                </option>
              </select>
            </label>
          )}
          <label className="text-sm">
            Data
            <input
              className="field mt-1"
              type="date"
              required
              max={form.status === "RECEIVED" ? today() : undefined}
              value={form.occurredAt}
              onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Origem / observação
            <input
              className="field mt-1"
              maxLength={300}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
          <button className="action" disabled={busy}>
            Registrar evento
          </button>
        </form>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {["ANNOUNCED", "RECEIVED"].map((status) => (
            <section key={status}>
              <h3 className="font-semibold">
                {status === "ANNOUNCED"
                  ? "Agenda informada — anúncios"
                  : "Eventos realizados"}
              </h3>
              <ul className="mt-3 max-h-96 space-y-3 overflow-auto">
                {(data?.events || [])
                  .filter((e) => e.status === status)
                  .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
                  .map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-evo-border p-3 text-sm"
                    >
                      <p className="font-semibold">
                        {row.ticker} · {eventNames[row.kind]}
                      </p>
                      <p className="mt-1 text-evo-textSec">
                        {row.occurredAt} ·{" "}
                        {["SPLIT", "BONUS"].includes(row.kind)
                          ? "Fator " +
                            row.factor +
                            " · custo " +
                            formatMoney(row.amount)
                          : formatMoney(row.amount)}
                      </p>
                      {row.note && (
                        <p className="mt-2 break-words text-xs">{row.note}</p>
                      )}
                      <button
                        className="mt-2 min-h-11 text-xs underline"
                        onClick={() =>
                          setPending(pending === row.id ? "" : row.id)
                        }
                      >
                        Excluir evento
                      </button>
                      {pending === row.id && (
                        <div className="mt-2">
                          <p className="text-xs">
                            Excluir este evento e recalcular a carteira?
                          </p>
                          <button
                            className="action mt-2"
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                await apiRequest(
                                  "/api/portfolio/events/" + row.id,
                                  { method: "DELETE" },
                                );
                                setPending("");
                                await Promise.all([load(), onChanged()]);
                              })
                            }
                          >
                            Confirmar exclusão
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
              {!(data?.events || []).some((e) => e.status === status) && (
                <p className="mt-3 text-sm text-evo-textSec">
                  Nenhum registro.
                </p>
              )}
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}
