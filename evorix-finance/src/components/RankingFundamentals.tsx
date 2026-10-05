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
  ["balanceSheet", "Balanço patrimonial"],
  ["incomeStatement", "DRE — Demonstração do Resultado do Exercício"],
  ["cashFlow", "Fluxo de caixa"],
  ["companyInformation", "Informações da empresa"],
  ["netDebt", "Dívida líquida"],
  ["statistics", "Estatísticas"],
] as const;

export function RankingFundamentals({
  data,
}: {
  data: RankingFundamentalData;
}) {
  const filled = modules.filter(([key]) => Boolean(data[key]?.trim())).length;
  return (
    <details className="mt-4 rounded-lg border border-evo-border">
      <summary className="min-h-11 cursor-pointer p-3 text-sm font-semibold">
        Dados da empresa · {filled} de {modules.length} módulos preenchidos
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
        <div className="grid gap-3 md:grid-cols-2">
          {modules.map(([key, label]) => (
            <section
              key={key}
              className="min-w-0 rounded-lg border border-evo-border bg-evo-bgMain p-4"
            >
              <h4 className="text-sm font-semibold">{label}</h4>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                {data[key]?.trim() || "Não informado nesta publicação."}
              </p>
            </section>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-evo-textSec">
          Conteúdo informado pela equipe na planilha. Os módulos não são
          atualizados automaticamente pelas cotações.
        </p>
      </div>
    </details>
  );
}
