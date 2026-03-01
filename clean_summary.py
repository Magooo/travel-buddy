
import re

input_path = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs\TRIP_SUMMARY.txt"
output_path = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs\CLEAN_SUMMARY.txt"

try:
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Filter for lines that look like real text
    # 1. Remove lines that are super long strings of garbage (often base64 or binary dumps)
    # 2. Keep lines that have spaces (sentences)
    
    clean_lines = []
    for line in content.split('\n'):
        line = line.strip()
        if not line: continue
        
        # Heuristic: mostly alphanumeric, has spaces, reasonable length
        # Or typical headers
        if line.startswith("FILE:") or line.startswith("---"):
            clean_lines.append(line)
            continue

        # If it has too many weird chars, skip
        if len(line) > 100 and ' ' not in line: # generic long binary string
            continue
            
        # Must have at least some letters
        if not re.search('[a-zA-Z]', line):
            continue

        clean_lines.append(line)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(clean_lines))
        
    print("Cleaned summary written.")

except Exception as e:
    print(e)
