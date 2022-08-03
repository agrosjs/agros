import * as fs from 'fs';
import * as path from 'path';
import { permanentlyReadJson } from '@agros/utils/lib/permanently-read-json';

export const overridesFileExists = () => {
    const cwd = process.cwd();

    if (fs.existsSync(path.resolve(cwd, 'config-overrides.js'))) {
        return true;
    }

    if (permanentlyReadJson(path.resolve(cwd, 'package.json'))['config-overrides-path']) {
        return true;
    }

    return false;
};
