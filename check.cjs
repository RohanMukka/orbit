const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER_NET_ERROR:', request.url(), request.failure().errorText));

  console.log('Navigating to http://localhost:4174...');
  await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
