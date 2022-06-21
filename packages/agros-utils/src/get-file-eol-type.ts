import * as path from 'path';
import * as fs from 'fs-extra';

export type EOLType = 'CRLF' | 'CR' | 'LF' | 'NONE';

export const getFileEOLType = (pathname: string): EOLType => {
    if (!fs.existsSync(path.resolve(pathname))) {
        return 'NONE';
    }

    if (!fs.statSync(path.resolve(pathname)).isFile()) {
        return 'NONE';
    }

    try {
        const content = fs.readFileSync(path.resolve(pathname)).toString();
        const crCount = content.split('\r').length;
        const lfCount = content.split('\n').length;
        const crlfCount = content.split('\r\n').length;

        if (crCount + lfCount === 0) {
            return 'NONE';
        }

        if (crlfCount === crCount && crlfCount === lfCount) {
            return 'CRLF';
        }

        if (crCount > lfCount) {
            return 'CR';
        } else {
            return 'LF';
        }
    } catch (e) {
        return 'NONE';
    }
};
