import { useState } from "react";
import { apiRequest } from "../lib/api";
import { assistantEnabled } from "../lib/features";
import { CompanyLogo } from "./CompanyLogo";
import type { Entry } from "../lib/ranking";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
export type ResearchEntry = Entry;
const labels: Record<string, string> = {
  rank: "Posição",
  companyName: "Empresa",
  expectedReturnPercent: "Potencial (%)",
  targetPrice: "Preço-alvo (R$)",
  horizonMonths: "Horizonte (meses)",
  thesis: "Tese",
  risks: "Riscos",
  sector: "Setor",
  balanceSheet: "Balanço patrimonial",
  incomeStatement: "DRE",
  cashFlow: "Fluxo de caixa",
  companyInformation: "Informações da empresa",
  netDebt: "Dívida líquida",
  statistics: "Estatísticas",
  referencePeriod: "Período",
  dataSource: "Fonte",
  dividendAnalysis: "Análise de dividendos",
};
const fieldLabel = (field: string) =>
  dividendColumns.find(
    (column) => column.key === field.replace(/^dividendAnalysis\./, ""),
  )?.label ||
  labels[field] ||
  field;
function fieldValue(entry: ResearchEntry, field: string) {
  if (field === "dividendAnalysis")
    return (
      <dl>
        {dividendColumns
          .filter(
            (column) =>
              !["companyName", "ticker", "sector"].includes(column.key),
          )
          .map((column) => (
            <div key={column.key} className="mt-2">
              <dt className="font-medium">{column.label}</dt>
              <dd>
                {formatDividendValue(
                  dividendValue(entry, column.key),
                  column.format,
                )}
              </dd>
            </div>
          ))}
      </dl>
    );
  const column = dividendColumns.find(
    (column) => column.key === field.replace(/^dividendAnalysis\./, ""),
  );
  if (
    column &&
    (entry.dividendAnalysis || field.startsWith("dividendAnalysis."))
  )
    return formatDividendValue(dividendValue(entry, column.key), column.format);
  const value = entry[field as keyof ResearchEntry];
  return value === null || value === undefined || value === ""
    ? "Não informado"
    : String(value);
}
const explanations: Record<string, string> = {
  expectedReturnPercent:
    "Compara o preço-alvo com um preço de referência: (alvo / referência − 1) × 100.",
  targetPrice:
    "É uma estimativa construída com premissas sobre a empresa e o mercado.",
  horizonMonths: "É o prazo considerado para o cenário da pesquisa.",
  balanceSheet:
    "Apresenta ativos, obrigações e patrimônio líquido da empresa em uma data. Confira o período e as unidades da pesquisa.",
  incomeStatement:
    "Apresenta receitas, despesas e resultado de um período. Lucro contábil e dinheiro em caixa são medidas diferentes.",
  cashFlow:
    "Mostra entradas e saídas de caixa relacionadas à operação, aos investimentos e ao financiamento.",
  companyInformation:
    "Reúne informações sobre a empresa, sua atividade e seu contexto. Confira a fonte e a data de referência.",
  netDebt:
    "Relaciona as dívidas consideradas na pesquisa com o caixa e equivalentes disponíveis. A definição pode variar; confira a metodologia do autor.",
  statistics:
    "Reúne indicadores e medidas usados na pesquisa. Compare períodos, unidades e critérios equivalentes.",
};
export function IndicatorHelp({ field }: { field: string }) {
  const text = explanations[field];
  if (!text) return null;
  return (
    <details className="mt-2 rounded-lg border border-evo-border p-2 text-xs">
      <summary className="min-h-9 cursor-pointer text-evo-accent">
        Entender este indicador
      </summary>
      <p className="mt-2 leading-relaxed text-evo-textSec">{text}</p>
      {assistantEnabled && (
        <button
          type="button"
          className="mt-2 min-h-11 underline"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("ediv-assistant-question", {
                detail:
                  "Explique o conceito de " +
                  labels[field] +
                  " e os cuidados ao interpretar esse indicador, sem recomendar investimentos.",
              }),
            )
          }
        >
          Continuar a dúvida no assistente
        </button>
      )}
    </details>
  );
}
const input =
  "min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-sm";
