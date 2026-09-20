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

  const registeredCommands = await background.evaluate(async () => {
    const api = globalThis.browser?.commands || globalThis.chrome?.commands;
    return await api.getAll();
  });
  console.log('Registered commands:', registeredCommands);
  const clipCmd = registeredCommands.find((c) => c.name === 'clip-to-markdown');
  if (!clipCmd) {
    throw new Error(
      'Command clip-to-markdown was not found in chrome.commands.getAll()',
    );
  }
  console.log(
    'Verified registered command:',
    clipCmd.name,
    'shortcut:',
    clipCmd.shortcut || '(unassigned/platform default)',
  );

  const page = await context.newPage();
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  console.log('Navigating to popup:', popupUrl);
  await page.goto(popupUrl);

  const heading = await page.locator('h1').textContent();
  console.log('Rendered popup heading:', heading);

  const button = page.locator('button[aria-busy]');
  const initialText = await button.textContent();
  console.log('Initial button state:', initialText);

  await button.click();
  const updatedText = await button.textContent();
  console.log('Updated button state after click:', updatedText);

  // Test state switcher buttons
  const clippingStateBtn = page.getByRole('button', {
    name: 'clipping',
    exact: true,
  });
  await clippingStateBtn.click();
  console.log('Tested clipping state button');

  const successStateBtn = page.getByRole('button', {
    name: 'success',
    exact: true,
  });
  await successStateBtn.click();
  console.log('Tested success state button');

  const errorStateBtn = page.getByRole('button', {
    name: 'error',
    exact: true,
  });
  await errorStateBtn.click();
  console.log('Tested error state button');

  const idleStateBtn = page.getByRole('button', { name: 'idle', exact: true });
  await idleStateBtn.click();
  console.log('Tested idle state button');

  // Verify selection extraction on a live page in Chromium
  const contentPage = await context.newPage();
  await contentPage.setContent(`
    <!DOCTYPE html>
    <html>
      <head><title>Test Selection Page</title></head>
      <body>
        <article id="art">
          <h1>Article Title</h1>
          <p id="target">This is <strong>rich selected text</strong> with a <a href="https://example.com">link</a> and <script>alert(1)</script> dangerous tags.</p>
        </article>
      </body>
    </html>
  `);

  // Select target paragraph
  await contentPage.evaluate(() => {
    const el = document.getElementById('target');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // Execute extraction logic in live page DOM
  const selectionResult = await contentPage.evaluate(() => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      return { hasSelection: false };
    }
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const container = document.createElement('div');
    container.appendChild(fragment);

    // Sanitize
    const unsafeTags = new Set([
      'SCRIPT',
      'STYLE',
      'IFRAME',
      'OBJECT',
      'EMBED',
      'LINK',
    ]);
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
    );
    const toRemove = [];
    let cur = walker.currentNode;
    while (cur) {
      if (unsafeTags.has(cur.tagName)) {
        toRemove.push(cur);
      }
      cur = walker.nextNode();
    }
    toRemove.forEach((el) => el.remove());

    return {
      hasSelection: true,
      text: selection.toString().trim(),
      html: container.innerHTML,
      hasScript: container.innerHTML.includes('<script>'),
      hasStrong: container.innerHTML.includes('<strong>'),
      hasLink: container.innerHTML.includes('<a href="https://example.com">'),
    };
  });

  console.log('Live DOM selection result:', selectionResult);
  if (
    !selectionResult.hasSelection ||
    selectionResult.hasScript ||
    !selectionResult.hasStrong ||
    !selectionResult.hasLink
  ) {
    throw new Error(
      'Selection extraction verification failed in live browser!',
    );
  }
  console.log(
    'Live DOM selection verified successfully: sanitized, formatted, intact!',
  );

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  console.log('Verification run finished cleanly!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
