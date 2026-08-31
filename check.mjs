import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));

  console.log('Navigating to http://localhost:4173...');
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  } catch(e) {
    console.log("Failed 4173, trying 4174");
    await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });
  }
  
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('C:\\Users\\rohan\\.gemini\\antigravity\\brain\\6694d4b9-eac3-40de-b8ff-5d633c4e91b2\\scratch\\debug.html', html);
  
  const err = await page.evaluate(() => window.LAST_REACT_ERROR);
  console.log('LAST_REACT_ERROR:', err);

  await browser.close();
})();
