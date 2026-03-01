
import os
import json
import re
import glob
from datetime import datetime
import sys

# Try imports
try:
    from pdfminer.high_level import extract_text as pdfminer_extract
    HAS_PDFMINER = True
except ImportError:
    HAS_PDFMINER = False

try:
    import extract_msg
    HAS_EXTRACT_MSG = True
except ImportError:
    HAS_EXTRACT_MSG = False

from email import policy
from email.parser import BytesParser

SOURCE_DIR = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs"
OUTPUT_FILE = "parsed_trips.json"

AIRPORTS = {
    "PRG": "Prague", "AUH": "Abu Dhabi", "MEL": "Melbourne", "SYD": "Sydney",
    "HND": "Tokyo", "NRT": "Tokyo", "KIX": "Osaka", "LHR": "London", "CDG": "Paris",
    "FCO": "Rome", "DXB": "Dubai", "SIN": "Singapore"
}

def clean_text(text):
    if not text:
        return ""
    # Remove null bytes and other non-printable chars that might break things
    text = text.replace('\x00', '')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_text_from_pdf(filepath):
    if not HAS_PDFMINER:
        return "[Error: pdfminer.six not installed]"
    try:
        text = pdfminer_extract(filepath)
        return clean_text(text)
    except Exception as e:
        return f"[Error parsing PDF: {e}]"

def extract_text_from_msg(filepath):
    text_content = ""
    try:
        with open(filepath, 'rb') as f:
            header = f.read(8)
        
        is_ole = header.startswith(b'\xd0\xcf\x11\xe0')
        
        if is_ole:
            if HAS_EXTRACT_MSG:
                msg = extract_msg.Message(filepath)
                if msg.body:
                    text_content = clean_text(msg.body)
                msg.close()
            else:
                return "[Error: OLE MSG file found but extract-msg not installed]"
        else:
            # EML or Text
            with open(filepath, 'rb') as f:
                # Fallback to latin-1 if utf-8 fails
                try:
                    content = f.read().decode('utf-8')
                except UnicodeDecodeError:
                    f.seek(0)
                    content = f.read().decode('latin-1', errors='ignore')
            
            # Simple parsing if it looks like headers
            if "Received:" in content or "From:" in content:
                msg = BytesParser(policy=policy.default).parsebytes(content.encode('utf-8'))
                body = msg.get_body(preferencelist=('plain', 'html'))
                if body:
                    text_content = clean_text(body.get_content())
                else:
                     text_content = clean_text(content) # Fallback to raw
            else:
                text_content = clean_text(content)

    except Exception as e:
        return f"[Error parsing MSG/EML: {e}]"
        
    return text_content

def parse_date(date_str):
    # Try various formats
    formats = [
        "%d %b %Y", "%d%b%Y", "%d %B %Y",  # 15 Jul 2026, 15Jul2026
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return None

def extract_trip_info(text, filepath):
    filename = os.path.basename(filepath)
    info = {
        "source_file": filename,
        "source_path": filepath,
        "type": "activity", # Default
        "title": filename,
        "location": "Unknown",
        "processed_at": datetime.now().isoformat()
    }
    
    # 1. Detect Type
    lower_text = text.lower()
    if "flight" in lower_text or "airline" in lower_text or "terminal" in lower_text:
        info["type"] = "flight"
    elif "hotel" in lower_text or "check-in" in lower_text or "booking" in lower_text:
        info["type"] = "lodging"
        
    # 2. Extract Dates
    date_patterns = [
        r'\b(\d{1,2}\s*[A-Za-z]{3}\s*\d{4})\b', # 15 Jul 2026
        r'\b(\d{1,2}[A-Za-z]{3}\d{4})\b',       # 15Jul2026
        r'\b(\d{4}-\d{2}-\d{2})\b'              # 2026-07-15
    ]
    
    valid_dates = []
    for pat in date_patterns:
        matches = re.findall(pat, text)
        for m in matches:
            dt = parse_date(m)
            if dt:
                valid_dates.append(dt)
            
    if valid_dates:
        valid_dates.sort()
        info["startDate"] = valid_dates[0]
        if len(valid_dates) > 1:
            # Simple heuristic: last date is end date
            info["endDate"] = valid_dates[-1]
        else:
            info["endDate"] = valid_dates[0]

    # 3. Extract Locations (Airport Codes) matches
    matches = []
    for code, city in AIRPORTS.items():
        if code in text:
            matches.append((text.find(code), code, city))
    
    matches.sort()
    
    if matches:
        if info["type"] == "flight" and len(matches) >= 2:
            origin = matches[0][2]
            dest = matches[-1][2]
            info["location"] = f"{origin} ({matches[0][1]}) to {dest} ({matches[-1][1]})"
            info["title"] = f"Flight to {dest}"
        else:
            info["location"] = matches[0][2]
            if info["type"] == "lodging":
                info["title"] = f"Stay in {matches[0][2]}"

    return info

def main():
    if not HAS_PDFMINER:
        print("Warning: pdfminer.six not found. PDF extraction will fail.")
        
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory not found: {SOURCE_DIR}")
        return

    parsed_data = []
    files = glob.glob(os.path.join(SOURCE_DIR, "*.*"))
    print(f"Scanning {len(files)} files in {SOURCE_DIR}...")
    
    for filepath in files:
        filename = os.path.basename(filepath)
        ext = os.path.splitext(filename)[1].lower()
        
        text = ""
        if ext == '.pdf':
            text = extract_text_from_pdf(filepath)
        elif ext in ['.msg', '.eml', '.txt']:
            text = extract_text_from_msg(filepath)
            
        if text and len(text) > 50 and not text.startswith("[Error"):
            trip_info = extract_trip_info(text, filepath)
            parsed_data.append(trip_info)
            # print(f"Parsed {filename}: {trip_info.get('title')}")
            
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(parsed_data, f, indent=2)
        
    print(f"Saved {len(parsed_data)} parsed records to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
