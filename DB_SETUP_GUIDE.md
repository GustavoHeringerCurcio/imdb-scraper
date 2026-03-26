# IMDb Scraper - Database & Cron Implementation

## 📋 Overview

The project now uses a **scheduled scraping + cached database** architecture instead of real-time scraping:

- ✅ **Database**: SQLite stores all ratings (`ratings.db` in project root)
- ✅ **Scheduler**: node-cron runs daily at 2 AM to scrape ratings
- ✅ **API**: New `/api/ratings/cached` returns instant database queries (~10-50ms)
- ✅ **Dashboard**: Shows ratings from database, includes manual "Refresh" button
- ✅ **Performance**: <500ms page load vs 20-50s with real-time scraping

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install better-sqlite3 node-cron
```

### 2. Start Dev Server
```bash
npm run dev
```

The app automatically:
- ✓ Initializes the SQLite database
- ✓ Starts cron scheduler (runs daily at 2 AM)

### 3. Seed Database (First Time)
```bash
# Add initial 4 movies to database
node src/scripts/seedDatabase.js
```

Output:
```
[SEED] Starting database seed script...
[SEED] Inserting 4 movies...
[SEED] ✓ Inserted: Project Hail Mary (ID: 1)
[SEED] ✓ Inserted: Marty Supreme (ID: 2)
[SEED] ✓ Inserted: Sinners (ID: 3)
[SEED] ✓ Inserted: Scream 7 (ID: 4)
[SEED] ✓ Seed complete. Total movies: 4
```

### 4. Test Dashboard
1. Open http://localhost:3000/dashboard
2. Should show 4 movies with OMDb data (posters, titles)
3. Ratings will show "N/A" initially (database is empty)
4. Click **"🔄 Refresh Ratings Now"** to trigger first scrape

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard (Frontend)                   │
│                                                             │
│  - Shows OMDb data (posters, titles) + cached ratings      │
│  - Button: "Refresh Ratings Now" → triggers manual scrape  │
└────────────────┬──────────────────────────────────────────┘
                 │
                 ├──→ GET /api/ratings/cached (instant ~10ms)
                 │    └──→ Queries ratings table from DB
                 │
                 └──→ POST /api/ratings/refresh-now (manual)
                      └──→ Runs scraper job + saves to DB

┌──────────────────────────────────────────────────────────────┐
│                    Scheduled Job (Server)                   │
│  Runs at 2 AM daily via node-cron                           │
│  → Fetches all movies from DB                              │
│  → Calls existing scraper: getLiveRatingsForMovies()        │
│  → Saves results to ratings table                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      SQLite Database                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   movies    │  │   ratings    │  │   job_logs       │   │
│  ├─────────────┤  ├──────────────┤  ├──────────────────┤   │
│  │ id          │  │ id           │  │ id               │   │
│  │ imdbId      │  │ movieId      │  │ jobType          │   │
│  │ title       │  │ source       │  │ status           │   │
│  │ poster      │  │ value        │  │ movieCount       │   │
│  │ rtSlug      │  │ status       │  │ startedAt        │   │
│  │ createdAt   │  │ scrapedAt    │  │ completedAt      │   │
│  │             │  │              │  │ errorMessage     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 New Files Created

```
src/
├── lib/db/
│   ├── init.js              # Database initialization, table creation
│   └── queries.js           # Query utilities
│
├── jobs/
│   ├── scrapeDaily.js       # Daily scraper job logic
│   └── cronServer.js        # Cron scheduler setup
│
├── scripts/
│   └── seedDatabase.js      # Seed initial movies
│
└── app/api/
    ├── ratings/
    │   ├── cached/
    │   │   └── route.js     # NEW: /api/ratings/cached (DB query)
    │   └── refresh-now/
    │       └── route.js     # NEW: /api/ratings/refresh-now (manual)
    │
    └── debug/
        └── status/
            └── route.js     # NEW: /api/debug/status (monitor)
```

---

## 🧪 Testing & Monitoring

### Option 1: Check Console Logs
While dev server is running, watch for:

```
[DB-INIT] ✓ Database initialized at: /Users/.../ratings.db
[CRON] ✓ Cron jobs initialized successfully
[SCRAPE-JOB] Starting daily scrape job...
[SCRAPE-JOB] ✓ Completed successfully
[API-CACHED] ✓ Returning cached ratings for 4 movies
```

### Option 2: Monitor API Endpoint
GET http://localhost:3000/api/debug/status

Response:
```json
{
  "status": "ok",
  "database": {
    "movies": 4,
    "ratings": 12,
    "jobLogs": 2
  },
  "lastJob": {
    "jobType": "daily_scrape",
    "status": "success",
    "movieCount": 4,
    "startedAt": "2026-03-25T02:00:00.000Z",
    "errorMessage": null
  },
  "recentJobs": [ ... ]
}
```

### Option 3: View SQLite Database Directly
```bash
# Install SQLite CLI (optional)
# macOS: brew install sqlite3
# Windows: Download from sqlite.org

# Check total ratings
sqlite3 ratings.db "SELECT COUNT(*) FROM ratings;"

