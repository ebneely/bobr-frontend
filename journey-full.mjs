/**
 * The whole BOBR journey, driven in a real browser.
 *
 * One person who has never heard of BOBR reaches a placed order they can track,
 * and an admin sees that order and answers them about it. Two browser contexts
 * so the customer stays signed in while the admin works.
 *
 * Every assertion is on what the PAGE shows. The API was already proven
 * separately; the point here is that a person can reach it.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const FE = 'http://localhost:3100';
const DASH = 'http://localhost:3101';
const OUT = process.argv[2] ?? '.';
const PHOTOS = process.argv[3];

const stamp = Date.now();
const EMAIL = `run-${stamp}@bobr.local`;
const PASSWORD = 'journey-pass-12345';
const ADMIN_EMAIL = 'admin@bobr.local';
const ADMIN_PASSWORD = 'bobr-local-admin';

const MEAL_PL = `Dieta obrazkowa ${stamp}`;
const MEAL_EN = `Photographed diet ${stamp}`;
const MEAL_PRICE = '50,00'; // 5000 grosze -> 10 days = 50000, -10% = 45000
const EXPECTED_TOTAL_GROSZE = 45000;

const results = [];
let failed = 0;
function record(step, ok, detail) {
  results.push({ step, ok, ...detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)}`);
}
const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }).catch(() => {});

const browser = await chromium.launch({
  headless: true,
  channel: 'chromium-headless-shell',
});

// Separate contexts: two different people, two different cookie jars.
const customerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await customerCtx.newPage();
const admin = await adminCtx.newPage();

// Console errors are collected, not ignored: "it looked right" is not the bar.
const consoleErrors = [];
for (const [who, p] of [['customer', page], ['admin', admin]]) {
  p.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${who}] ${m.text().slice(0, 200)}`);
  });
  p.on('pageerror', (e) => consoleErrors.push(`[${who}] pageerror: ${String(e).slice(0, 200)}`));
}

/**
 * Fill a controlled input and make sure React actually took the value.
 *
 * Playwright's fill() sets the DOM value and dispatches input, but before the
 * page has hydrated there is no React listener to hear it — so hydration then
 * resets the box to its empty state and the form submits blank. That failed as
 * a 400 from the API, which reads like a credentials problem and is not one.
 */
async function fillSettled(p, selector, value) {
  const field = p.locator(selector);
  await field.waitFor({ state: 'visible', timeout: 15000 });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await field.fill(value);
    await p.waitForTimeout(400);
    if ((await field.inputValue()) === value) return;
  }
  throw new Error(`value would not stick in ${selector} (page not hydrated?)`);
}

// The delivery address every order in this journey is sent to. 00-950 is in
// the seeded Warszawa zone (prefixes 00-04). The zone quote runs debounced once
// the postal code is complete, so wait for its answer before placing.
async function fillAddress(p) {
  await fillSettled(p, 'input[name="addressLine"]', 'ul. Marszałkowska 1');
  await fillSettled(p, 'input[name="city"]', 'Warszawa');
  await fillSettled(p, 'input[name="postalCode"]', '00-950');
  await p
    .locator('[data-testid="zone-quote"][data-quote="ok"]')
    .waitFor({ state: 'attached', timeout: 10000 })
    .catch(() => {});
}

async function signIn(p, email, password) {
  await p.goto(`${FE}/pl/login`, { waitUntil: 'domcontentloaded' });
  // Hydration has to finish before a controlled input will keep what it is given.
  await p.waitForLoadState('load');
  await fillSettled(p, 'input[name="email"]', email);
  await fillSettled(p, 'input[name="password"]', password);
  await p.locator('button[type="submit"]').click();

  // Signing in navigates away. Still sitting on /login means it failed, and
  // drifting on silently would blame the next step for this one's problem.
  await p
    .waitForURL((u) => !/\/login/.test(u.toString()), { timeout: 20000 })
    .catch(async () => {
      const shown = (await p.locator('[role="status"], [role="alert"]').first().textContent().catch(() => '')) ?? '';
      throw new Error(`sign-in did not leave /login for ${email}: ${shown.trim().slice(0, 120)}`);
    });
  await p.waitForTimeout(2000);
}

