import { ProjectConfigParser } from '@agros/config';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from './normalizers';
import { scanProjectEntities } from './scanners';
import * as path from 'path';
import * as fs from 'fs-extra';
import ejs from 'ejs';

export abstract class AbstractCollection {
    protected readonly projectConfig = new ProjectConfigParser();
    protected entities = scanProjectEntities();

    protected updateEntities() {
        this.entities = scanProjectEntities();
    }

    protected projectPath(pathname?: string) {
        if (!pathname) {
            return process.cwd();
        }

        return path.resolve(process.cwd(), pathname);
    }

    protected srcPath(pathname?: string) {
        if (!pathname) {
            return normalizeSrcPath();
        }

        return path.resolve(normalizeSrcPath(), pathname);
    }

    protected modulesPath(pathname?: string) {
        if (!pathname) {
            return normalizeModulesPath();
        }

        return path.resolve(normalizeModulesPath(), pathname);
    }

    protected writeTemplateFile(source: string, target: string, props: Record<string, any> = {}) {
        const targetDirname = path.dirname(target);
        if (!fs.existsSync(targetDirname)) {
            fs.mkdirpSync(targetDirname);
        }
        fs.writeFileSync(
            target,
            ejs.render(fs.readFileSync(source).toString(), props),
            {
                encoding: 'utf-8',
            },
        );
    }

    public abstract generate(props): Promise<void>;
}
