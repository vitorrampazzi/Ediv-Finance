# Ranking import test fixture

`import-ranking.xlsx` contains a worksheet with importer-supported headers and one fictional company. Its synthetic values check decimal parsing: potential `27.5`, target price `42.75`, and horizon `12` months.

The suite sends this file only to the local server connected to a temporary schema. It is not adviser research and must not be published to production.
