import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Entry, Ranking } from "../lib/ranking";
import { CompanyLogo } from "./CompanyLogo";
import "./dividend-research.css";
import { StockMake } from "./stock-make/StockMake";

export function DividendCompanyResearch({
  entry,
  backLink,
  previous,
  next,
  companyLink,
}: {
  entry: Entry;
  ranking: Ranking;
  backLink: ReactNode;
  previous?: Entry;
  next?: Entry;
  companyLink: (ticker: string) => string;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(
    () => title.current?.focus({ preventScroll: true }),
    [entry.ticker],
  );
  return (
    <article
      id="pagina-conteudo"
      className="dividend-company -mx-4 -mt-4 md:-mx-8 md:-mt-10"
    >
      <StockMake entry={entry} titleRef={title} backLink={backLink} />
      <div className="mx-auto max-w-[1280px] px-5 pb-10 md:px-10">
        <nav
          aria-label="Outras pesquisas desta publicação"
          className="grid gap-3 sm:grid-cols-2"
        >
          {[
            { entry: previous, label: "Pesquisa anterior", Icon: ArrowLeft },
            { entry: next, label: "Próxima pesquisa", Icon: ArrowRight },
          ].map(
            ({ entry: item, label, Icon }) =>
              item && (
                <Link
                  key={label}
                  to={companyLink(item.ticker)}
                  className="flex min-h-16 min-w-0 items-center gap-3 rounded-lg border border-evo-border p-4 hover:border-evo-accent"
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-evo-textSec">
                      {label}
                    </span>
                    <span className="mt-1 block break-words">
                      {item.ticker} · {item.companyName}
                    </span>
                  </span>
                  <CompanyLogo ticker={item.ticker} size="sm" />
                </Link>
              ),
          )}
        </nav>
      </div>
    </article>
  );
}
