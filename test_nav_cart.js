const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ executablePath: puppeteer.executablePath() });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  const url = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  console.log("Clicking nav-cart button");
  try {
    await page.waitForSelector('.nav-cart');
    await page.click('.nav-cart');
    console.log("Clicked! Wait for 1s...");
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if cart drawer is active
    const isActive = await page.evaluate(() => {
      const drawer = document.getElementById('cartDrawer');
      return drawer && drawer.classList.contains('active');
    });
    console.log("Cart drawer active?", isActive);
  } catch (e) {
    console.error("Could not click button:", e.message);
  }

  await browser.close();
})();
