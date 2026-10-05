export const SCALE = 100_000_000n;
export function toUnits(value) {
  const text = String(value);
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const units =
    BigInt(whole || "0") * SCALE + BigInt(fraction.padEnd(8, "0").slice(0, 8));
  return negative ? -units : units;
}
export function fromUnits(value) {
  const n = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${n / SCALE}.${String(n % SCALE).padStart(8, "0")}`;
}
export const multiplyUnits = (a, b) => (a * b + SCALE / 2n) / SCALE;
export function ledger(transactions, events = []) {
  const positions = new Map();
  let realized = 0n;
  let income = 0n;
  let purchases = 0n;
  let sales = 0n;
  const monthly = new Map();
  const rows = [
    ...transactions.map((row) => ({ ...row, date: row.traded_at, order: 0 })),
    ...events
      .filter((row) => row.status === "RECEIVED")
      .map((row) => ({
        ...row,
        date:
          row.occurred_at +
          (["SPLIT", "BONUS"].includes(row.kind)
            ? " 00:00:00.000"
            : " 23:59:59.999"),
        order: ["SPLIT", "BONUS"].includes(row.kind) ? -1 : 1,
      })),
  ].sort(
    (a, b) =>
      String(a.date).localeCompare(String(b.date)) ||
      a.order - b.order ||
      (a.side === b.side
        ? 0
        : a.side === "BUY"
          ? -1
          : b.side === "BUY"
            ? 1
            : 0) ||
      String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
      String(a.id || "").localeCompare(String(b.id || "")),
  );
  for (const row of rows) {
    const current = positions.get(row.ticker) || {
      ticker: row.ticker,
      assetName: row.asset_name || row.ticker,
      assetType: row.asset_type || "ACAO",
      quantity: 0n,
      costBasis: 0n,
    };
    if (row.kind === "DIVIDEND" || row.kind === "JCP")
      income += toUnits(row.amount);
    else if (row.kind === "SPLIT" || row.kind === "BONUS") {
      if (!current.quantity)
        throw new Error(`Não há posição de ${row.ticker} na data do evento.`);
      current.quantity = multiplyUnits(current.quantity, toUnits(row.factor));
      if (!current.quantity)
        throw new Error("O fator do evento zera a posição.");
      if (row.kind === "BONUS") current.costBasis += toUnits(row.amount || "0");
    } else {
      const quantity = toUnits(row.quantity);
      const gross = multiplyUnits(quantity, toUnits(row.unit_price));
      const fees = toUnits(row.fees || "0");
      if (current.quantity > 0n && current.assetType !== row.asset_type)
        throw new Error(
          "A operação informa classes diferentes para o mesmo ticker. Corrija a classe dos registros.",
        );
      current.assetName = row.asset_name;
      current.assetType = row.asset_type;
      if (row.side === "BUY") {
        current.quantity += quantity;
        current.costBasis += gross + fees;
        purchases += gross + fees;
      } else {
        if (current.quantity < quantity)
          throw new Error(
            `A operação deixa ${row.ticker} com quantidade negativa na data informada.`,
          );
        const reduction =
          (current.costBasis * quantity + current.quantity / 2n) /
          current.quantity;
        realized += gross - fees - reduction;
        sales += gross - fees;
        current.quantity -= quantity;
        current.costBasis = current.quantity
          ? current.costBasis - reduction
          : 0n;
      }
    }
    positions.set(row.ticker, current);
    const month = String(row.date).slice(0, 7);
    monthly.set(month, {
      month,
      costBasis: fromUnits(
        [...positions.values()].reduce((sum, p) => sum + p.costBasis, 0n),
      ),
      realizedPnl: fromUnits(realized),
      income: fromUnits(income),
    });
  }
  return {
    positions: [...positions.values()]
      .filter((p) => p.quantity > 0n)
      .map((p) => ({
        ...p,
        quantity: fromUnits(p.quantity),
        costBasis: fromUnits(p.costBasis),
        averageCost: fromUnits(
          (p.costBasis * SCALE + p.quantity / 2n) / p.quantity,
        ),
      })),
    summary: {
      realizedPnl: fromUnits(realized),
      receivedIncome: fromUnits(income),
      purchases: fromUnits(purchases),
      sales: fromUnits(sales),
    },
    monthly: [...monthly.values()],
  };
}
