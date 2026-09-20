import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function run() {
  const extensionPath = path.resolve('.output/chrome-mv3');
  const userDataDir = path.resolve('.temp-playwright-user-data');

  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  console.log('Launching browser with extension from:', extensionPath);
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker', {
      timeout: 10000,
    });
  }

  console.log('Service worker loaded at:', background.url());
  const extensionId = background.url().split('/')[2];
  console.log('Extension ID:', extensionId);

  const page = await context.newPage();
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  console.log('Navigating to popup:', popupUrl);
  await page.goto(popupUrl);

  const heading = await page.locator('h1').textContent();
  console.log('Rendered popup heading:', heading);

  const button = page.locator('button');
  const initialText = await button.textContent();
  console.log('Initial button state:', initialText);

  await button.click();
  const updatedText = await button.textContent();
  console.log('Updated button state after click:', updatedText);

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  console.log('Verification run finished cleanly!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
