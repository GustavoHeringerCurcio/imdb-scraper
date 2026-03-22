import puppeteer from 'puppeteer';

/**
 * Browser Pool Manager
 * Maintains a reusable pool of Puppeteer browser instances
 * to avoid the overhead of launching a new browser for each request.
 * 
 * Features:
 * - Lazy initialization (first call launches browser)
 * - Connection reuse (pools up to MAX_INSTANCES)
 * - Graceful cleanup on process termination
 * - Logging with [BROWSER-POOL] prefix
 */

const MAX_INSTANCES = 2;
const BROWSER_POOL = [];
let LAUNCHING = false;

/**
 * Get or create a browser instance from the pool.
 * If pool is empty and max instances not reached, launches new browser.
 * If pool empty and max reached, waits for one to be returned.
 * 
 * @returns {Promise<import('puppeteer').Browser>} Browser instance
 */
export async function getBrowser() {
  // If we have available instances, return one
  if (BROWSER_POOL.length > 0) {
    console.log('[BROWSER-POOL] Reusing browser instance from pool');
    return BROWSER_POOL.pop();
  }

  // If we can still launch more browsers, do so
  if (BROWSER_POOL.length + (LAUNCHING ? 1 : 0) < MAX_INSTANCES) {
    LAUNCHING = true;
    try {
      console.log('[BROWSER-POOL] Launching new browser instance...');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      console.log('[BROWSER-POOL] ✓ Browser instance launched');
      
      // Ensure cleanup on process exit
      if (!global.BROWSER_POOL_CLEANUP_REGISTERED) {
        process.on('exit', async () => {
          console.log('[BROWSER-POOL] Closing all browser instances on process exit');
          while (BROWSER_POOL.length > 0) {
            const b = BROWSER_POOL.pop();
            await b.close();
          }
        });
        global.BROWSER_POOL_CLEANUP_REGISTERED = true;
      }
      
      return browser;
    } finally {
      LAUNCHING = false;
    }
  }

  // Pool exhausted, wait a bit and try again
  console.log('[BROWSER-POOL] ⏳ Pool exhausted, waiting for instance...');
  await new Promise(resolve => setTimeout(resolve, 100));
  return getBrowser();
}

/**
 * Return a browser instance to the pool for reuse.
 * 
 * @param {import('puppeteer').Browser} browser Browser instance to return
 */
export async function returnBrowser(browser) {
  if (browser && BROWSER_POOL.length < MAX_INSTANCES) {
    BROWSER_POOL.push(browser);
    console.log(`[BROWSER-POOL] Browser returned to pool (${BROWSER_POOL.length}/${MAX_INSTANCES})`);
  } else if (browser) {
    // Pool is full, close this instance
    console.log('[BROWSER-POOL] Pool full, closing excess browser instance');
    await browser.close();
  }
}

/**
 * Close all browser instances in the pool.
 * Call this during app shutdown or cleanup.
 */
export async function closeAllBrowsers() {
  console.log('[BROWSER-POOL] Closing all browser instances');
  while (BROWSER_POOL.length > 0) {
    const browser = BROWSER_POOL.pop();
    await browser.close();
  }
  console.log('[BROWSER-POOL] All browser instances closed');
}
