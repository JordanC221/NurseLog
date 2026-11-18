import { test, expect } from '@playwright/test';

const accounts = [
  { email: 'pwa-one@example.test', password: 'fictional-pwa-password-one' },
  { email: 'pwa-two@example.test', password: 'fictional-pwa-password-two' },
];

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function apiCacheUrls(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(names.map(async (name) => {
      const cache = await caches.open(name);
      return (await cache.keys()).map((request) => request.url);
    }));
    return entries.flat().filter((url) => new URL(url).pathname.startsWith('/api/'));
  });
}

test('service worker does not cache private API data across account logout', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await login(page, accounts[0]);
  const firstAccountRecords = await page.evaluate(async () => {
    const created = await fetch('/api/entities/SkillLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_name: 'Fictional PWA isolation check', patient_id: 'DEMO-ONLY' }),
    });
    if (!created.ok) throw new Error(`Could not create fictional record: ${created.status}`);
    const response = await fetch('/api/entities/SkillLog?limit=100');
    return response.json();
  });
  expect(firstAccountRecords.map((record) => record.skill_name)).toContain('Fictional PWA isolation check');
  expect(await apiCacheUrls(page)).toEqual([]);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await apiCacheUrls(page)).toEqual([]);

  await login(page, accounts[1]);
  const secondAccountRecords = await page.evaluate(async () => {
    const response = await fetch('/api/entities/SkillLog?limit=100');
    return response.json();
  });
  expect(secondAccountRecords).toEqual([]);
  expect(await apiCacheUrls(page)).toEqual([]);
});