export function CompanyComparison({
  entries,
  demo,
}: {
  entries: ResearchEntry[];
  demo: boolean;
}) {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const a = entries.find((e) => e.ticker === left);
  const b = entries.find((e) => e.ticker === right);
  return (
    <details className="rounded-xl border border-evo-border bg-evo-card p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        Comparar duas empresas
      </summary>
      <p className="mt-2 text-xs text-evo-textSec">
        {demo
          ? "Dados fictícios da demonstração."
          : "Dados da publicação selecionada."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {([left, right] as const).map((value, index) => (
          <label key={index} className="text-sm">
            {index === 0 ? "Primeira empresa" : "Segunda empresa"}
            <select
              className={input + " mt-1"}
              value={value}
              onChange={(e) =>
                (index === 0 ? setLeft : setRight)(e.target.value)
              }
            >
              <option value="">Selecione uma empresa</option>
              {entries.map((entry) => (
                <option
                  key={entry.ticker}
                  value={entry.ticker}
                  disabled={entry.ticker === (index === 0 ? right : left)}
                >
                  {entry.ticker} · {entry.companyName}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {a && b && a.ticker !== b.ticker && (
        <dl className="mt-5 space-y-3">
          {(a.dividendAnalysis || b.dividendAnalysis
            ? dividendColumns.map((column) => [column.key, column.label])
            : Object.entries(labels).filter(
                ([key]) => key !== "rank" && key !== "dividendAnalysis",
              )
          ).map(([key, label]) => (
            <div key={key} className="rounded-lg bg-evo-bgMain p-3">
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                {[a, b].map((entry) => (
                  <div key={entry.ticker} className="min-w-0">
                    <span className="company-identity-inline text-xs text-evo-accent">
                      {key === "companyName" && (
                        <CompanyLogo
                          ticker={entry.ticker}
                          demo={demo}
                          size="sm"
                        />
                      )}
                      {entry.ticker}
                    </span>
                    <div className="mt-1 whitespace-pre-wrap break-words text-evo-textSec">
                      {fieldValue(entry, key)}
                    </div>
                  </div>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}
interface Comparison {
  added: ResearchEntry[];
  removed: ResearchEntry[];
  changed: {
    ticker: string;
    companyName: string;
    fields: string[];
    before: ResearchEntry;
    after: ResearchEntry;
  }[];
  unchanged: number;
  from: { title: string };
  to: { title: string };
}
export function VersionComparison({
  publicationId,
  history,
}: {
  publicationId: string | null;
  history: { id: string; title: string; createdAt: string }[];
}) {
  const [previous, setPrevious] = useState("");
  const [result, setResult] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const older = publicationId
    ? history.filter((h) => BigInt(h.id) < BigInt(publicationId))
    : [];
  if (!publicationId) return null;
  async function compare() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await apiRequest<Comparison>(
          "/api/rankings/compare?from=" + previous + "&to=" + publicationId,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível comparar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-evo-border bg-evo-card p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        O que mudou na pesquisa?
      </summary>
      {!older.length ? (
        <p className="mt-2 text-sm text-evo-textSec">
          Ainda não há uma versão anterior disponível para esta publicação.
        </p>
      ) : (
        <>
          <label className="mt-3 block text-sm">
            Comparar a publicação atual com
            <select
              className={input + " mt-1"}
              value={previous}
              disabled={busy}
              onChange={(e) => {
                setPrevious(e.target.value);
                setResult(null);
              }}
            >
              <option value="">Selecione uma versão anterior</option>
              {older.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · #{item.id}
                </option>
              ))}
            </select>
          </label>
          <button
            className="action mt-3"
            disabled={busy || !previous}
            onClick={() => void compare()}
          >
            {busy ? "Comparando…" : "Comparar versões"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="notice-error mt-3">
          {error}
        </p>
      )}
      {result && (
        <section className="mt-4 space-y-3">
          <p role="status" className="text-sm">
            {result.added.length} adicionado(s) · {result.removed.length}{" "}
            removido(s) · {result.changed.length} alterado(s) ·{" "}
            {result.unchanged} sem alterações nos campos.
          </p>
          {result.added.map((e) => (
            <p key={"add" + e.ticker} className="text-sm text-evo-accent">
              <span className="company-identity-inline">
                <CompanyLogo ticker={e.ticker} size="sm" />
                Adicionado: {e.ticker} · {e.companyName}
              </span>
            </p>
          ))}
          {result.removed.map((e) => (
            <p key={"remove" + e.ticker} className="text-sm">
              <span className="company-identity-inline">
                <CompanyLogo ticker={e.ticker} size="sm" />
                Removido: {e.ticker} · {e.companyName}
              </span>
            </p>
          ))}
          {result.changed.map((change) => (
            <details
              key={change.ticker}
              className="rounded-lg border border-evo-border p-3"
            >
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                <span className="company-identity-inline">
                  <CompanyLogo ticker={change.ticker} size="sm" />
                  {change.ticker} · {change.fields.map(fieldLabel).join(", ")}
                </span>
              </summary>
              <dl className="space-y-3">
                {change.fields.map((field) => (
                  <div key={field}>
                    <dt className="text-sm font-semibold">
                      {fieldLabel(field)}
                    </dt>
                    <dd className="grid gap-3 text-xs sm:grid-cols-2">
                      {(["before", "after"] as const).map((side) => (
                        <div
                          key={side}
                          className="min-w-0 rounded-lg bg-evo-bgMain p-3"
                        >
                          <span className="text-evo-accent">
                            {side === "before" ? "Antes" : "Nesta publicação"}
                          </span>
                          <div className="mt-1 whitespace-pre-wrap break-words">
                            {fieldValue(change[side], field)}
                          </div>
                        </div>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </section>
      )}
    </details>
  );
}
