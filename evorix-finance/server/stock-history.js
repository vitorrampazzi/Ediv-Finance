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

// The tickers in the snapshot, so a coverage check never parses 12 MB of JSON.
// tests/market-quotes.test.mjs keeps this list equal to the snapshot keys.
const snapshotTickers = new Set([
  "ABCB4", "ABEV3", "AGRO3", "ALOS3", "ALUP11", "AXIA3", "B3SA3", "BAZA3",
  "BBAS3", "BBDC3", "BBDC4", "BBSE3", "BEES3", "BMEB3", "BMEB4", "BMGB4",
  "BPAC11", "BRAP3", "BRAP4", "BRBI11", "BRSR6", "CEBR3", "CEBR5", "CEBR6",
  "CGAS5", "CGRA4", "CLSC4", "CMIG4", "CMIN3", "CPFE3", "CPLE3", "CSMG3",
  "CSUD3", "CXSE3", "DEXP3", "EGIE3", "EMAE4", "EQPA3", "FESA4", "FIQE3",
  "FLRY3", "GGBR3", "GOAU3", "GRND3", "IRBR3", "ISAE4", "ITSA4", "ITUB3",
  "ITUB4", "JHSF3", "KEPL3", "KLBN11", "KLBN3", "KLBN4", "LEVE3", "LOGG3",
  "LREN3", "MDIA3", "MULT3", "PASS3", "PETR4", "PINE4", "POMO3", "POMO4",
  "PSSA3", "RANI3", "RECV3", "ROMI3", "SANB11", "SANB3", "SANB4", "SAPR11",
  "SAPR3", "SAPR4", "SAUD3", "SBSP3", "SHUL4", "SLCE3", "SUZB3", "TAEE11",
  "TAEE3", "TAEE4", "TGMA3", "TIMS3", "UNIP6", "VALE3", "VBBR3", "VIVT3",
  "VULC3", "WIZC3",
]);

export function hasStockHistory(ticker) {
  return snapshotTickers.has(ticker);
}

export function stockHistory(ticker) {
  const all = loadStocks();
  return Object.hasOwn(all, ticker) ? all[ticker] : null;
}
