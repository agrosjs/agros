const fs = require('fs');
const path = require('path');
const Checksum = require('./utils/checksum');
const checksum = new Checksum(fs.readFileSync(path.resolve(__dirname, '../.gitignore')).toString());

fs.writeFileSync(
    path.resolve(__dirname, '../checksum.txt'),
    checksum.stringifyChecksum(checksum.getChecksum(path.resolve(__dirname, '..'))),
    {
        encoding: 'utf-8',
    },
);
