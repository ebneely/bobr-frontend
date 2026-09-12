/**
 * Does a Playwright browser have network access in this environment, or not?
 *
 * Tested directly rather than inherited from a report. Tries the headless
 * shell first because a headed launch is the more likely thing to be blocked,
 * and reports the exact failure rather than "the browser does not work".
 */
import { chromium } from '@playwright/test';

const TARGET = process.argv[2] ?? 'http://localhost:3100/pl/login';
const OUT = process.argv[3] ?? 'probe.png';

const results = [];

for (const mode of ['headless-shell', 'headless', 'headed']) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: mode !== 'headed',
      ...(mode === 'headless-shell' ? { channel: 'chromium-headless-shell' } : {}),
    });

    const page = await browser.newPage();
    const response = await page.goto(TARGET, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    const title = await page.title();
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    await page.screenshot({ path: OUT, fullPage: false });

    results.push({
      mode,
      ok: true,
      status: response?.status() ?? null,
      title,
      h1: h1?.trim().slice(0, 60) ?? null,
    });
    await browser.close();
    break; // one working mode is all that is needed
  } catch (error) {
    results.push({ mode, ok: false, error: String(error).split('\n')[0].slice(0, 160) });
    if (browser) await browser.close().catch(() => {});
  }
}

console.log(JSON.stringify(results, null, 2));
