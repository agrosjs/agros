const md5 = require('md5-file');
const fs = require('fs');
const path = require('path');

const getChecksum = (startPath) => {
    let result = [];
    if (!/(\/?)node_modules|(\/?)lib|(\/?)\.git(\/)|(\/?)\.umi(\/)|(\/?)\.idea(\/)|(\/?)\.vscode(\/)|(\/?)lib(\/)/.test(startPath)) {
        console.log(`Checking: ${startPath}`);
        const currentStartPath = path.resolve(__dirname, '..', startPath);
        const stat = fs.statSync(currentStartPath);
        if (stat.isFile()) {
            result.push(
                `${path.relative(path.resolve(__dirname, '..'), startPath)} ${md5.sync(
                    currentStartPath,
                )}`,
            );
        } else if (stat.isDirectory()) {
            const entities = fs.readdirSync(currentStartPath);
            entities.forEach((entity) => {
                result = result.concat(getChecksum(`${startPath}/${entity}`));
            });
        }
    }
    return result;
};

fs.writeFileSync(
    path.resolve(__dirname, '../checksum.txt'),
    getChecksum('.').join('\n'),
    {
        encoding: 'utf-8',
    },
);
