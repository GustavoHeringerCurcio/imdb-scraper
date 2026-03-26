import cron from 'node-cron';
import { runDailyScrapeJob } from './scrapeDaily.js';

let cronJobStarted = false;

/**
 * Start scheduled cron jobs
 * - Daily scrape at 2 AM
 */
export function startCronJobs() {
  if (cronJobStarted) {
    console.log('[CRON] Jobs already started, skipping initialization');
    return;
  }

  try {
    // Schedule: 0 2 * * * = 2:00 AM every day
    console.log('[CRON] 📅 Scheduling daily scrape job at 2:00 AM...');

    cron.schedule('0 2 * * *', () => {
      console.log('\n[CRON] ⏰ Triggering daily scrape job at 2 AM');
      runDailyScrapeJob().catch((error) => {
        console.error('[CRON] 💥 Cron job error:', error instanceof Error ? error.message : error);
      });
    });

    // For development testing: also add a 1-minute schedule (optional, commented out)
    // Uncomment the line below to test job every minute:
    // cron.schedule('*/1 * * * *', () => {
    //   console.log('[CRON-DEV] Testing scrape job (every minute)');
    //   runDailyScrapeJob();
    // });

    cronJobStarted = true;
    console.log('[CRON] ✓ Cron jobs initialized successfully');
  } catch (error) {
    console.error('[CRON] ✗ Failed to initialize cron:', error instanceof Error ? error.message : error);
  }
}

/**
 * Stop all cron jobs (optional graceful shutdown)
 */
export function stopCronJobs() {
  if (cronJobStarted) {
    cron.getTasks().forEach((task) => task.stop());
    cronJobStarted = false;
    console.log('[CRON] ✓ Cron jobs stopped');
  }
}
