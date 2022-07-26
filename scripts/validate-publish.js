const fs = require('fs');
const path = require('path');
const Checksum = require('./utils/checksum');
const checksum = new Checksum(fs.readFileSync(path.resolve(__dirname, '../.gitignore')).toString());

const diff = checksum.diffChecksum(
    fs.readFileSync(path.resolve(__dirname, '../checksum.txt').toString()),
    checksum.stringifyChecksum(checksum.getChecksum(path.resolve(__dirname, '..'))),
);

if (diff.length > 0) {
    console.log('Diff changed');
    console.log(diff.map((diffItem) => diffItem.pathname) + '\n');
    process.exit(1);
}
