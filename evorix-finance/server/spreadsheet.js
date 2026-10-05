import express from "express";
import { unzipSync } from "fflate";
import { readSheet } from "read-excel-file/node";

export const fileBody = express.raw({
  type: [
    "text/csv",
    "application/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  limit: "1mb",
});
export class ImportError extends Error {}
export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const first = source.split(/\r?\n/, 1)[0];
  const delimiter =
    (first.match(/;/g) || []).length > (first.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new ImportError("Há aspas sem fechamento no CSV.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length > 1001 || rows.some((row) => row.length > 40))
    throw new ImportError("Use até 1.000 linhas e 40 colunas.");
  return rows;
}
export async function readUpload(req) {
  // Some Node hosting adapters preparse textual bodies before Express runs.
  const body =
    typeof req.body === "string" &&
    !req.is("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      ? Buffer.from(req.body, "utf8")
      : req.body;
  if (!Buffer.isBuffer(body) || !body.length)
    throw new ImportError("Selecione um CSV UTF-8 ou Excel .xlsx válido.");
  if (body.length > 1_048_576) throw new ImportError("O arquivo excede 1 MB.");
  if (
    req.is("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  ) {
    try {
      let total = 0;
      unzipSync(body, {
        filter: (entry) => {
          total += entry.originalSize;
          if (entry.originalSize > 5_000_000 || total > 10_000_000)
            throw new ImportError(
              "A planilha descompactada excede o limite permitido.",
            );
          return false;
        },
      });
      const rows = await readSheet(body, { parseNumber: (value) => value });
      if (rows.length > 1001 || rows.some((row) => row.length > 40))
        throw new ImportError("Use até 1.000 linhas e 40 colunas.");
      return rows.map((row) =>
        row.map((cell) =>
          cell instanceof Date
            ? cell.toISOString().slice(0, 10)
            : String(cell ?? ""),
        ),
      );
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError(
        "Não foi possível ler o Excel. Use a primeira aba, sem macros, ou exporte como CSV UTF-8.",
      );
    }
  }
  return parseCsv(body.toString("utf8"));
}
export function localizedDecimal(value) {
  let text = String(value ?? "")
    .trim()
    .replace(/^(R\$|US\$|\$)\s*/i, "")
    .replace(/%$/, "")
    .replace(/\s/g, "");
  if (text.includes(",") && text.includes("."))
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  else text = text.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text))
    throw new ImportError(
      "Número inválido na planilha. Use valores sem fórmulas.",
    );
  return text;
}
export function csvDownload(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (
              /^\s*[=+@]/.test(text) ||
              /^[\t\r]/.test(text) ||
              /^\s*-\D/.test(text)
            )
              text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