try {
  // ---- 1. lands on /pl, reads the home page -------------------------------
  await page.goto(`${FE}/pl`, { waitUntil: 'domcontentloaded' });
  const h1 = (await page.locator('h1').first().textContent())?.trim() ?? '';
  await shot(page, '01-home');
  record('1 home page readable with no account', h1.length > 0, { heading: h1.slice(0, 80) });

  // ---- 2. clicks the primary CTA ------------------------------------------
  const cta = page.getByRole('link', { name: /Rozpocznij/i }).first();
  await cta.scrollIntoViewIfNeeded();
  await cta.click(); // hit-tested; would fail on a dead or covered element
  await page.waitForURL(/\/pl\/login/, { timeout: 15000 });
  await shot(page, '02-login');
  record('2 CTA reaches login', /\/pl\/login/.test(page.url()), { url: page.url() });

  // ---- 3. registers --------------------------------------------------------
  await page.getByRole('link', { name: /Załóż konto/i }).first().click();
  await page.waitForURL(/\/pl\/register/, { timeout: 15000 });
  await page.waitForLoadState('load');
  await fillSettled(page, 'input[name="name"]', 'Journey Tester');
  await fillSettled(page, 'input[name="email"]', EMAIL);
  await fillSettled(page, 'input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /Załóż konto/i }).click();
  await page.waitForTimeout(4000);
  await shot(page, '03-registered');

  // Signed in survives a hard reload — the session is a cookie, not memory.
  await page.goto(`${DASH}/pl/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const afterReload = page.url();
  await shot(page, '04-session-survives-reload');
  record('3 registered, session survives hard reload', !/login/.test(afterReload), {
    email: EMAIL,
    url: afterReload,
  });

  // ---- 4. tries to order immediately: must be refused ----------------------
  await page.goto(`${FE}/pl/order`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const dayCells = page.locator('label:has(input[type="checkbox"])');
  const dayCount = await dayCells.count();
  for (let i = 0; i < 5; i += 1) await dayCells.nth(i).click();
  // A complete address, so the refusal comes from the intake gate on the
  // server and not from the storefront's own address validation.
  await fillAddress(page);
  await page.getByRole('button', { name: /Złóż zamówienie/i }).click();
  await page.waitForTimeout(3500);
  const refusal = (await page.locator('[role="status"]').first().textContent())?.trim() ?? '';
  await shot(page, '05-gate-refusal');
  // "Najpierw uzupełnij profil." — the intake gate's message, not "Uzupełnij adres dostawy."
  record('4 order refused before intake is complete', /profil/i.test(refusal), {
    daysOffered: dayCount,
    message: refusal.slice(0, 120),
  });

  // ---- 5. completes intake, including four real photo uploads -------------
  await page.goto(`${FE}/pl/intake`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await fillSettled(page, 'input[name="weightKg"]', '82.5');
  await fillSettled(page, 'input[name="heightCm"]', '181');
  await fillSettled(page, 'input[name="bodyComposition"]', '18% body fat');
  await page.locator('label[data-activity="GYM"] input').check();
  await page.getByRole('button', { name: /Zapisz/i }).first().click();
  await page.waitForTimeout(3000);
  await shot(page, '06-intake-saved');

  for (const [position, file] of [
    ['FRONT', 'front.jpg'],
    ['BACK', 'back.jpg'],
    ['LEFT', 'left.jpg'],
    ['RIGHT', 'right.jpg'],
  ]) {
    const path = `${PHOTOS}/${file}`;
    if (!existsSync(path)) throw new Error(`missing fixture ${path}`);
    await page.locator(`[data-testid="photo-input-${position}"]`).setInputFiles(path);
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1500);
  const banner = page.locator('[data-testid="gate-banner"]');
  const complete = await banner.getAttribute('data-complete');
  const stillMissing = await page.locator('[data-position][data-missing="true"]').count();
  await shot(page, '07-intake-complete');
  record('5 intake complete after 4 photo uploads', complete === 'true' && stillMissing === 0, {
    gateComplete: complete,
    photosStillMissing: stillMissing,
  });

  // ---- 6. (admin) creates a meal, then gives it a photo --------------------
  await signIn(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
  await admin.goto(`${DASH}/pl/dashboard/meals`, { waitUntil: 'domcontentloaded' });
  await admin.waitForTimeout(3000);
  await shot(admin, '08-admin-meals');

  await admin.locator('[data-testid="new-meal"]').click();
  await admin.waitForTimeout(1000);
  const form = admin.locator('[data-testid="meal-form"]');
  await form.locator('select[name="type"]').selectOption({ index: 0 });
  await form.locator('[name="namePl"]').fill(MEAL_PL);
  await form.locator('[name="nameEn"]').fill(MEAL_EN);
  await form.locator('[name="descriptionPl"]').fill('Z prawdziwym zdjeciem');
  await form.locator('[name="descriptionEn"]').fill('With a real photograph');
  await form.locator('[name="price"]').fill(MEAL_PRICE);
  const activeBox = form.locator('input[name="isActive"]');
  if (!(await activeBox.isChecked())) await activeBox.check();
  await shot(admin, '09-meal-form');
  await form.locator('button[type="submit"]').click();
  await admin.waitForTimeout(3500);
  await shot(admin, '10-meal-created');

  const createdCard = admin.locator('[data-testid="meal-list"] li', { hasText: MEAL_PL });
  const created = await createdCard.count();
  record('6a admin created a meal', created > 0, { name: MEAL_PL, cards: created });

  // The photo field only exists while editing: an object key needs an id.
  await createdCard.first().getByRole('button', { name: /Edytuj/i }).click();
  await admin.waitForTimeout(1500);
  await admin
    .locator('[data-testid="meal-form"] input[type="file"]')
    .setInputFiles(`${PHOTOS}/meal.jpg`);
  await admin.waitForTimeout(4000);
  await shot(admin, '11-meal-photo-uploaded');

  // The admin must SEE the photo, which is what proves CSP lets it through.
  const adminImg = admin.locator('[data-testid="meal-form"] img').first();
  const adminImgOk = await adminImg
    .evaluate((el) => el.complete && el.naturalWidth > 0)
    .catch(() => false);
  const adminImgSrc = await adminImg.getAttribute('src').catch(() => null);
  record('6b uploaded photo renders in the dashboard', adminImgOk === true, {
    naturalWidthPositive: adminImgOk,
    src: (adminImgSrc ?? '').slice(0, 90),
  });

  await admin.locator('[data-testid="meal-form"] button[type="submit"]').click();
  await admin.waitForTimeout(3000);
  await shot(admin, '12-meal-saved');

  // ---- 7. (customer) sees that meal, with the admin's image ---------------
  await page.goto(`${FE}/pl/order`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const mealCard = page.locator('label', { hasText: MEAL_PL }).first();
  await mealCard.scrollIntoViewIfNeeded();
  const custImg = mealCard.locator('img').first();
  const custImgOk = await custImg
    .evaluate((el) => el.complete && el.naturalWidth > 0)
    .catch(() => false);
  const custImgSrc = await custImg.getAttribute('src').catch(() => null);
  await shot(page, '13-storefront-meal-photo');
  record("7 the admin's photo renders on the storefront", custImgOk === true, {
    naturalWidthPositive: custImgOk,
    src: (custImgSrc ?? '').slice(0, 90),
  });

  // ---- 8. calendar mode: fewer than 5 days is refused ---------------------
  await mealCard.click();
  await page.waitForTimeout(500);
  const cells = page.locator('label:has(input[type="checkbox"])');
  const offered = await cells.count();
  await cells.nth(0).click();
  await cells.nth(1).click();
  await page.waitForTimeout(400);
  // The real string is "Kalendarz wymaga minimum 5 dni." — matched on its
  // distinctive part so a reworded sentence does not quietly stop asserting.
  const minWarnBefore = await page.getByText(/minimum 5 dni/i).count();
  await shot(page, '14-too-few-days');
  record('8 fewer than five days is refused', minWarnBefore > 0, {
    picked: 2,
    daysOffered: offered,
    warningShown: minWarnBefore,
  });

  // ---- 9/10. ten days, then place ----------------------------------------
  for (let i = 2; i < 10; i += 1) await cells.nth(i).click();
  await page.waitForTimeout(600);
  await fillAddress(page);
  await shot(page, '15-ten-days-picked');
  await page.getByRole('button', { name: /Złóż zamówienie/i }).click();
  await page.waitForTimeout(5000);
  const totalText = (await page.textContent('body')) ?? '';
  const expected = (EXPECTED_TOTAL_GROSZE / 100).toFixed(2).replace('.', ',');
  const totalShown = totalText.includes(expected);
  await shot(page, '16-order-placed');
  record('9+10 order placed, 10% discount and free shipping in the total', totalShown, {
    expectedZloty: expected,
    found: totalShown,
  });

  // ---- 11. the order is on their dashboard --------------------------------
  await page.goto(`${DASH}/pl/dashboard/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  // The dashboard uses shadcn Checkbox (ebneely/bobr-dashboard#16): a button
  // with role="checkbox" and aria-checked, not a native <input type="checkbox">.
  const dayBoxes = page.locator('[role="checkbox"]');
  const dayBoxCount = await dayBoxes.count();
  await shot(page, '17-dashboard-calendar');
  record('11 the order and its delivery days are on the dashboard', dayBoxCount >= 10, {
    deliveryDaysShown: dayBoxCount,
  });

  // ---- 12. mark a day eaten; it must survive a reload ---------------------
  await dayBoxes.first().check();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const stillEaten = await page.locator('[role="checkbox"][aria-checked="true"]').count();
  await shot(page, '18-day-eaten-persisted');
  record('12 a day marked eaten persists across a reload', stillEaten >= 1, {
    checkedAfterReload: stillEaten,
  });

  // ---- 13. raises a complaint ---------------------------------------------
  const COMPLAINT = `Poniedzialkowa dostawa spoznila sie o dwie godziny (${stamp})`;
  await page.goto(`${DASH}/pl/dashboard/notes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.locator('form select').selectOption('COMPLAINT');
  await page.locator('form textarea').fill(COMPLAINT);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(3500);
  const savedComplaint = await page.getByText(COMPLAINT).count();
  await shot(page, '19-complaint-raised');
  record('13 the complaint is saved against their account', savedComplaint > 0, {
    visibleToCustomer: savedComplaint,
  });

  // ---- 14. the admin sees the order and the complaint, and answers --------
  // The ORDER first, in the dashboard's own orders page. Until this step the
  // goal's "an admin can see that order" was only ever proven through the API.
  // Asserted on visible text — this customer's email and this order's total on
  // the same row — so it does not depend on the page's markup.
  await admin.goto(`${DASH}/pl/dashboard/orders`, { waitUntil: 'domcontentloaded' });
  await admin.waitForTimeout(3500);
  const expectedTotal = (EXPECTED_TOTAL_GROSZE / 100).toFixed(2).replace('.', ',');
  const orderRow = admin
    .locator('tr, li, article')
    .filter({ hasText: EMAIL })
    .filter({ hasText: expectedTotal });
  const adminSeesOrder = await orderRow.count();
  await shot(admin, '20a-admin-sees-order');
  record('14a admin sees the order in the dashboard', adminSeesOrder > 0, {
    email: EMAIL,
    total: expectedTotal,
    matchingRows: adminSeesOrder,
  });

  await admin.goto(`${DASH}/pl/dashboard/notes`, { waitUntil: 'domcontentloaded' });
  await admin.waitForTimeout(3500);
  const adminSees = await admin.getByText(COMPLAINT).count();
  await shot(admin, '20-admin-sees-complaint');

  const REPLY = `Przepraszamy — kierowca utknal w korku. Nastepna dostawa o 7:00 (${stamp})`;
  const noteItem = admin.locator('li', { hasText: COMPLAINT }).last();
  await noteItem.locator('textarea').fill(REPLY);
  await noteItem.getByRole('button').last().click();
  await admin.waitForTimeout(3500);
  await shot(admin, '21-admin-answered');
  record('14b admin sees the complaint and answers it', adminSees > 0, {
    visibleToAdmin: adminSees,
  });

  // The customer must be able to READ the answer — otherwise it went nowhere.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const customerSeesReply = await page.getByText(REPLY).count();
  await shot(page, '22-customer-reads-reply');
  record('14c the customer can read the reply', customerSeesReply > 0, {
    replyVisible: customerSeesReply,
  });

  // ---- the same order screen at 390px ------------------------------------
  const narrow = await customerCtx.newPage();
  await narrow.setViewportSize({ width: 390, height: 844 });
  await narrow.goto(`${FE}/pl/order`, { waitUntil: 'domcontentloaded' });
  await narrow.waitForTimeout(3000);
  const overflow = await narrow.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  await shot(narrow, '23-order-390px');
  record('narrow: order screen does not scroll sideways at 390px', overflow === false, {
    horizontalOverflow: overflow,
  });

  // ---- and once in English ------------------------------------------------
  await narrow.setViewportSize({ width: 1280, height: 900 });
  await narrow.goto(`${FE}/en/order`, { waitUntil: 'domcontentloaded' });
  await narrow.waitForTimeout(3000);
  const enBody = (await narrow.textContent('body')) ?? '';
  // A missing message renders as its literal path, e.g. "order.place".
  //
  // Checked against the REAL key names rather than by pattern: textContent
  // concatenates adjacent elements with no separator, so the note ending
  // "...place the order." followed by the button "Place order" reads as
  // "order.Place", and a pattern match calls that a leak. Key names are
  // lowercase-initial, so an exact comparison tells the two apart.
  const enMessages = JSON.parse(
    await readFile(new URL('./messages/en.json', import.meta.url), 'utf8'),
  );
  const rawKeys = [];
  for (const [ns, group] of Object.entries(enMessages)) {
    if (!group || typeof group !== 'object') continue;
    for (const key of Object.keys(group)) {
      if (enBody.includes(`${ns}.${key}`)) rawKeys.push(`${ns}.${key}`);
    }
  }
  await shot(narrow, '24-order-english');
  record('english: order screen shows no raw message keys', rawKeys.length === 0, {
    leakedKeys: rawKeys.slice(0, 5),
  });
} catch (error) {
  record('RUN ABORTED', false, { error: String(error).split('\n')[0].slice(0, 300) });
  await shot(page, '98-customer-at-failure');
  await shot(admin, '99-admin-at-failure');
} finally {
  console.log('\n--- console errors seen ---');
  const noisy = consoleErrors.filter(
    // Favicon 404s and HMR chatter are not defects in the product.
    (e) => !/favicon|hmr|hot-?update|Download the React DevTools/i.test(e),
  );
  console.log(noisy.length ? noisy.slice(0, 15).join('\n') : '(none)');
  console.log(`\n=== ${results.length - failed}/${results.length} checks passed ===`);
  console.log(JSON.stringify({ email: EMAIL, meal: MEAL_PL, results }, null, 2));
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}
