const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../frontend/node_modules/playwright'));

(async () => {
  console.log('Launching headless browser via Microsoft Edge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  // Wait 1.5 seconds for initial fixture load
  await page.waitForTimeout(1500);

  const title = await page.textContent('.bvt-logo-title');
  console.log('Found Title:', title);

  const motto = await page.textContent('.bvt-handwritten-motto');
  console.log('Found Motto:', motto);

  const mainHeading = await page.textContent('.bvt-main-heading');
  console.log('Found Main Heading:', mainHeading);

  const outDir = path.join(__dirname, '..', 'outputs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const screenshotPath = path.join(outDir, 'verification_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
  console.log('VERIFICATION COMPLETE');
})();