# View all ratings for one movie
sqlite3 ratings.db "SELECT source, value, status, scrapedAt FROM ratings WHERE movieId=1;"

# Check job logs
sqlite3 ratings.db "SELECT * FROM job_logs ORDER BY startedAt DESC LIMIT 5;"
```

---

## ⚙️ Cron Schedule

**Default**: Runs at **2:00 AM every day**

### To Change Schedule:

Edit `src/jobs/cronServer.js` line ~18:

```javascript
// Current (2 AM daily)
cron.schedule('0 2 * * *', () => {

// Examples:
// Every hour at :00 = '0 * * * *'
// Every 6 hours = '0 */6 * * *'
// Daily at 3 PM = '0 15 * * *'
// Every Monday at 8 AM = '0 8 * * 1'

// See: https://crontab.guru for cron syntax
```

### For Testing: Run Every Minute

Uncomment lines 27-29 in `src/jobs/cronServer.js`:

```javascript
// Test every minute (for development)
cron.schedule('*/1 * * * *', () => {
  console.log('[CRON-DEV] Testing scrape job');
  runDailyScrapeJob();
});
```

---

## 🔧 Manual Testing

### Test 1: Trigger Fresh Scrape
```bash
curl -X POST http://localhost:3000/api/ratings/refresh-now
```

Expected response:
```json
{
  "status": "success",
  "message": "Scrape completed: 4 movies processed, 12 ratings saved",
  "moviesProcessed": 4,
  "ratingsSaved": 12,
  "duration": 45230
}
```

### Test 2: Fetch Cached Ratings
```bash
curl -X POST http://localhost:3000/api/ratings/cached \
  -H "Content-Type: application/json" \
  -d '{
    "movies": [
      {"id": 1, "title": "Project Hail Mary"},
      {"id": 2, "title": "Marty Supreme"}
    ]
  }'
```

Expected response:
```json
{
  "liveRatings": [
    {
      "id": 1,
      "imdb": {
        "value": "8.2",
        "status": "ok",
        "scrapedAt": "2026-03-25T02:00:00Z"
      },
      "rottenTomatoes": { ... },
      "metascore": { ... }
    },
    ...
  ],
  "count": 2,
  "source": "database"
}
```

### Test 3: Dashboard
1. Open http://localhost:3000/dashboard
2. Watch console for `[DASHBOARD]` logs
3. Should show movies + cached ratings
4. Click "Refresh Ratings Now" and watch for `[SCRAPE-JOB]` logs

---

## 📈 Performance Impact

### Before (Real-time scraping on page load):
- Scrape 4 movies: ~20-40s
- Scrape 10 movies: ~50-100s
- **Dashboard page load: ~20-50s**

### After (Database cached):
- Dashboard page load: **~200-500ms** ✓
- Scheduled job (off-peak): ~15-20s (at 2 AM)
- **Performance gain: 50-100x faster**

---

## 🐛 Troubleshooting

### Database doesn't create
```
Error: Cannot find module 'better-sqlite3'
→ Run: npm install better-sqlite3
```

### Cron job never runs
- Check console for `[CRON]` logs on startup
- If missing, manually call: `POST /api/ratings/refresh-now`
- For testing, uncomment the "every minute" schedule in `cronServer.js`

### Ratings show "N/A" after refresh
- Check `/api/debug/status` to see job status
- Check console for `[SCRAPE-JOB]` error logs
- Verify Puppeteer is working: test `/api/ratings/live` (old endpoint, still works)

### Reset Database
```bash
# Delete database file (will recreate on next startup)
rm ratings.db

# Re-seed with movies
node src/scripts/seedDatabase.js

# Manually refresh
POST /api/ratings/refresh-now
```

### Permission issues on Windows
If `better-sqlite3` build fails:
```bash
npm install --global windows-build-tools
npm install better-sqlite3 --build-from-source
```

---

## 📝 Next Steps

### Optional Enhancements:
1. **Email alerts** when job fails (nodemailer)
2. **Historical tracking**: Store each scrape as separate row
3. **Failed scrape retry**: Auto-retry failed sources
4. **User ratings**: Let users save their own ratings to DB
5. **Migrate to PostgreSQL** for production

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `src/lib/db/init.js` | Database schema + connection |
| `src/lib/db/queries.js` | Query helpers |
| `src/jobs/scrapeDaily.js` | Scraper job |
| `src/jobs/cronServer.js` | Cron scheduler |
| `src/app/api/ratings/cached/route.js` | DB query API |
| `src/app/api/ratings/refresh-now/route.js` | Manual refresh API |
| `src/scripts/seedDatabase.js` | Seed script |
| `src/app/dashboard/page.js` | Updated dashboard |
| `src/app/layout.js` | Updated to start cron |

---

## 🎯 Summary

✅ **Database**: SQLite (file-based, zero setup)
✅ **Scheduler**: node-cron at 2 AM daily
✅ **Performance**: <500ms dashboard loads (Was ~20-50s)
✅ **Notifications**: Console logs + `/api/debug/status` endpoint
✅ **Testing**: "Refresh Ratings Now" button on dashboard

🚀 **You're ready to go!**
