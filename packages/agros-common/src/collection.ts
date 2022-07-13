import { ProjectConfigParser } from '@agros/config';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from './normalizers';
import { scanProjectEntities } from './scanners';
import * as path from 'path';
import * as fs from 'fs-extra';
import ejs from 'ejs';

export interface Collection {
    name: string;
    schema: Record<string, any>;
    FactoryClass: new (...args: any[]) => AbstractCollection;
}

export interface CollectionGenerateResult {
    update: string[];
    create: string[];
}

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

    protected writeFile(pathname: string, content: string) {
        const targetDirname = path.dirname(pathname);

        if (!fs.existsSync(targetDirname)) {
            fs.mkdirpSync(targetDirname);
        }

        fs.writeFileSync(pathname, content, {
            encoding: 'utf-8',
        });
    }

    protected writeTemplateFile(source: string, target: string, props: Record<string, any> = {}) {
        this.writeFile(
            target,
            ejs.render(fs.readFileSync(source).toString(), props),
        );
    }

    public abstract generate(props): Promise<CollectionGenerateResult>;
}
