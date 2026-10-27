import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const { stocks } = JSON.parse(
  gunzipSync(
    readFileSync(new URL("./data/stock-history.json.gz", import.meta.url)),
  ).toString("utf8"),
);

export function stockHistory(ticker) {
  return Object.hasOwn(stocks, ticker) ? stocks[ticker] : null;
}
