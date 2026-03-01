
import os
import sys
import re

# Import existing helpers (assuming they are in the same dir)
# We will just inline the logic to make this script standalone and robust

source_dir = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs"
output_file = os.path.join(source_dir, "TRIP_SUMMARY.txt")

def extract_wide_strings(data):
    try:
        text = data.decode('utf-16le', errors='ignore')
    except:
        return []
    # Find sequence of alphanumeric chars
    return re.findall(r'[\w\s,:/\.\-@]{5,}', text)

def extract_ascii_strings(data):
    try:
        text = data.decode('latin-1', errors='ignore')
    except:
        return []
    return re.findall(r'[\w\s,:/\.\-@]{5,}', text)

def process_file(filepath):
    print(f"Processing {filepath}...")
    ext = os.path.splitext(filepath)[1].lower()
    
    extracted_text = []

    try:
        with open(filepath, 'rb') as f:
            data = f.read()

        # 1. Try to find embedded PDF
        start_marker = b'%PDF-'
        end_marker = b'%%EOF'
        start_idx = data.find(start_marker)
        
        if start_idx != -1:
            end_idx = data.rfind(end_marker)
            if end_idx != -1:
                pdf_data = data[start_idx:end_idx + len(end_marker)]
                pdf_strings = extract_ascii_strings(pdf_data)
                extracted_text.append(f"--- FOUD EMBEDDED PDF ---")
                extracted_text.extend(pdf_strings)
        
        # 2. Also extract direct strings (for mail body)
        msg_strings = extract_wide_strings(data)
        if len(msg_strings) > 0:
             extracted_text.append(f"--- MSG BODY TEXT (Approximation) ---")
             # Filter a bit to reduce garbage
             clean_msg = [s.strip() for s in msg_strings if len(s.strip()) > 10]
             extracted_text.extend(clean_msg)

    except Exception as e:
        return [f"Error processing file: {str(e)}"]

    return extracted_text

def main():
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("TRIP DOCS SUMMARY\n")
        outfile.write("=================\n\n")

        for filename in os.listdir(source_dir):
            if filename.lower().endswith('.msg') or filename.lower().endswith('.eml'):
                filepath = os.path.join(source_dir, filename)
                outfile.write(f"FILE: {filename}\n")
                outfile.write("-" * 40 + "\n")
                
                lines = process_file(filepath)
                
                # Write lines but limit excessive output
                for line in lines:
                    outfile.write(line + "\n")
                
                outfile.write("\n\n" + "="*40 + "\n\n")

    print(f"Done. Summary written to {output_file}")

if __name__ == "__main__":
    main()
