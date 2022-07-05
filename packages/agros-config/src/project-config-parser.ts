import _ from 'lodash';
import * as path from 'path';
import { requireModule } from '@agros/utils';
import { PackageConfigParser } from './package-config-parser';
import { Configuration } from 'webpack';
import { Options as PrettierOptions } from 'prettier';
import { getCosmiConfig } from './utils';
import deepmerge from 'deepmerge';

export type ScopeMap = Record<string, string>;
export type AliasMap = Record<string, string>;
export type CollectionMap = Record<string, string[]>;
export type CollectionType = 'module' | 'service' | 'component';

export interface ProjectConfig {
    npmClient?: string;
    prettier?: PrettierOptions;
    alias?: AliasMap;
    entry?: string;
    baseDir?: string;
    collection?: CollectionMap;
    modulesDir?: string;
    builder?: Function[];
    devServer?: (config: Configuration) => Configuration;
}

export class ProjectConfigParser {
    private defaultProjectConfig: ProjectConfig = {
        npmClient: 'npm',
        prettier: {
            tabWidth: 4,
            singleQuote: true,
        },
        alias: {
            '@/*': '*',
            '@modules/*': 'modules/*',
        },
        entry: 'index.ts',
        baseDir: 'src',
        modulesDir: 'modules',
        collection: {
            module: ['*.module.ts', '*.module.tsx'],
            service: ['*.service.ts'],
            component: ['*.component.ts', '*.component.tsx'],
        },
        builder: [],
        devServer: (config) => config,
    };
    private projectConfig: ProjectConfig = _.clone(this.defaultProjectConfig);
    private PROCESS_CWD = process.cwd();
    private packageConfigParser = new PackageConfigParser();

    public constructor() {
        try {
            const userProjectConfigPath = path.resolve(
                this.PROCESS_CWD,
                this.packageConfigParser.getConfig('configPath'),
            );
            const userProjectConfig = requireModule(userProjectConfigPath) || {};
            this.projectConfig = _.merge({}, this.projectConfig, userProjectConfig);
        } catch (e) {}

        /**
         * validate `alias`
         */
        const alias = _.get(this.projectConfig, 'alias') || {};

        for (const aliasKey of Object.keys(alias)) {
            if (
                typeof aliasKey !== 'string' ||
                    aliasKey.indexOf('*') !== aliasKey.length - 1 ||
                    !aliasKey.endsWith('/*')
            ) {
                throw new Error(`Alias key '${aliasKey}' is in a wrong type`);
            }
            const aliasValue = alias[aliasKey];
            if (
                typeof aliasValue !== 'string' ||
                    aliasValue.indexOf('*') !== aliasValue.length - 1 ||
                    !aliasValue.endsWith('*')
            ) {
                throw new Error(`Alias value '${aliasValue}' is in wrong type`);
            }
        }

        try {
            const prettierConfig = getCosmiConfig('prettier');
            this.projectConfig.prettier = deepmerge(this.projectConfig.prettier, prettierConfig);
        } catch (e) {}

        /**
         * validate webpack and dev-server config
         */
        const builderConfigArray = this.getConfig<Function[]>('builder') || [];
        if (!Array.isArray(builderConfigArray) || builderConfigArray.some((item) => typeof item !== 'function')) {
            throw new Error('`builder` must be a array of functions');
        }

        if (typeof this.getConfig<Function>('devServer') !== 'function') {
            throw new Error('`devServer` must be a function');
        }
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.clone(this.projectConfig) as T;
        }

        return _.get(_.clone(this.projectConfig), pathname) as T;
    }

    public getEntry(): string {
        const baseDir = this.getConfig<string>('baseDir');
        const entry = this.getConfig<string>('entry');
        return `./${baseDir}/${entry.split('.').slice(0, -1).join('.')}`;
    }

    public getAlias(): Record<string, string> {
        const baseDir = this.getConfig<string>('baseDir');
        const alias = this.getConfig<Record<string, string>>('alias') || {};
        return Object.keys(alias).reduce((result, key) => {
            const aliasKey = key.replace(/(\/?)\*$/, '');
            const aliasValue = key.replace(/(\/?)\*$/, '');
            result[aliasKey] = [baseDir, aliasValue].filter((value) => !!value).join('/');
            return result;
        }, {});
    }
}
