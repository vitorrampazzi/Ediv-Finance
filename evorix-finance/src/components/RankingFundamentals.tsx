import {
  Building2,
  Landmark,
  BarChart3,
  Wallet,
  ReceiptText,
  Scale,
  LockKeyhole,
} from "lucide-react";
import { IndicatorHelp } from "./ResearchTools";

export type RankingFundamentalData = {
  balanceSheet?: string | null;
  incomeStatement?: string | null;
  cashFlow?: string | null;
  companyInformation?: string | null;
  netDebt?: string | null;
  statistics?: string | null;
  referencePeriod?: string | null;
  dataSource?: string | null;
};

const modules = [
  ["balanceSheet", "Balanço patrimonial", Landmark],
  [
    "incomeStatement",
    "DRE — Demonstração do Resultado do Exercício",
    ReceiptText,
  ],
  ["cashFlow", "Fluxo de caixa", Wallet],
  ["companyInformation", "Informações da empresa", Building2],
  ["netDebt", "Dívida líquida", Scale],
  ["statistics", "Estatísticas", BarChart3],
] as const;

export function RankingFundamentals({
  data,
  demo = false,
  revenueHistory,
  locked = false,
  initiallyOpen = false,
}: {
  data: RankingFundamentalData;
  demo?: boolean;
  revenueHistory?: { period: string; value: number }[];
  locked?: boolean;
  initiallyOpen?: boolean;
}) {
  const filled = modules.filter(([key]) => Boolean(data[key]?.trim())).length;
  const maxRevenue = Math.max(
    1,
    ...(revenueHistory?.map((point) => point.value) || []),
  );
  if (locked)
    return (
      <section className="mt-4 rounded-lg border border-evo-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole
            size={16}
            className="text-evo-accent"
            aria-hidden="true"
          />{" "}
          Pesquisa detalhada com conta gratuita
        </div>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-evo-textSec">Período de referência</dt>
            <dd className="mt-1 break-words">
              {data.referencePeriod || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-evo-textSec">Fonte dos dados</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words">
              {data.dataSource || "Não informada"}
            </dd>
          </div>
        </dl>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([key, label, Icon]) => (
            <div
              key={key}
              className="flex items-start gap-2 rounded-md bg-evo-bgMain p-3 text-xs text-evo-textSec"
            >
              <Icon
                size={15}
                className="shrink-0 text-evo-accent"
                aria-hidden="true"
              />
              {label}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-evo-textSec">
          Crie sua conta grátis para consultar estes módulos, a tese completa e
          o histórico de publicações.
        </p>
      </section>
    );
  return (
    <details
      className="mt-4 rounded-lg border border-evo-border"
      open={
        initiallyOpen ||
        (demo && Boolean(data.companyInformation?.includes("DEMO1")))
      }
    >
      <summary className="min-h-11 cursor-pointer p-3 text-sm font-semibold">
        {demo ? "Explorar a pesquisa de exemplo" : "Dados da empresa"} ·{" "}
        {filled} de {modules.length} módulos preenchidos
      </summary>
      <div className="space-y-4 border-t border-evo-border p-4">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-evo-textSec">Período de referência</dt>
            <dd className="mt-1 break-words">
              {data.referencePeriod || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-evo-textSec">Fonte dos dados</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words">
              {data.dataSource || "Não informada"}
            </dd>
          </div>
        </dl>
        {demo && revenueHistory && revenueHistory.length > 0 && (
          <section className="rounded-lg border border-evo-border bg-evo-bgMain p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">
                  Evolução da receita líquida
                </h4>
                <p className="mt-1 text-xs text-evo-textSec">
                  Valores simulados em R$ milhões
                </p>
              </div>
              <span className="text-xs font-semibold text-evo-accent">
                Gráfico ilustrativo
              </span>
            </div>
            <div
              className="mt-5 flex h-40 items-end gap-4 border-b border-evo-border px-3 sm:gap-8"
              aria-hidden="true"
            >
              {revenueHistory.map((point) => (
                <div
                  key={point.period}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-2 font-numbers text-xs text-evo-textSec">
                    {point.value.toLocaleString("pt-BR")}
                  </span>
                  <div
                    className="w-full max-w-28 rounded-t-md bg-evo-accent/60"
                    style={{
                      height: (point.value / maxRevenue) * 100 + "px",
                    }}
                  />
                  <span className="py-2 text-xs text-evo-textSec">
                    {point.period}
                  </span>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Receita líquida fictícia em milhões de reais</caption>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {revenueHistory.map((point) => (
                  <tr key={point.period}>
                    <td>{point.period}</td>
                    <td>{point.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map(([key, label, Icon]) => (
            <section
              key={key}
              className="min-w-0 rounded-lg border border-evo-border bg-evo-bgMain p-4"
            >
              <div className="flex items-start gap-2">
                <Icon
                  size={17}
                  className="mt-0.5 shrink-0 text-evo-accent"
                  aria-hidden="true"
                />
                <h4 className="text-sm font-semibold">{label}</h4>
              </div>
              <IndicatorHelp field={key} />
              {demo && data[key] ? (
                <dl className="mt-4 space-y-3">
                  {data[key].split("\n").map((line, index) => {
                    const separator = line.indexOf(":");
                    return (
                      <div
                        key={index}
                        className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-evo-border/50 pb-2 text-xs last:border-0 last:pb-0"
                      >
                        <dt className="text-evo-textSec">
                          {separator >= 0
                            ? line.slice(0, separator)
                            : "Informação"}
                        </dt>
                        <dd className="max-w-full break-words font-medium">
                          {separator >= 0
                            ? line.slice(separator + 1).trim()
                            : line}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                  {data[key]?.trim() || "Não informado nesta publicação."}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
