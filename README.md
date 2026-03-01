# Odyssey: Personal Travel Manager (Magoo Map)

A modern travel itinerary manager focused on visual clarity, timeline-based planning, and document ingestion. Based on the **"Who Gave Magoo the Map"** specification.

## Features

### 1. Document Ingestion Pipeline
- **Smart Parsing:** Automatically extracts dates, locations, and trip titles from PDF receipts and Emails (`.msg`, `.eml`, `.pdf`, `.txt`).
- **Supabase Sync:** Pushes parsed data to a cloud database for access anywhere.
- **Batch Processing:** Run `process_receipts.bat` to update your itinerary instantly.

### 2. Interactive Timeline Dashboard
- **Day Tiles:** Visual calendar grid showing your trip day-by-day.
- **Spanning Activities:** Multi-day bookings (Car Rentals, Stays) span across tiles visually.
    - Start Day: "Title (Start) [Time]"
    - Middle Days: "Title" (faded)
    - End Day: "Title (End) [Time]"
- **Responsibility Tags:** Assign "Jason", "Cathryn", etc. to activities.
- **Attachments:** View linked receipts directly from day details.

### 3. Progressive Web App (PWA) Ready
- Built with React + Vite + Dexie.js (offline-first local database) + Supabase (cloud sync).
- Works offline once loaded.

## How to Update Itinerary

1.  **Add Receipts:**
    - Save your `.pdf` or email files to:
      `Documents\travel buddy\email recipts of travel docs`

    > **Important:** To enable PDF uploads to the cloud, you must add `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file.
    > 1. Go to Supabase Dashboard > Project Settings > API.
    > 2. Copy "service_role" secret.
    > 3. Add to `.env`: `SUPABASE_SERVICE_ROLE_KEY=ey...`

2.  **Run Processor:**
    - Double-click `process_receipts.bat` in the `odyssey-web` folder.
    - Wait for "SUCCESS!" message.

3.  **View Changes:**
    - Open the web app (localhost or deployed URL).
    - Reload the page. New trips/activities will appear.

## Development

```bash
# Install dependencies
npm install

# Run local server
npm run dev

# Build for production
npm run build
```

## Deployment (Optional)

To access on your phone:
1.  Push code to GitHub.
2.  Connect repository to Vercel/Netlify.
3.  Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY`) to Vercel dashboard.
4.  Visit the Vercel URL on your phone!

*Note: Ingestion (Step 1 & 2) must be done on your PC where the python scripts reside. The web app is for Viewing/Editing.*
