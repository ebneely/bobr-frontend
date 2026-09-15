/**
 * Drives the BOBR customer journey in a real browser and screenshots each step.
 *
 * Uses the headless-shell channel, which is the one that has network access in
 * this environment. Every assertion is on what the PAGE shows, not on what the
 * API returned — the point is to see it work, not to re-test the API.
 */
import { chromium } from '@playwright/test';

const FE = 'http://localhost:3100';
const OUT = process.argv[2] ?? '.';
const stamp = Date.now();
const EMAIL = `journey-${stamp}@bobr.local`;
const PASSWORD = 'journey-pass-12345';

const steps = [];
const log = (step, detail) => {
  steps.push({ step, ...detail });
  console.log(`  ${step}: ${JSON.stringify(detail)}`);
};

const browser = await chromium.launch({
  headless: true,
  channel: 'chromium-headless-shell',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  // --- 1. never heard of BOBR: land on the explanatory home page ----------
  await page.goto(`${FE}/pl`, { waitUntil: 'domcontentloaded' });
  const heroHeading = (await page.locator('h1').first().textContent())?.trim();
  await page.screenshot({ path: `${OUT}/01-home.png` });
  log('01 home', { heading: heroHeading });

  // --- 2. click the primary CTA. A REAL click, not element.click() --------
  const cta = page.getByRole('link', { name: /Rozpocznij/i }).first();
  await cta.scrollIntoViewIfNeeded();
  await cta.click(); // hit-tested; would fail on a dead or covered element
  await page.waitForURL(/\/pl\/login/, { timeout: 15000 });
  await page.screenshot({ path: `${OUT}/02-login.png` });
  log('02 cta -> login', { url: page.url() });

  // --- 3. register a brand-new account ------------------------------------
  await page.getByRole('link', { name: /Załóż konto/i }).first().click();
  await page.waitForURL(/\/pl\/register/, { timeout: 15000 });

  await page.getByLabel(/Imię i nazwisko/i).fill('Journey Tester');
  await page.getByLabel(/Adres e-mail/i).fill(EMAIL);
  await page.getByLabel(/^Hasło$/i).fill(PASSWORD);
  await page.screenshot({ path: `${OUT}/03-register-filled.png` });

  await page.getByRole('button', { name: /Załóż konto/i }).click();
  // Registration navigates to the dashboard origin on success.
  await page.waitForURL(/3101|dashboard/, { timeout: 25000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/04-after-register.png` });
  log('03 registered', { email: EMAIL, url: page.url() });

  // --- 4. the intake gate must refuse an order ----------------------------
  await page.goto(`${FE}/pl/order`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500); // let the meals list load
  await page.screenshot({ path: `${OUT}/05-order-screen.png` });

  // Select five days so the calendar minimum is satisfied, then try to place.
  const dayCells = page.locator('label:has(input[type="checkbox"])');
  const available = await dayCells.count();
  for (let i = 0; i < Math.min(5, available); i += 1) {
    await dayCells.nth(i).click();
  }
  await page.screenshot({ path: `${OUT}/06-days-picked.png` });
  log('04 order screen', { dayCellsFound: available });

  await page.getByRole('button', { name: /Zamawiam z obowiązkiem zapłaty/i }).click();
  await page.waitForTimeout(3000);
  const statusText = (await page.locator('[role="status"]').first().textContent())?.trim();
  await page.screenshot({ path: `${OUT}/07-gate-refusal.png` });
  log('05 gate', { message: statusText });
} catch (error) {
  log('FAILED', { error: String(error).split('\n')[0].slice(0, 200) });
  await page.screenshot({ path: `${OUT}/99-failure.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log('\n' + JSON.stringify({ email: EMAIL, steps }, null, 2));
}
