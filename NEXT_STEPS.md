# Next Steps: Completing the Odyssey Web App Upgrade

## Status
We have implemented **Cloud File Storage**. Your receipts (PDFs, Emails) can now be uploaded to Supabase and viewed from anywhere (e.g., your phone), instead of just extracting text.

## ⚠️ ACTION REQUIRED: 1. Update .env Key
You need to add a special "Service Role" key to your local `.env` file. This allows the script to upload files without permission errors.

1.  Open your **Supabase Dashboard** in your browser.
2.  Go to **Project Settings** (gear icon) -> **API**.
3.  Find the `service_role` key (starts with `ey...`). **Copy it.**
4.  Open `c:\Users\jason.m.chgv\Documents\travel buddy\odyssey-web\.env` in VS Code.
5.  Add this new line:
    ```
    SUPABASE_SERVICE_ROLE_KEY=[PASTE_YOUR_KEY_HERE]
    ```
6.  Save the file.

## 2. Verify Everything Works
1.  Run `process_receipts.bat` (double click it or run in terminal).
    *   *Expected Output:* You should see "Using SERVICE_ROLE key..." and successful uploads.
2.  Refresh your local web app (`localhost:5173`).
3.  Click on a day with an activity (e.g., a Flight).
4.  Click the attachment link. It should open the PDF in a new tab (served from the cloud).

## 3. Deployment (Mobile Access)
Once step 2 works, you can deploy to Vercel to access it on your phone.

1.  Push your code to GitHub.
2.  Import the repo into Vercel.
3.  Add these environment variables to Vercel:
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_GOOGLE_MAPS_API_KEY`
    *   *(Do NOT add the SERVICE_ROLE_KEY to Vercel)*.

## Recent Code Changes
*   `ingest_to_supabase.py`: Now handles PDF uploads and linking.
*   `src/lib/db.js`: Syncs file attachments to your local app database.
*   `src/components/DayDetailModal.jsx`: Opens remote file links.
*   `README.md`: Updated with these instructions.

See you when you get back!
