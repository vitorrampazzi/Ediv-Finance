const { chromium } = require('playwright');
(async () => {
  const [svgPath, outPath, scale] = process.argv.slice(2);
  const fs = require('fs');
  const svg = fs.readFileSync(svgPath, 'utf8');
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const w = +m[1], h = +m[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: +(scale || 1) });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: w, height: h } });
  await browser.close();
})();
