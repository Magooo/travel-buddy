
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node extract_strings.js <file_path>');
    process.exit(1);
}

try {
    const data = fs.readFileSync(filePath);
    let currentString = '';
    const strings = [];

    for (let i = 0; i < data.length; i++) {
        const charCode = data[i];
        // Check for printable ASCII (32-126) or some common text formatting
        if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
            currentString += String.fromCharCode(charCode);
        } else {
            if (currentString.length > 4) { // Only keep strings longer than 4 chars
                strings.push(currentString);
            }
            currentString = '';
        }
    }
    if (currentString.length > 4) {
        strings.push(currentString);
    }

    console.log(strings.join('\n'));

} catch (err) {
    console.error('Error reading file:', err);
}
