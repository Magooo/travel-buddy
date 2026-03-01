
import re

filename = r"c:\Users\jason.m.chgv\Documents\travel buddy\email recipts of travel docs\TRIP_DOCS_READABLE.txt"

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

search_terms = ["Judy", "Bob ", "Robert"] # Space after Bob to avoid substrings if any

results = []
for i, line in enumerate(lines):
    for term in search_terms:
        if term.lower() in line.lower():
            # Exclude obvious Jason Robert
            if "jason" in line.lower() and "robert" in line.lower():
                continue
                
            context = lines[max(0, i-5):min(len(lines), i+15)]
            results.append(f"MATCH: {term} at line {i+1}\n" + "".join(context) + "\n" + "-"*40 + "\n")

with open("traveler_context.txt", "w", encoding='utf-8') as f_out:
    f_out.writelines(results)
    
print("Context saved to traveler_context.txt")
