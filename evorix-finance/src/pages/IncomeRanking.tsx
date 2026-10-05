import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileSpreadsheet, Search, Star, Upload } from "lucide-react";
import { Card } from "../components/Card";
import { RankingFundamentals } from "../components/RankingFundamentals";
import type { RankingFundamentalData } from "../components/RankingFundamentals";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/authContext";
import { useFavoritos } from "../hooks/useFavoritos";

type Entry = RankingFundamentalData & {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string;
  targetPrice: string | null;
  horizonMonths: number | null;
  thesis: string | null;
  risks: string | null;
  sector: string | null;
};
type Ranking = {
  id: string | null;
  title: string;
  authorName: string | null;
  professionalCategory: string | null;
  professionalRegistration: string | null;
  entries: Entry[];
  updatedAt: string | null;
  sourceFileName: string | null;
  canManage: boolean;
  history: { id: string; title: string; createdAt: string }[];
};
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
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = (value: string) =>
  new Date(
    value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"),
  ).toLocaleString("pt-BR");
const input =
  "min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 text-sm font-semibold text-white hover:bg-evo-primaryHover disabled:opacity-50";
export function IncomeRanking() {
  const { user } = useAuth();
  const { toggleFavorito, isFavorito, error: favoriteError } = useFavoritos();
  const [ranking, setRanking] = useState<Ranking>(empty);
  const [publication, setPublication] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [horizon, setHorizon] = useState("");
  const [sort, setSort] = useState("rank");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [metadata, setMetadata] = useState({
    title: "",
    authorName: "",
    professionalCategory: "",
    professionalRegistration: "",
  });
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await apiRequest<Ranking>(
          "/api/rankings" +
            (publication
              ? "?publication=" + encodeURIComponent(publication)
              : ""),
          { signal },
        );
        if (!signal?.aborted) {
          setRanking(data);
          setError("");
        }
      } catch (reason) {
        if (!signal?.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [publication],
  );
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Ranking>(
      "/api/rankings" +
        (publication ? "?publication=" + encodeURIComponent(publication) : ""),
      { signal: controller.signal },
    )
      .then((data) => {
        setRanking(data);
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [publication]);
  const sectors = [
    ...new Set(
      ranking.entries
        .map((e) => e.sector)
        .filter((s): s is string => Boolean(s)),
    ),
  ].sort();
  const entries = useMemo(
    () =>
      ranking.entries
        .filter(
          (e) =>
            (!search ||
              (e.ticker + " " + e.companyName)
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (!sector || e.sector === sector) &&
            (!horizon ||
              (e.horizonMonths !== null && e.horizonMonths <= Number(horizon))),
        )
        .sort((a, b) =>
          sort === "potential"
            ? Number(b.expectedReturnPercent) - Number(a.expectedReturnPercent)
            : sort === "name"
              ? a.companyName.localeCompare(b.companyName)
              : a.rank - b.rank,
        ),
    [ranking.entries, search, sector, horizon, sort],
  );
  const sendFile = async (publish: boolean) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name))
        throw new Error("Use CSV UTF-8 ou .xlsx de até 1 MB.");
      const response = await fetch(
        "/api/rankings" + (publish ? "" : "/preview"),
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": file.name.toLowerCase().endsWith(".xlsx")
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Publication-Meta": encodeURIComponent(JSON.stringify(metadata)),
          },
          body: file,
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível ler o arquivo.");
      if (publish) {
        setMessage(result.message);
        setPreview([]);
        setFile(null);
        setPublication("");
        if (!publication) await load();
      } else setPreview(result.entries);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Falha na importação.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      id="pagina-conteudo"
      className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-10"
    >
      <section className="rounded-2xl border border-evo-border bg-evo-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
          Estudar cenários · entender riscos
        </p>
        <h1 className="mt-3 text-3xl font-bold">Ranking de previsões</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-evo-textSec">
          Explore as teses publicadas pela equipe, entenda os fatores que podem
          favorecer ou contrariar cada cenário e acompanhe as revisões ao longo
          do tempo.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/aprender#ranking" className={button}>
            <BookOpen size={17} /> Como interpretar o ranking
          </Link>
          <span className="self-center text-xs text-evo-textSec">
            A ordem da lista não representa uma probabilidade de lucro.
          </span>
        </div>
      </section>
      {(error || favoriteError) && (
        <p role="alert" className="notice-error">
          {error || favoriteError}
        </p>
      )}
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      {ranking.canManage && (
        <details className="rounded-xl border border-evo-border bg-evo-card p-5">
          <summary className="cursor-pointer font-semibold">
            Área da equipe · preparar nova publicação
          </summary>
          <p className="mt-3 text-sm text-evo-textSec">
            Primeira aba do Excel ou CSV UTF-8. Até 300 ativos. Revise todos os
            dados antes de publicar. Cada publicação preserva a versão anterior.
          </p>
          <a
            href="/modelos/ranking.csv"
            download
            className="mt-2 inline-block text-sm text-evo-accent underline"
          >
            Baixar modelo de planilha
          </a>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            O modelo inclui balanço patrimonial, DRE, fluxo de caixa,
            informações da empresa, dívida líquida e estatísticas. Preencha cada
            módulo como texto, com os valores, unidades e datas que deseja
            exibir. Período e fonte também são opcionais. Campos vazios aparecem
            como não informados. A lista de ações para pesquisa, sozinha, não é
            uma previsão.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                "title",
                "authorName",
                "professionalCategory",
                "professionalRegistration",
              ] as const
            ).map((key, i) => (
              <label key={key} className="text-sm">
                {
                  [
                    "Título da publicação",
                    "Nome profissional (opcional)",
                    "Categoria profissional (opcional)",
                    "Registro profissional (opcional)",
                  ][i]
                }
                <input
                  className={input + " mt-1"}
                  maxLength={key === "title" ? 160 : 120}
                  value={metadata[key]}
                  onChange={(e) =>
                    setMetadata((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            Planilha CSV ou Excel
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview([]);
                setMessage("");
              }}
              className="mt-2 block max-w-full text-sm"
            />
          </label>
          <button
            className={button + " mt-4"}
            disabled={!file || busy}
            onClick={() => void sendFile(false)}
          >
            <FileSpreadsheet size={16} />
            {busy ? "Processando…" : "Validar e ver prévia"}
          </button>
          {preview.length > 0 && (
            <section className="mt-5 space-y-3">
              <h2 className="font-semibold">
                Prévia · {preview.length} ativos
              </h2>
              <div className="max-h-72 overflow-auto rounded-lg border border-evo-border">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <caption className="sr-only">Ativos a publicar</caption>
                  <thead>
                    <tr>
                      <th className="p-3">Ativo</th>
                      <th>Potencial</th>
                      <th>Prazo</th>
                      <th>Tese / riscos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((e) => (
                      <tr key={e.ticker} className="border-t border-evo-border">
                        <td className="p-3">{e.ticker}</td>
                        <td>{e.expectedReturnPercent}%</td>
                        <td>{e.horizonMonths ?? "—"}</td>
                        <td>
                          <details>
                            <summary className="cursor-pointer py-3">
                              Ver tese e riscos
                            </summary>
                            <p className="max-w-lg whitespace-pre-wrap p-2">
                              {e.thesis || "Sem tese"}
                            </p>
                            <p className="max-w-lg whitespace-pre-wrap p-2">
                              {e.risks || "Sem riscos"}
                            </p>
                            <RankingFundamentals data={e} />
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-evo-textSec">
                Dados profissionais não preenchidos aparecerão como não
                informados. O conteúdo da prévia corresponde ao arquivo
                selecionado.
              </p>
              <button
                className={button}
                disabled={busy}
                onClick={() => void sendFile(true)}
              >
                <Upload size={16} /> Confirmar e publicar esta versão
              </button>
            </section>
          )}
        </details>
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{ranking.title}</h2>
            <p className="mt-1 text-xs text-evo-textSec">
              {ranking.updatedAt
                ? "Publicado em " + date(ranking.updatedAt)
                : "Aguardando a primeira publicação"}
            </p>
          </div>
          <label className="text-xs text-evo-textSec">
            Histórico de publicações
            <select
              className={input + " mt-1"}
              value={publication}
              onChange={(e) => {
                setPublication(e.target.value);
                setLoading(true);
              }}
            >
              <option value="">Publicação mais recente</option>
              {ranking.history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} · {date(h.createdAt)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 rounded-xl border border-evo-border bg-evo-card p-4 text-sm sm:grid-cols-3">
          <p>
            Responsável
            <br />
            <strong>{ranking.authorName || "Não informado"}</strong>
          </p>
          <p>
            Categoria profissional
            <br />
            <strong>{ranking.professionalCategory || "Não informada"}</strong>
          </p>
          <p>
            Registro profissional
            <br />
            <strong>
              {ranking.professionalRegistration || "Não informado"}
            </strong>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-evo-border bg-evo-bgMain px-3">
            <Search size={17} />
            <span className="sr-only">Buscar empresa ou ticker</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Empresa ou ticker"
              className="min-h-11 min-w-0 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            aria-label="Filtrar setor"
            className={input}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            <option value="">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar horizonte"
            className={input}
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
          >
            <option value="">Todos os prazos</option>
            <option value="6">Até 6 meses</option>
            <option value="12">Até 12 meses</option>
            <option value="24">Até 24 meses</option>
          </select>
          <select
            aria-label="Ordenar ranking"
            className={input}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="rank">Ordem da publicação</option>
            <option value="potential">Maior potencial informado</option>
            <option value="name">Nome da empresa</option>
          </select>
        </div>
        <p className="text-xs text-evo-textSec">
          {entries.length} de {ranking.entries.length} ativos · valores
          informados pelo autor, sem garantia de retorno.
        </p>
        {loading ? (
          <Card>
            <p role="status">Carregando publicação…</p>
          </Card>
        ) : !ranking.entries.length ? (
          <Card>
            <h3 className="font-semibold">
              A primeira análise ainda não foi publicada
            </h3>
            <p className="mt-2 text-sm text-evo-textSec">
              Enquanto isso, conheça os conceitos usados para avaliar cenários.
            </p>
            <Link
              to="/aprender"
              className="mt-4 inline-block text-evo-accent underline"
            >
              Começar a aprender
            </Link>
          </Card>
        ) : !entries.length ? (
          <Card>Nenhum ativo corresponde aos filtros.</Card>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.ticker}
              className="rounded-xl border border-evo-border bg-evo-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evo-accent/10 font-semibold text-evo-accent">
                    {entry.rank}
                  </span>
                  <div>
                    <h3 className="font-bold">
                      {entry.ticker}{" "}
                      <span className="font-normal text-evo-textSec">
                        {entry.companyName}
                      </span>
                    </h3>
                    <p className="mt-1 text-xs text-evo-textSec">
                      {entry.sector || "Setor não informado"}
                    </p>
                  </div>
                </div>
                {user ? (
                  <button
                    aria-label={
                      (isFavorito(entry.ticker)
                        ? "Remover dos"
                        : "Adicionar aos") +
                      " favoritos " +
                      entry.ticker
                    }
                    aria-pressed={isFavorito(entry.ticker)}
                    onClick={() => void toggleFavorito(entry.ticker)}
                    className="min-h-11 min-w-11 rounded-lg border border-evo-border p-3"
                  >
                    <Star
                      size={17}
                      fill={isFavorito(entry.ticker) ? "currentColor" : "none"}
                    />
                  </button>
                ) : (
                  <Link to="/entrar" className="text-sm text-evo-accent">
                    Entrar para favoritar
                  </Link>
                )}
              </div>
              <dl className="mt-4 grid gap-3 border-y border-evo-border py-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-evo-textSec">
                    Potencial informado
                  </dt>
                  <dd className="mt-1 font-numbers text-lg">
                    {Number(entry.expectedReturnPercent).toLocaleString(
                      "pt-BR",
                    )}
                    %
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-evo-textSec">
                    Preço-alvo informado
                  </dt>
                  <dd className="mt-1">
                    {entry.targetPrice
                      ? money.format(Number(entry.targetPrice))
                      : "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-evo-textSec">Horizonte</dt>
                  <dd className="mt-1">
                    {entry.horizonMonths
                      ? entry.horizonMonths + " meses"
                      : "Não informado"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold">Tese do cenário</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                    {entry.thesis ||
                      "A justificativa ainda não foi informada pelo autor."}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">
                    O que pode contrariar a previsão?
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                    {entry.risks ||
                      "Os riscos específicos ainda não foram informados. Não interprete isso como ausência de risco."}
                  </p>
                </div>
              </div>
              <RankingFundamentals data={entry} />
              <Link
                to="/aprender#ranking"
                className="mt-4 inline-block text-xs text-evo-accent underline"
              >
                Entender potencial, preço-alvo e prazo
              </Link>
            </article>
          ))
        )}
      </section>
      <aside className="rounded-xl border border-evo-border bg-evo-card p-4 text-xs leading-relaxed text-evo-textSec">
        Previsões são cenários, não garantias. A lista reproduz a análise
        enviada pelo responsável. Dados, premissas e preços podem estar
        desatualizados; nenhuma classificação determina se um investimento é
        adequado para você.
        {ranking.sourceFileName && (
          <span className="mt-2 block">Origem: {ranking.sourceFileName}</span>
        )}
      </aside>
    </section>
  );
}
