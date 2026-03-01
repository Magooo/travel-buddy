
import json
import os
import requests
import datetime
from dotenv import load_dotenv

# Load env
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Use Service Role Key if available (needed for Storage uploads), else fallback to Anon
SUPABASE_KEY = SERVICE_KEY if SERVICE_KEY else ANON_KEY
KEY_TYPE = "SERVICE_ROLE" if SERVICE_KEY else "ANON"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials (URL and at least one Key) not found in .env")
    exit(1)

print(f"Using {KEY_TYPE} key for ingestion...")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

INPUT_FILE = "parsed_trips.json"

def create_trip(title, start_date, end_date):
    url = f"{SUPABASE_URL}/rest/v1/trips"
    payload = {
        "title": title,
        "start_date": start_date,
        "end_date": end_date,
        "cover_image": "https://source.unsplash.com/random/800x600/?travel"
    }
    
    # Check if trip exists first?
    # For now, just create new one to avoid messing up existing logic
    response = requests.post(url, headers=HEADERS, json=payload)
    if response.status_code == 201:
        return response.json()[0]['id']
    else:
        print(f"Error creating trip (Status {response.status_code}): {response.text}")
        return None

def upload_file(filepath):
    if not filepath or not os.path.exists(filepath):
        return None
        
    import urllib.parse
    filename = os.path.basename(filepath)
    # URL Encode filename for storage
    safe_filename = urllib.parse.quote(filename)
    url = f"{SUPABASE_URL}/storage/v1/object/travel-docs/{safe_filename}"
    
    with open(filepath, 'rb') as f:
        file_data = f.read()

    # Upload with UPSERT (overwrite)
    headers = HEADERS.copy()
    headers["Content-Type"] = "application/pdf"
    # Use x-upsert header to overwrite existing files
    headers["x-upsert"] = "true"
    
    if KEY_TYPE == "ANON":
        print(f"Warning: Uploading {filename} with ANON key might fail due to RLS policies. Consider adding SUPABASE_SERVICE_ROLE_KEY to .env")
    
    response = requests.post(url, headers=headers, data=file_data)
    
    # Check for success (200/201) OR existing file (400 if x-upsert fails or we didn't use it correctly)
    # But with x-upsert=true it should return 200.
    # If using ANON key, x-upsert might fail due to policy.
    
    if response.status_code in [200, 201]:
        # Return Public URL
        return f"{SUPABASE_URL}/storage/v1/object/public/travel-docs/{safe_filename}"
    elif response.status_code == 400 and "resource already exists" in response.text:
        print(f"File {filename} already exists. Using existing URL.")
        return f"{SUPABASE_URL}/storage/v1/object/public/travel-docs/{safe_filename}"
    else:
        print(f"Failed to upload {filename}: {response.text}")
        return None

def ingest_activities(trip_id, activities):
    url = f"{SUPABASE_URL}/rest/v1/activities"
    
    payloads = []
    for act in activities:
        # Default start date if missing
        start = act.get("startDate")
        if not start:
            continue # Skip if no date
            
        # Prepare payload for Supabase (snake_case)
        payload = {
            "trip_id": trip_id,
            "title": act.get("title", "Untitled Activity"),
            "type": act.get("type", "activity"),
            "location": act.get("location", "Unknown"),
            "start_date": start,
            "end_date": act.get("endDate", start),
            "notes": f"Imported from {act.get('source_file')}",
            "status": "confirmed"
        }
        
        # Upload Attachment if source_path exists
        if act.get("source_path"):
            public_url = upload_file(act["source_path"])
            if public_url:
                payload["attachments"] = [{
                    "name": act.get("source_file"),
                    "url": public_url,
                    "type": "file"
                }]
                
        payloads.append(payload)
        
    if not payloads:
        print("No valid activities to ingest.")
        return

    # Batch insert
    response = requests.post(url, headers=HEADERS, json=payloads)
    if response.status_code == 201:
        print(f"Successfully ingested {len(payloads)} activities.")
    else:
        print(f"Error ingesting activities: {response.text}")

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Input file {INPUT_FILE} not found. Run ingest_docs_v2.py first.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if not data:
        print("No data in parsed_trips.json")
        return

    # Determine Trip Date Range
    dates = []
    for d in data:
        if d.get("startDate"):
            dates.append(d["startDate"])
        if d.get("endDate"):
             dates.append(d["endDate"])
             
    if not dates:
        print("No dates found in data. Cannot create trip.")
        return
        
    dates.sort()
    start_date = dates[0]
    end_date = dates[-1]
    
    print(f"Found {len(data)} documents spanning {start_date} to {end_date}")
    
    trip_title = f"Imported Trip {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
    print(f"Creating trip: {trip_title}")
    
    trip_id = create_trip(trip_title, start_date, end_date)
    
    if trip_id:
        print(f"Trip created with ID: {trip_id}")
        ingest_activities(trip_id, data)
    else:
        print("Failed to create trip. Check permissions?")

if __name__ == "__main__":
    main()
