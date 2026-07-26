const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  const url = 'file:///' + path.resolve(__dirname, 'store.html').replace(/\\/g, '/');
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  console.log("Clicking add to cart button");
  try {
    await page.waitForSelector('.add-to-cart-btn', {timeout: 5000});
    await page.click('.add-to-cart-btn');
    console.log("Clicked! Wait for 1s...");
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    console.error("Could not click button:", e.message);
  }

  await browser.close();
})();
