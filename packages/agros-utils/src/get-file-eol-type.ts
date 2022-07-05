import * as path from 'path';
import * as fs from 'fs-extra';

export type EOLType = 'CRLF' | 'CR' | 'LF';

export const getFileEOLType = (pathname: string): EOLType | null => {
    if (!fs.existsSync(path.resolve(pathname))) {
        return null;
    }

    if (!fs.statSync(path.resolve(pathname)).isFile()) {
        return null;
    }

    try {
        const content = fs.readFileSync(path.resolve(pathname)).toString();
        const crCount = content.split('\r').length;
        const lfCount = content.split('\n').length;
        const crlfCount = content.split('\r\n').length;

        if (crCount + lfCount === 0) {
            return 'LF';
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
        return 'LF';
    }
};
