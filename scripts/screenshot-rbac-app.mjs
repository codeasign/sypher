#!/usr/bin/env node
// One-off: capture screenshots of the running RBAC healthcare app for use
// in the playwright-test-automation course marketing page / docs.
import puppeteer from 'puppeteer';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT_DIR = path.resolve('apps/docs/static/img/playwright-test-automation');
mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// 1. Login page
await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0', timeout: 30000 });
await page.screenshot({ path: path.join(OUT_DIR, 'rbac-login.png') });
console.log('Saved rbac-login.png');

// 2. Log in as admin and screenshot whatever lands
try {
  const userSelectors = ['input[name="username"]', 'input#username', 'input[type="text"]'];
  const passSelectors = ['input[name="password"]', 'input#password', 'input[type="password"]'];
  let userField = null, passField = null;
  for (const sel of userSelectors) { userField = await page.$(sel); if (userField) break; }
  for (const sel of passSelectors) { passField = await page.$(sel); if (passField) break; }

  if (userField && passField) {
    await userField.type('admin');
    await passField.type('admin123');
    const submit = await page.$('button[type="submit"]') || await page.$('button');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
      submit ? submit.click() : Promise.resolve(),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUT_DIR, 'rbac-admin-dashboard.png') });
    console.log('Saved rbac-admin-dashboard.png, landed at', page.url());
  } else {
    console.log('Could not find login form fields, skipping dashboard screenshot');
  }
} catch (err) {
  console.error('Dashboard screenshot failed:', err.message);
}

await browser.close();
