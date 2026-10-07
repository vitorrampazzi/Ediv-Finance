import { fromUnits, multiplyUnits, toUnits } from "./ledger.js";

// Ratios have four decimal places. Monetary calculations stay in the ledger's
// eight-decimal fixed point scale, including positions with fractional units.
function percentage(numerator, denominator) {
  if (denominator <= 0n) return null;
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const value = (absolute * 1_000_000n + denominator / 2n) / denominator;
  return `${negative && value !== 0n ? "-" : ""}${value / 10_000n}.${String(value % 10_000n).padStart(4, "0")}`;
}

function validQuotePrice(quote) {
  if (
    !quote ||
    quote.unavailable ||
    quote.currency !== "BRL" ||
    !/^\d{1,12}(?:\.\d{1,8})?$/.test(String(quote.price ?? ""))
  )
    return null;
  const price = toUnits(quote.price);
  return price > 0n ? price : null;
}

export function valuePortfolioPositions(positions, quotes) {
  const byTicker = new Map(quotes.map((quote) => [quote.symbol, quote]));
  return positions.map((position) => {
    const quote = byTicker.get(position.ticker) || null;
    const price = validQuotePrice(quote);
    const value =
      price === null ? null : multiplyUnits(toUnits(position.quantity), price);
    const cost = toUnits(position.costBasis);
    const result = value === null ? null : value - cost;
    return {
      ...position,
      quote,
      currentPrice: price === null ? null : fromUnits(price),
      marketValue: value === null ? null : fromUnits(value),
      unrealizedPnl: result === null ? null : fromUnits(result),
      unrealizedPnlPercent: result === null ? null : percentage(result, cost),
    };
  });
}

function quoteTimestamp(quote) {
  // A fetch/check time is not evidence of when the market price was observed.
  if (typeof quote?.marketTime !== "string") return null;
  const timestamp = Date.parse(quote.marketTime);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

/**
 * Describe the user's recorded holdings without inferring a price history,
 * daily portfolio return, taxes, suitability, or future performance.
 * Cost allocation includes all open positions. P&L covers priced positions
 * only, so missing quotes never become zero valuations or artificial losses.
 */
export function portfolioInsights(
  positions,
  summary,
  { asOf = new Date().toISOString() } = {},
) {
  const totalCost = positions.reduce(
    (sum, position) => sum + toUnits(position.costBasis),
    0n,
  );
  const priced = positions.filter((position) => position.marketValue !== null);
  const quotedCost = priced.reduce(
    (sum, position) => sum + toUnits(position.costBasis),
    0n,
  );
  const quotedValue = priced.reduce(
    (sum, position) => sum + toUnits(position.marketValue),
    0n,
  );
  const result = quotedValue - quotedCost;
  const orderedByCost = [...positions].sort((left, right) => {
    const leftCost = toUnits(left.costBasis);
    const rightCost = toUnits(right.costBasis);
    return leftCost === rightCost
      ? left.ticker.localeCompare(right.ticker)
      : leftCost > rightCost
        ? -1
        : 1;
  });
  const largest = orderedByCost[0] || null;
  const quotedResults = priced
    .map((position) => ({
      position,
      amount: toUnits(position.marketValue) - toUnits(position.costBasis),
    }))
    .sort((left, right) =>
      left.amount === right.amount
        ? left.position.ticker.localeCompare(right.position.ticker)
        : left.amount > right.amount
          ? -1
          : 1,
    );
  const gain = quotedResults.find((entry) => entry.amount > 0n);
  const loss = [...quotedResults].reverse().find((entry) => entry.amount < 0n);
  const describeResult = (entry) =>
    entry
      ? {
          ticker: entry.position.ticker,
          assetName: entry.position.assetName,
          amount: fromUnits(entry.amount),
          percent: percentage(entry.amount, toUnits(entry.position.costBasis)),
        }
      : null;
  const allocation = new Map();
  for (const position of positions) {
    allocation.set(
      position.assetType,
      (allocation.get(position.assetType) || 0n) + toUnits(position.costBasis),
    );
  }
  const quoteTimes = priced
    .map((position) => quoteTimestamp(position.quote))
    .filter(Boolean)
    .sort();
  return {
    asOf,
    status: !positions.length
      ? "EMPTY"
      : !priced.length
        ? "UNPRICED"
        : priced.length === positions.length
          ? "COMPLETE"
          : "PARTIAL",
    openCostBasis: fromUnits(totalCost),
    quotedCostBasis: fromUnits(quotedCost),
    quotedMarketValue: priced.length ? fromUnits(quotedValue) : null,
    unrealizedPnl: priced.length ? fromUnits(result) : null,
    unrealizedPnlPercent: priced.length ? percentage(result, quotedCost) : null,
    realizedPnl: summary.realizedPnl,
    receivedIncome: summary.receivedIncome,
    coverage: {
      pricedPositionCount: priced.length,
      totalPositionCount: positions.length,
      costPercent: percentage(quotedCost, totalCost),
      stalePositionCount: priced.filter((position) => position.quote?.stale)
        .length,
      unpricedTickers: positions
        .filter((position) => position.marketValue === null)
        .map((position) => position.ticker),
    },
    concentration: largest
      ? {
          ticker: largest.ticker,
          assetName: largest.assetName,
          costBasis: largest.costBasis,
          weightPercent: percentage(toUnits(largest.costBasis), totalCost),
        }
      : null,
    biggestGain: describeResult(gain),
    biggestLoss: describeResult(loss),
    allocation: [...allocation.entries()]
      .sort(([leftType, leftCost], [rightType, rightCost]) =>
        leftCost === rightCost
          ? leftType.localeCompare(rightType)
          : leftCost > rightCost
            ? -1
            : 1,
      )
      .map(([assetType, costBasis]) => ({
        assetType,
        costBasis: fromUnits(costBasis),
        weightPercent: percentage(costBasis, totalCost),
      })),
    positions: orderedByCost.map((position) => ({
      ticker: position.ticker,
      assetName: position.assetName,
      assetType: position.assetType,
      costBasis: position.costBasis,
      weightPercent: percentage(toUnits(position.costBasis), totalCost),
      marketValue: position.marketValue,
      unrealizedPnl: position.unrealizedPnl,
      unrealizedPnlPercent: position.unrealizedPnlPercent,
    })),
    quoteRange: {
      oldest: quoteTimes[0] || null,
      newest: quoteTimes.at(-1) || null,
    },
  };
}
