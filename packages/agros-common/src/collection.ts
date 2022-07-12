import { ProjectConfigParser } from '@agros/config';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from './normalizers';
import { scanProjectEntities } from './scanners';

export abstract class AbstractCollection {
    protected readonly projectConfig = new ProjectConfigParser();
    protected readonly srcPath = normalizeSrcPath();
    protected readonly modulesPath = normalizeModulesPath();
    protected entities = scanProjectEntities();

    protected updateEntities() {
        this.entities = scanProjectEntities();
    }

    protected writeTemplateFile(sourcePath: string, targetRelativePath: string) {}

    public abstract run<T = any>(props: T): void;
}
