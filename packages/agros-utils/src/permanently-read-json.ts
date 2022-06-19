import * as fs from 'fs-extra';
import * as path from 'path';

export const permanentlyReadJson = (pathname?: string) => {
    if (!pathname) {
        return {};
    }

    try {
        fs.readJsonSync(path.resolve(process.cwd(), pathname));
    } catch (e) {}
};
