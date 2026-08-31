import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR_STACK:', error.stack || error.message));

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch(e) {
    console.log("Failed 5173, trying 5174");
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
