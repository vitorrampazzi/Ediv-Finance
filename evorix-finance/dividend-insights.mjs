export function dividendNumber(value) {
  if (
    typeof value !== "string" ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function dividendComparison(value, reference) {
  const current = dividendNumber(value);
  const baseline = dividendNumber(reference);
  if (!(current > 0) || !(baseline > 0)) return null;
  const result = current / baseline - 1;
  return Number.isFinite(result) ? result : null;
}

const monthNames = [
  ["jan", "janeiro"],
  ["fev", "fevereiro"],
  ["mar", "marco"],
  ["abr", "abril"],
  ["mai", "maio"],
  ["jun", "junho"],
  ["jul", "julho"],
  ["ago", "agosto"],
  ["set", "setembro"],
  ["out", "outubro"],
  ["nov", "novembro"],
  ["dez", "dezembro"],
];
const monthNumbers = new Map(
  monthNames.flatMap((names, index) => names.map((name) => [name, index + 1])),
);

export function dividendAnnouncementMonths(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const tokens = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]/g, " - ")
    .split(/[\s,;/]+/)
    .filter(Boolean)
    .map((token) => token.replace(/\.$/, ""));
  const months = new Set();
  let index = 0;
  while (index < tokens.length) {
    const first = monthNumbers.get(tokens[index++]);
    if (!first) return null;
    if (["-", "a", "ate"].includes(tokens[index])) {
      index++;
      const last = monthNumbers.get(tokens[index++]);
      // A descending range has no year context; do not guess a year boundary.
      if (!last || last < first) return null;
      for (let month = first; month <= last; month++) months.add(month);
    } else months.add(first);
    if (tokens[index] === "e") {
      index++;
      if (index === tokens.length) return null;
    }
  }
  return [...months].sort((a, b) => a - b);
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantity = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function compactDividendValue(value, format) {
  const number = dividendNumber(value);
  if (number === null) return "Não informado";
  const [divisor, suffix] = [
    [1e9, "bi"],
    [1e6, "mi"],
    [1e3, "mil"],
  ].find(([limit]) => Math.abs(number) >= limit) || [1, ""];
  const formatted = (format === "currency" ? currency : quantity).format(
    number === 0 ? 0 : number / divisor,
  );
  return suffix ? `${formatted} ${suffix}` : formatted;
}
