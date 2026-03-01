import sys
import re

def extract_wide_strings(filename, min_len=4):
    with open(filename, "rb") as f:
        data = f.read()
        # Look for sequences of printable chars separated by null bytes (common in UTF-16LE)
        # We can just try to decode the whole thing as utf-16 with errors='ignore' and split by non-printable
        
        try:
           text = data.decode('utf-16le', errors='ignore')
        except:
           return

        # Simple cleaning to find long contiguous alphanumeric runs
        clean_strings = re.findall(r'[\w\s,:/-]{5,}', text)
        
        for s in clean_strings:
            s_stripped = s.strip()
            if len(s_stripped) > 5:
                print(s_stripped)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_wide_strings.py <file>")
        sys.exit(1)
    extract_wide_strings(sys.argv[1])
