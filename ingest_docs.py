
import os
import json
import re
import email
from email import policy
from email.parser import BytesParser
import glob
from datetime import datetime

# Try to import pypdf
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

# Try to import extract_msg (the library, not the local file)
try:
    import extract_msg
except ImportError:
    extract_msg = None

SOURCE_DIR = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs"
OUTPUT_FILE = "extracted_docs.json"

def clean_text(text):
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_from_pdf(filepath):
    text_content = []
    try:
        if PdfReader:
            reader = PdfReader(filepath)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(clean_text(text))
        else:
            text_content.append("[Error: pypdf not installed]")
    except Exception as e:
        text_content.append(f"[Error reading PDF: {str(e)}]")
    return "\n".join(text_content)

def extract_from_msg(filepath):
    text_content = []
    attachments = []
    
    try:
        # Check if it's a real OLE msg file or EML
        with open(filepath, 'rb') as f:
            header = f.read(8)
        
        is_ole = header.startswith(b'\xd0\xcf\x11\xe0')
        
        if is_ole and extract_msg:
            msg = extract_msg.Message(filepath)
            if msg.body:
                text_content.append(clean_text(msg.body))
            # Handle attachments if needed (complexity: high, skipping for now)
            msg.close()
        else:
            # Treat as EML
            with open(filepath, 'rb') as f:
                msg = BytesParser(policy=policy.default).parse(f)
            
            body = msg.get_body(preferencelist=('plain', 'html'))
            if body:
                try:
                    text_content.append(clean_text(body.get_content()))
                except:
                    text_content.append("[Error decoding EML body]")
            
            # Extract attachments from EML
            for part in msg.iter_attachments():
                filename = part.get_filename()
                if filename and filename.lower().endswith('.pdf'):
                    # We could save and parse, but for now just note it
                    text_content.append(f"[Attached PDF: {filename}]")
                    
    except Exception as e:
        text_content.append(f"[Error processing MSG/EML: {str(e)}]")
        
    return "\n".join(text_content)

def main():
    docs = []
    
    files = glob.glob(os.path.join(SOURCE_DIR, "*.*"))
    print(f"Found {len(files)} files in {SOURCE_DIR}")
    
    for filepath in files:
        filename = os.path.basename(filepath)
        ext = os.path.splitext(filename)[1].lower()
        
        print(f"Processing {filename}...")
        
        content = ""
        doc_type = "unknown"
        
        if ext == '.pdf':
            content = extract_from_pdf(filepath)
            doc_type = 'pdf'
        elif ext in ['.msg', '.eml']:
            content = extract_from_msg(filepath)
            doc_type = 'email'
        elif ext == '.txt':
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = clean_text(f.read())
                doc_type = 'text'
            except:
                pass
        
        if content:
            docs.append({
                "filename": filename,
                "type": doc_type,
                "content": content,
                "processed_at": datetime.now().isoformat()
            })
            
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2)
        
    print(f"Successfully extracted text from {len(docs)} documents to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
