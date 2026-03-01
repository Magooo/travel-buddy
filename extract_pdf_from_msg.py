
import sys

def extract_pdf_from_msg(msg_file, output_pdf):
    with open(msg_file, 'rb') as f:
        data = f.read()
    
    start_marker = b'%PDF-'
    end_marker = b'%%EOF'
    
    start_idx = data.find(start_marker)
    if start_idx == -1:
        print("No PDF start marker found.")
        return

    # Find the LAST EOF to get the whole PDF structure (since there might be incremental updates)
    end_idx = data.rfind(end_marker)
    if end_idx == -1:
        print("No PDF end marker found.")
        return
    
    # Include the marker length
    end_idx += len(end_marker)

    pdf_data = data[start_idx:end_idx]
    
    with open(output_pdf, 'wb') as f_out:
        f_out.write(pdf_data)
        
    print(f"Extracted {len(pdf_data)} bytes to {output_pdf}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf_from_msg.py <msg_file> <output_pdf>")
    else:
        extract_pdf_from_msg(sys.argv[1], sys.argv[2])
