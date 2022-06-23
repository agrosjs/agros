import _ from 'lodash';
import * as path from 'path';
import { permanentlyReadJson } from '@agros/utils';
import { PackageConfigParser } from './package-config-parser';

export type ScopeMap = Record<string, string>;
export type AliasMap = Record<string, string>;
export type RootPointMap = Record<string, string>;
export type CollectionMap = Record<string, string[]>;
export type CollectionType = 'module' | 'service' | 'component';

export interface ProjectConfig {
    npmClient?: string;
    indentSize?: number;
    alias?: AliasMap;
    scopes?: ScopeMap;
    defaultScope?: string;
    rootPoints?: RootPointMap;
    entry?: string;
    baseDir?: string;
    collection?: CollectionMap;
}

export class ProjectConfigParser {
    private defaultProjectConfig: ProjectConfig = {
        npmClient: 'npm',
        indentSize: 4,
        scopes: {
            'main': 'modules/**/*',
        },
        defaultScope: 'main',
        alias: {
            '@/*': '*',
            '@modules/*': 'modules/*',
        },
        rootPoints: {
            app: 'app.module',
        },
        entry: 'index.ts',
        baseDir: 'src',
        collection: {
            module: ['*.module.ts'],
            service: ['*.service.ts'],
            component: ['*.component.ts'],
        },
    };
    private projectConfig: ProjectConfig = _.clone(this.defaultProjectConfig);
    private PROCESS_CWD = process.cwd();
    private packageConfigParser = new PackageConfigParser();

    public constructor() {
        try {
            const userProjectConfig = permanentlyReadJson(path.resolve(
                this.PROCESS_CWD,
                this.packageConfigParser.getConfig('configPath') || 'agros.json',
            ));
            this.projectConfig = _.merge(this.projectConfig, userProjectConfig);
        } catch (e) {}
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.clone(this.projectConfig) as T;
        }

        return _.get(_.clone(this.projectConfig), pathname) as T;
    };
}
