import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/storefront/items/*/alert', route => route.fulfill({ json: { ok: true } }));
  await page.goto(`${process.env.BASE_URL || 'http://localhost:3000'}/things/demo-prototype-cap`);
  const button = page.getByRole('button', { name: 'Notify me', exact: true });
  await button.waitFor();
  const lockStyles = () => page.evaluate(() => ({
    html: document.documentElement.style.overflow,
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
  }));
  const before = await lockStyles();
  for (const dismissal of ['Done', 'Escape']) {
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Item is reserved', exact: true });
    await dialog.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('heading', { name: 'Notification saved' }).waitFor();
    assert.equal((await lockStyles()).position, 'fixed');
    if (dismissal === 'Done') await page.getByRole('button', { name: 'Done', exact: true }).click();
    else await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.body.style.position !== 'fixed');
    assert.deepEqual(await lockStyles(), before);
  }
  console.log('Notification success dismissal restores scroll styles and allows reopening.');
} finally { await browser.close(); }
