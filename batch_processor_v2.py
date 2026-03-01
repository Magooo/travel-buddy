
import os
import sys
import re

source_dir = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs"
output_file = os.path.join(source_dir, "TRIP_SUMMARY.txt")

def extract_wide_strings(data):
    # strings are often UTF-16LE in MSG
    try:
        # Decode as utf-16, ignore errors
        text = data.decode('utf-16le', errors='ignore')
    except:
        return []
    
    # We look for lines that look like text.
    # A bit stricter: 
    # - At least 2 words
    # - No high density of weird symbols
    found = []
    
    # We can't strict regex on the whole chunk because of noise.
    # Let's simple split by nulls or other control chars if we were parsing raw,
    # but since we decoded, we just search.
    
    # Look for patterns that look like sentences or headers.
    # e.g. "Booking Reference: 12345"
    matches = re.findall(r'([a-zA-Z0-9][a-zA-Z0-9\s\.,:;\-@\(\)/]{10,})', text)
    return matches

def process_file(filepath):
    print(f"Processing {filepath}...")
    filename = os.path.basename(filepath)
    extracted_text = []

    try:
        with open(filepath, 'rb') as f:
            data = f.read()

        # 1. Identify and REMOVE PDF blob to avoid garbage
        start_marker = b'%PDF-'
        end_marker = b'%%EOF'
        
        pdf_start = data.find(start_marker)
        if pdf_start != -1:
            pdf_end = data.rfind(end_marker)
            if pdf_end != -1:
                pdf_end += len(end_marker)
                # Remove the PDF chunk from analysis
                data_no_pdf = data[:pdf_start] + data[pdf_end:]
                extracted_text.append("[Found and excluded embedded PDF attachment]")
            else:
                data_no_pdf = data 
        else:
            data_no_pdf = data

        # 2. Extract strings from the non-PDF part (Email Body)
        # Try Latin1 first for headers
        ascii_matches = re.findall(b'[\x20-\x7E]{10,}', data_no_pdf)
        # extracted_text.extend([m.decode('ascii') for m in ascii_matches])
        
        # Try UTF-16 for body
        clean_strings = extract_wide_strings(data_no_pdf)
        
        # Filtering for quality
        good_lines = []
        for s in clean_strings:
            s = s.strip()
            # Heuristic: mostly letters?
            if len(s) > 1000: continue # garbage dump
            if len(s) < 5: continue
            
            # Reduce noise 
            if "________________" in s: continue
            
            good_lines.append(s)

        # De-duplicate adjacent
        if good_lines:
            extracted_text.extend(good_lines)

    except Exception as e:
        extracted_text.append(f"Error: {str(e)}")

    return extracted_text

def main():
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("TRIP DOCS SUMMARY (CLEANED)\n")
        outfile.write("===========================\n\n")

        for filename in os.listdir(source_dir):
            if filename.lower().endswith('.msg') or filename.lower().endswith('.eml'):
                # Skip the previous huge output if it exists in the same dir? 
                # No, we overwrite output_file, but listdir might see it if strict.
                # output_file is .txt, we filter for .msg/.eml
                
                filepath = os.path.join(source_dir, filename)
                outfile.write(f"FILE: {filename}\n")
                outfile.write("-" * 40 + "\n")
                
                lines = process_file(filepath)
                
                unique_lines = list(set(lines)) # simple dedup
                # sort to keep order? set destroys order.
                # let's keep order
                seen = set()
                deduped = []
                for x in lines:
                    if x not in seen:
                        deduped.append(x)
                        seen.add(x)

                for line in deduped:
                    outfile.write(line + "\n")
                
                outfile.write("\n\n" + "="*40 + "\n\n")

    print(f"Done. Summary written to {output_file}")

if __name__ == "__main__":
    main()
