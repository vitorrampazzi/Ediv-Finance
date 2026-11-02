import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const source = new URL("./data/stock-history.json.gz", import.meta.url);
let stocks = null;

// The snapshot expands to about 12 MB of JSON. Load it on the first history
// request instead of on every API cold start, then reuse the parsed object.
function loadStocks() {
  if (!stocks)
    stocks = JSON.parse(gunzipSync(readFileSync(source)).toString("utf8"))
      .stocks;
  return stocks;
}

export function stockHistory(ticker) {
  const all = loadStocks();
  return Object.hasOwn(all, ticker) ? all[ticker] : null;
}
