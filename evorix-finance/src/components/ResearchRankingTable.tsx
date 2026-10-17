import { useId } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  hasResearchModule,
  researchModuleLink,
  researchModules,
} from "../../research-modules.mjs";
import type { Entry } from "../lib/ranking";
import { CompanyLogo } from "./CompanyLogo";
import "./research-ranking-table.css";

export function ResearchRankingTable({
  entries,
  demo,
  researchLink,
}: {
  entries: Entry[];
  demo: boolean;
  researchLink: (ticker: string) => string;
}) {
  const hintId = useId();
  return (
    <div className="research-table">
      <p id={hintId} className="research-table-hint">
        {demo
          ? "Demonstração · empresas e conteúdos fictícios. "
          : "Conteúdos da publicação selecionada. "}
        Abra a empresa para ler a pesquisa ou selecione um módulo disponível.
        <span className="research-table-scroll-hint">
          {" "}
          Deslize a tabela para consultar todos os módulos.
        </span>
      </p>
      <div
        className="research-table-region"
        role="region"
        aria-label="Módulos de pesquisa por empresa"
        aria-describedby={hintId}
        tabIndex={0}
      >
        <table className="research-modules-table">
          <caption className="sr-only">
            Disponibilidade dos módulos por empresa
            {demo
              ? " — demonstração com dados fictícios"
              : " — publicação selecionada"}
            .
          </caption>
          <colgroup>
            <col className="research-table-company-col" />
            {researchModules.map(({ key }) => (
              <col key={key} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="research-table-company">
                Empresa / ativo
              </th>
              {researchModules.map(({ key, label }) => (
                <th key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const destination = researchLink(entry.ticker);
              return (
                <tr key={entry.ticker}>
                  <th scope="row" className="research-table-company">
                    <Link
                      to={destination}
                      className="research-table-company-link"
                      aria-label={`Abrir pesquisa de ${entry.companyName} (${entry.ticker})`}
                    >
                      <CompanyLogo
                        ticker={entry.ticker}
                        demo={demo}
                        size="sm"
                      />
                      <span className="research-table-company-copy">
                        <strong>{entry.ticker}</strong>
                        <span title={entry.companyName}>
                          {entry.companyName}
                        </span>
                      </span>
                    </Link>
                  </th>
                  {researchModules.map(({ key, label }) => (
                    <td key={key}>
                      {hasResearchModule(entry, key) ? (
                        <Link
                          to={researchModuleLink(destination, key)}
                          className="research-table-module-link"
                          aria-label={`${label} de ${entry.companyName} (${entry.ticker}): disponível${demo ? " na demonstração" : ""}`}
                        >
                          <Check size={13} aria-hidden="true" />
                          <span>Disponível</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="research-table-unavailable">
                          Não publicado
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
