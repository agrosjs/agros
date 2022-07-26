/* eslint-disable @typescript-eslint/explicit-member-accessibility */
const md5 = require('md5-file');
const fs = require('fs');
const path = require('path');

class Checksum {
    constructor(gitIgnoreContent) {
        this.gitIgnoreParser = require('gitignore-parser').compile(gitIgnoreContent + '\n.git');
    }

    getChecksum(startPath, onCheck = () => {}) {
        let result = [];
        const relativePath = path.relative(path.resolve(__dirname, '../..'), startPath);

        if (this.gitIgnoreParser.accepts(relativePath)) {
            onCheck(startPath);
            const stat = fs.statSync(startPath);
            if (stat.isFile()) {
                result.push([
                    relativePath,
                    md5.sync(startPath),
                ]);
            } else if (stat.isDirectory()) {
                const entities = fs.readdirSync(startPath);
                entities.forEach((entity) => {
                    result = result.concat(this.getChecksum(path.resolve(startPath, entity)));
                });
            }
        }

        return result;
    }

    parseChecksum(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const lines = content.split(/\r|\n|\r\n/g).filter((line) => !!line);

        return lines.map((line) => {
            const [relativePath, md5] = line.split(/\s+/g);
            return [relativePath, md5];
        });
    }

    stringifyChecksum(checksumList) {
        if (!checksumList && !Array.isArray(checksumList)) {
            return '';
        }

        return checksumList.map((listItem) => {
            const [relativePath, md5] = listItem;
            return `${relativePath} ${md5}`;
        }).join('\n');
    }

    diffChecksum(previousContent, currentContent) {
        if (!previousContent || !currentContent) {
            return [];
        }

        const squareListToMap = (list) => {
            return list.reduce((result, item) => {
                const [key, value] = item;
                result[key] = value;
                return result;
            }, {});
        };

        const previousChecksumMap = squareListToMap(this.parseChecksum(previousContent));
        const currentChecksumMap = squareListToMap(this.parseChecksum(currentContent));
        const result = [];

        for (const relativePath of Object.keys(currentChecksumMap)) {
            const previousChecksum = previousChecksumMap[relativePath] || null;
            const currentChecksum = currentChecksumMap[relativePath];
            if (currentChecksum !== previousChecksum) {
                result.push({
                    pathname: relativePath,
                    previous: previousChecksum,
                    current: currentChecksum,
                });
            }
        }

        return result;
    }
}

module.exports = Checksum;
