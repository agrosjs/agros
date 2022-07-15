import { ProjectConfigParser } from '@agros/config';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from './normalizers';
import { scanProjectEntities } from './scanners';
import * as path from 'path';
import * as fs from 'fs-extra';
import ejs from 'ejs';
import {
    lintCode,
    LinterPlugin,
} from './linters';

export interface Collection {
    name: string;
    schema: Record<string, any>;
    FactoryClass: new (...args: any[]) => AbstractCollection;
}

export interface CollectionGenerateResult {
    update: string[];
    create: string[];
}

export interface CollectionWriteFileOptions {
    lint?: boolean;
    lintPrePlugins?: LinterPlugin[];
    lintPostPlugins?: LinterPlugin[];
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

    protected async writeFile(pathname: string, content: string, options: CollectionWriteFileOptions = {}) {
        if (!pathname || !content) {
            return;
        }

        const {
            lint = true,
            lintPrePlugins = [],
            lintPostPlugins = [],
        } = options;
        const targetDirname = path.dirname(pathname);

        if (!fs.existsSync(targetDirname)) {
            fs.mkdirpSync(targetDirname);
        }

        const fileContent = lint
            ? await lintCode(content, lintPrePlugins, lintPostPlugins)
            : content;

        fs.writeFileSync(pathname, fileContent, {
            encoding: 'utf-8',
        });
    }

    protected async writeTemplateFile(
        source: string,
        target: string,
        props: Record<string, any> = {},
        options: CollectionWriteFileOptions = {},
    ) {
        await this.writeFile(
            target,
            ejs.render(fs.readFileSync(source).toString(), props),
            options,
        );
    }

    public abstract generate(props): Promise<CollectionGenerateResult>;
}
