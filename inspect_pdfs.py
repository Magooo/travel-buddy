
import os
import sys

# Since I don't have pypdf installed in this env, I'll use the basic string extraction method 
# which I used before for the extracted contents. It worked okay for text.

files_to_check = [
    r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs\Guest_MCHUGH9453481.pdf",
    r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs\JASON MCHUGH 8BMK5X 15JUL 1140 PRG.pdf"
]

def extract_strings(filename):
    print(f"--- Processing {os.path.basename(filename)} ---")
    with open(filename, 'rb') as f:
        data = f.read()
    
    # Simple extraction of readable ASCII/UTF strings
    import re
    # Look for dates like dd MMM yyyy or dd/mm/yyyy
    # Look for "Embarkation", "Depart", "Arrive"
    
    text = ""
    try:
        text = data.decode('latin-1') # specific encoding often keeps text readable in PDFs
    except:
        pass
        
    # Extract interesting lines
    lines = text.split('\n')
    for line in lines:
        if any(keyword in line for keyword in ["2026", "Jun", "Jul", "May", "Embark", "Depart", "Arrive", "Flight", "Viking", "Grand European"]):
             # Clean up
             clean = "".join(c for c in line if c.isalnum() or c in " :/-.,")
             if len(clean) > 10:
                print(clean.strip())

    # Regular expression for more specific chunks if line-based fails (compressed streams)
    # This is a fallback to find dates in binary soup
    print("--- Regex Search in Binary ---")
    matches = re.findall(br'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}|(?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))', data)
    for m in matches[:20]: # Show first 20 date-like strings
        print(m.decode('ascii', errors='ignore'))

extract_strings(files_to_check[0])
print("\n" + "="*50 + "\n")
extract_strings(files_to_check[1])
