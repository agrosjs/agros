import _ from 'lodash';
import { cosmiconfigSync } from 'cosmiconfig';
import * as path from 'path';
import { Configuration } from 'webpack';
import { PlatformConfigParser } from './platform-config-parser';
import { CollectionMap } from '../types';

export type ScopeMap = Record<string, string>;
export type AliasMap = Record<string, string>;

export interface ProjectConfig {
    platform?: string;
    useCollection?: string;
    npmClient?: string;
    alias?: AliasMap;
    entry?: string;
    baseDir?: string;
    collection?: CollectionMap;
    modulesDir?: string;
    configWebpack?: (config: Configuration) => Configuration;
    configWebpackDevServer?: (devServerConfig: Record<string, any>) => Record<string, any>;
}

export class ProjectConfigParser {
    private defaultProjectConfig: ProjectConfig = {
        platform: '@agros/platform-react',
        useCollection: '@agros/app/lib/collections',
        npmClient: 'npm',
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
            interceptor: ['*.interceptor.ts'],
        },
        configWebpack: (config) => config,
        configWebpackDevServer: (config) => config,
    };
    private projectConfig: ProjectConfig = _.clone(this.defaultProjectConfig);

    public constructor() {
        try {
            const userProjectConfig = cosmiconfigSync('agros').search()?.config || {};
            this.projectConfig = _.merge({}, this.projectConfig, userProjectConfig);
            // TODO allow switching collection
            this.projectConfig.useCollection = '@agros/app/lib/collections';
            const platform = new PlatformConfigParser(this.projectConfig.platform).getPlatform<any>();
            this.projectConfig = _.set(
                _.cloneDeep(this.projectConfig),
                `platformConfig['${this.projectConfig.platform}']`,
                typeof platform.getDefaultConfig === 'function'
                    ? platform.getDefaultConfig() || {}
                    : {},
            );
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
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.cloneDeep(this.projectConfig) as T;
        }

        return _.get(_.cloneDeep(this.projectConfig), pathname) as T;
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
            const aliasValue = alias[key].replace(/(\/?)\*$/, '');
            result[aliasKey] = path.join(
                path.resolve(process.cwd()),
                baseDir,
                aliasValue || '',
            );
            return result;
        }, {});
    }
}
