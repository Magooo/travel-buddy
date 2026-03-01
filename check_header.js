
const fs = require('fs');
const filePath = process.argv[2];

try {
    const buffer = Buffer.alloc(20);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 20, 0);
    fs.closeSync(fd);
    console.log('Hex:', buffer.toString('hex'));
    console.log('ASCII:', buffer.toString('utf8'));
} catch (err) {
    console.error(err);
}
