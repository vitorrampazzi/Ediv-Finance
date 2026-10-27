import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { readUpload, ImportError } from "../server/spreadsheet.js";

function workbook(padding = "", extra = {}, level = 6) {
  const files = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>123</v></c></row></sheetData>${padding}</worksheet>`,
    ...extra,
  };
  return Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, text]) => [name, strToU8(text)]),
      ),
      { level },
    ),
  );
}
const request = (body) => ({
  body,
  is: (type) =>
    type ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});

test("XLSX cannot bypass the expanded-size ceiling by forging its central directory", async () => {
  assert.deepEqual(await readUpload(request(workbook())), [["123"]]);
  assert.deepEqual(await readUpload(request(workbook("", {}, 0))), [["123"]]);
  const payload = workbook(`<!--${"x".repeat(5_000_001)}-->`);
  assert.ok(
    payload.length < 16_000,
    "Controlled compressed fixture stays small",
  );
  let forged = false;
  for (let offset = 0; offset + 46 < payload.length; offset++) {
    if (payload.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = payload.readUInt16LE(offset + 28);
    if (
      payload.toString("utf8", offset + 46, offset + 46 + nameLength) !==
      "xl/worksheets/sheet1.xml"
    )
      continue;
    payload.writeUInt32LE(1024, offset + 24);
    forged = true;
    break;
  }
  assert.ok(forged);
  await assert.rejects(
    readUpload(request(payload)),
    (error) =>
      error instanceof ImportError &&
      /descompactada excede/.test(error.message),
  );
  // Hiding the size in both headers must still hit the native output bound.
  for (let offset = 0; offset + 30 < payload.length; offset++) {
    if (payload.readUInt32LE(offset) !== 0x04034b50) continue;
    const nameLength = payload.readUInt16LE(offset + 26);
    if (
      payload.toString("utf8", offset + 30, offset + 30 + nameLength) ===
      "xl/worksheets/sheet1.xml"
    )
      payload.writeUInt32LE(1024, offset + 22);
  }
  await assert.rejects(
    readUpload(request(payload)),
    (error) =>
      error instanceof ImportError &&
      /descompactada excede/.test(error.message),
  );
  const aggregate = workbook(
    "",
    Object.fromEntries(
      [1, 2, 3].map((i) => [`extra${i}.xml`, "x".repeat(3_400_000)]),
    ),
  );
  assert.ok(aggregate.length < 16_000);
  for (let offset = 0; offset + 46 < aggregate.length; offset++) {
    const signature = aggregate.readUInt32LE(offset);
    if (signature === 0x04034b50) aggregate.writeUInt32LE(1024, offset + 22);
    if (signature === 0x02014b50) aggregate.writeUInt32LE(1024, offset + 24);
  }
  await assert.rejects(
    readUpload(request(aggregate)),
    (error) =>
      error instanceof ImportError &&
      /descompactada excede/.test(error.message),
  );
});
