import * as fs from 'fs';
import * as path from 'path';
import { requireFromString } from './require-from-string';

export const requireModule = (filename: string) => {
    const result = requireFromString(
        fs.readFileSync(filename).toString(),
        filename,
        {
            prependPaths: [path.dirname(filename)],
        },
    );
    return result;
};
