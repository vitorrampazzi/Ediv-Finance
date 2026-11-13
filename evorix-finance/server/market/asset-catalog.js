// Listing of the general catalog for GET /api/market/assets. The filtered and
// sorted rows depend only on the catalog snapshot and the sort, so they are
// computed once per snapshot instead of on every request (the search text is
// normalized once per asset too). Results and order match the previous
// per-request filter + sort, since the sort is stable and runs before the search.

export const sortFields = Object.freeze({
  volume: "volume",
  change: "changePercent",
  market_cap: "marketCap",
});

export function isEquityAsset(asset) {
  return (
    asset?.type === "stock" &&
    (asset.subType == null ||
      asset.subType === "stock" ||
      asset.subType === "unit")
  );
}

// Keyed by the catalog items array (a new array per catalog snapshot), so an
// old snapshot is released by the garbage collector once it is replaced.
const memo = new WeakMap();

function compareRows(left, right, sortBy, sortOrder) {
  const sign = sortOrder === "asc" ? 1 : -1;
  if (sortBy === "name")
    return (
      sign *
      String(left.asset.name).localeCompare(String(right.asset.name), "pt-BR")
    );
  const field = sortFields[sortBy];
  return (
    sign *
    ((Number(left.asset[field]) || 0) - (Number(right.asset[field]) || 0))
  );
}

// Equity rows with a price, sorted, each with its normalized search text.
// At most 8 entries per snapshot (4 sort fields x 2 orders).
export function sortedEquityRows(items, sortBy, sortOrder) {
  let byKey = memo.get(items);
  if (!byKey) {
    byKey = new Map();
    memo.set(items, byKey);
  }
  const key = `${sortBy}|${sortOrder}`;
  const cached = byKey.get(key);
  if (cached) return cached;
  const rows = items
    .filter((asset) => asset.price !== null)
    .filter(isEquityAsset)
    .map((asset) => ({
      asset,
      haystack:
        `${asset.symbol} ${asset.name} ${asset.sector || ""} ${asset.subSector || ""}`.toLocaleLowerCase(
          "pt-BR",
        ),
    }));
  rows.sort((left, right) => compareRows(left, right, sortBy, sortOrder));
  byKey.set(key, rows);
  return rows;
}

// `normalizedSearch` must already be lowercased with toLocaleLowerCase("pt-BR").
export function filterRows(rows, normalizedSearch) {
  if (!normalizedSearch) return rows;
  return rows.filter((row) => row.haystack.includes(normalizedSearch));
}
