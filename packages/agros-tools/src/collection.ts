import {
    PlatformConfigParser,
    ProjectConfigParser,
} from './config-parsers';
import {
    normalizeModulesPath,
    normalizeNoExtensionPath,
    normalizeRelativePath,
    normalizeSrcPath,
} from './normalizers';
import { scanProjectEntities } from './scanner';
import * as path from 'path';
import * as fs from 'fs-extra';
import ejs from 'ejs';
import {
    lintCode,
    LinterOptions,
} from './linters';
import { isBinaryFileSync } from 'isbinaryfile';
import { checkEntities } from './check-entities';
import { EntityDescriptor } from './types';

export interface Collection<T extends AbstractBaseFactory = AbstractBaseFactory> {
    name: string;
    schema: Record<string, any>;
    FactoryClass: new (...args: any[]) => T;
}

export interface CollectionFactoryResult {
    update: string[];
    create: string[];
}

export interface CollectionWriteFileOptions {
    lint?: boolean;
    lintOptions?: LinterOptions;
}

export class AbstractBaseFactory {
    protected readonly projectConfig = new ProjectConfigParser();
    protected readonly platformConfig = new PlatformConfigParser(
        this.projectConfig.getConfig<string>('platform'),
    );
    protected entities: EntityDescriptor[] = [];

    public constructor() {
        this.entities = scanProjectEntities();
        checkEntities(this.entities);
    }

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
            lint = false,
            lintOptions,
        } = options;
        const targetDirname = path.dirname(pathname);

        if (!fs.existsSync(targetDirname)) {
            fs.mkdirpSync(targetDirname);
        }

        const fileContent = lint
            ? await lintCode(content, lintOptions)
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
        const buffer = fs.readFileSync(source);

        if (isBinaryFileSync(buffer)) {
            this.writeBinaryFile(target, buffer);
        } else {
            await this.writeFile(
                target,
                ejs.render(buffer.toString(), props),
                {
                    lint: true,
                    ...options,
                },
            );
        }
    }

    protected getEntityDescriptor(pathname: string) {
        const absolutePath = path.resolve(process.cwd(), pathname);
        const id = normalizeNoExtensionPath(normalizeRelativePath(absolutePath));
        const entityDescriptor = this.entities.find((entity) => {
            return entity.id === id || entity.absolutePath === absolutePath;
        });
        return entityDescriptor;
    }

    private writeBinaryFile(pathname: string, buffer: Buffer) {
        if (!pathname || !buffer) {
            return;
        }

        const targetDirname = path.dirname(pathname);

        if (!fs.existsSync(targetDirname)) {
            fs.mkdirpSync(targetDirname);
        }

        fs.writeFileSync(pathname, buffer);
    }
}

export interface UpdateBaseOptions {
    source: string;
    target: string;
}

export abstract class AbstractGeneratorFactory extends AbstractBaseFactory {
    public abstract generate(props): Promise<CollectionFactoryResult>;
}

export abstract class AbstractUpdaterFactory extends AbstractBaseFactory {
    public abstract add(props): Promise<CollectionFactoryResult>;
    public abstract delete(props): Promise<CollectionFactoryResult>;
}
