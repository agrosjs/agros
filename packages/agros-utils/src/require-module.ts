import * as fs from 'fs';
import { requireFromString } from './require-from-string';

export const requireModule = (filename: string) => {
    return requireFromString(
        fs.readFileSync(filename).toString(),
        filename,
    );
};
