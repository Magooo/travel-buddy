
import os
import re
import string

source_dir = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs"
output_file = os.path.join(source_dir, "TRIP_DOCS_READABLE.txt")

IGNORE_HEADERS = [
    "Received:", "ARC-Seal:", "ARC-Message-Signature:", "ARC-Authentication-Results:",
    "DKIM-Signature:", "X-Google-DKIM-Signature:", "X-Gm-Message-State:", "X-Gm-Gg:",
    "X-Received:", "X-MS-Exchange-", "X-Microsoft-Antispam", "X-Forefront-Antispam",
    "Authentication-Results", "Thread-Topic:", "Thread-Index:", "Content-Type:",
    "MIME-Version:", "Resent-", "Return-Path:", "X-MDID", "X-PPE", "References:",
    "In-Reply-To:", "Message-ID:", "Description:", "Generator:", "X-Mailer:", 
    "X-Virus-Scanned:", "X-Envelope-", "X-Quarantine-ID:", "X-MS-Has-Attach",
    "X-MS-TNEF-Correlator", "Content-Transfer-Encoding", "Accept-Language", "Content-Language",
    "X-MS-PublicTrafficType", "X-MS-TrafficTypeDiagnostic", "@type", "@context", "@source",
    "BlingDetectorType", "TextLength", "LanguageScores", "BestGuessLanguage"
]

def is_garbage(line):
    if len(line.strip()) < 3: return True
    
    # 1. Reject OLE markers
    if "__substg" in line: return True
    if "Root Entry" in line: return True
    
    # 2. ASCII check
    # Count printable characters
    printable_count = sum(1 for c in line if c in string.printable)
    if printable_count / len(line) < 0.95: # Very strict: 95% must be standard printable
        return True
    
    # 3. Reject lines that look like huge base64 strings (no spaces for 50 chars)
    words = line.split()
    for w in words:
        if len(w) > 50 and not w.startswith('http'):
            return True
            
    return False

def clean_text_v4(data_bytes):
    # Try decode
    try:
        text = data_bytes.decode('utf-16le', errors='ignore')
    except: 
        return []
    
    # Fallback decode if it looks weird
    # If we decode UTF-16 on ASCII data, we get Chinese chars. 
    # Heuristic: mostly null bytes in raw -> utf16
    # If raw has no nulls -> ascii/utf8
    if data_bytes.count(b'\x00') < len(data_bytes) * 0.1:
         try:
            text = data_bytes.decode('latin-1', errors='ignore')
         except:
            pass

    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Clean nulls
        line = line.replace('\x00', '')
        
        # Headers
        is_header = False
        for h in IGNORE_HEADERS:
            if line.lstrip().startswith(h) or f'"{h}"' in line:
                is_header = True
                break
        if is_header: continue
        
        if is_garbage(line):
            continue
            
        cleaned_lines.append(line)
        
    return cleaned_lines

def main():
    success_count = 0
    with open(output_file, 'w', encoding='utf-8') as f_out:
        f_out.write("Trip Documentation Index (Strictly Cleaned)\n")
        f_out.write("==========================================\n\n")
        
        for filename in os.listdir(source_dir):
            if not filename.lower().endswith('.msg'):
                continue
                
            path = os.path.join(source_dir, filename)
            
            try:
                with open(path, 'rb') as f_in:
                    raw = f_in.read()
                    
                lines = clean_text_v4(raw)
                
                # If almost nothing survives, skip
                if len(lines) < 1:
                    continue

                f_out.write(f"DOCUMENT: {filename}\n")
                f_out.write("-" * 50 + "\n")

                prev_blank = False
                for l in lines:
                    f_out.write(l + "\n")
                
                f_out.write("\n\n" + "="*50 + "\n\n")
                success_count += 1
                
            except Exception as e:
                pass
            
    print(f"Index created for {success_count} files at: {output_file}")

if __name__ == "__main__":
    main()
