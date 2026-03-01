import sys
import re

def extract_strings(filename, min_len=4):
    with open(filename, "rb") as f:
        data = f.read()
        # Find only printable ASCII chars
        result = ""
        for byte in data:
            if 32 <= byte <= 126:
                result += chr(byte)
            else:
                if len(result) >= min_len:
                    print(result)
                result = ""
        if len(result) >= min_len:
            print(result)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_msg.py <file>")
        sys.exit(1)
    extract_strings(sys.argv[1])
