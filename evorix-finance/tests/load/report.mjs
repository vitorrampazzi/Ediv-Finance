// Turns the k6 summaries in tests/load/out into one Markdown table.
import { existsSync, readFileSync } from "node:fs";

const out = new URL("./out/", import.meta.url);
const read = (name) => readFileSync(new URL(name, out), "utf8");
const levels = (process.env.LEVELS || "50,100,200,400,800").split(",");
const scenarios = [
  ["antes-70", "Código atual, banco a 70 ms (hoje)"],
  ["depois-70", "Código novo, banco a 70 ms"],
  ["depois-1", "Código novo, função ao lado do banco"],
];
const ms = (value) => `${Math.round(value)} ms`;
const lines = [
  "| Cenário | Pessoas simultâneas | Req/s | p50 | p95 | p99 | Erros | CPU do MySQL (média / máx.) |",
  "|---|---|---|---|---|---|---|---|",
];
const verdicts = [];
for (const [label, title] of scenarios) {
  if (!existsSync(new URL(`${label}-rtt.txt`, out))) continue;
  const rtt = read(`${label}-rtt.txt`).trim();
  let capacity = null;
  for (const vus of levels) {
    const file = `${label}-${vus}.json`;
    if (!existsSync(new URL(file, out))) continue;
    const { metrics } = JSON.parse(read(file));
    const duration = metrics.http_req_duration;
    const errors = metrics.unexpected_status?.value ?? 1;
    const cpu = read(`${label}-${vus}-cpu.txt`)
      .split("\n")
      .map((line) => Number.parseFloat(line))
      .filter(Number.isFinite);
    const average = cpu.length
      ? cpu.reduce((sum, value) => sum + value, 0) / cpu.length
      : 0;
    lines.push(
      `| ${title} (ida e volta ao banco: ${rtt} ms) | ${vus} | ${metrics.http_reqs.rate.toFixed(0)} | ${ms(duration.med)} | ${ms(duration["p(95)"])} | ${ms(duration["p(99)"])} | ${(errors * 100).toFixed(2)}% | ${average.toFixed(0)}% / ${Math.max(0, ...cpu).toFixed(0)}% |`,
    );
    if (duration["p(95)"] <= 1000 && errors <= 0.01) capacity = vus;
  }
  verdicts.push(
    `- ${title}: ${capacity ? `até ${capacity} pessoas simultâneas com p95 ≤ 1 s e erros ≤ 1%` : "nenhum nível testado ficou dentro de p95 ≤ 1 s e erros ≤ 1%"}.`,
  );
}
console.log(
  [
    "## Teste de carga (MySQL descartável com 1 CPU e 1 GB, como o plano grátis)",
    "",
    "Cada pessoa simultânea abre uma página a cada 3 a 7 segundos; 70% estão logadas.",
    "",
    ...lines,
    "",
    ...verdicts,
  ].join("\n"),
);
