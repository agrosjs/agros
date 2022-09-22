import * as path from 'path';
import * as fs from 'fs-extra';
import { cosmiconfigSync } from 'cosmiconfig';
import _ from 'lodash';
import {
    BundlessPlatform,
    PlatformConfig,
} from '../types';

export class PlatformConfigParser {
    protected platformIndexFile: string;
    protected platformRootDir: string;
    protected platformConfig: Required<PlatformConfig> = {
        files: {
            create: '',
            generate: {
                componentDescription: '',
            },
        },
        withoutComponentDescriptionFileExtension: false,
        bundlessPlatform: './lib/bundless-platform.js',
        configWebpack: (config) => config,
    };

    public constructor(protected readonly platformName: string) {
        this.platformIndexFile = require.resolve(platformName, {
            paths: [process.cwd()],
        });

        let currentDetectDir = path.dirname(this.platformIndexFile);

        while (true) {
            if (currentDetectDir === path.dirname(currentDetectDir)) {
                break;
            }

            if (fs.existsSync(path.resolve(currentDetectDir, 'package.json'))) {
                this.platformRootDir = currentDetectDir;
                break;
            }

            currentDetectDir = path.dirname(currentDetectDir);
        }

        if (!this.platformRootDir) {
            throw new Error(`Platform '${this.platformName}' is not a valid NPM package`);
        }

        const platformConfig = (cosmiconfigSync('agros-platform').search(this.platformRootDir)?.config || {}) as PlatformConfig;
        this.platformConfig = _.merge({}, _.clone(this.platformConfig), platformConfig);
        this.platformConfig.files = {
            create: path.resolve(this.platformRootDir, './files/create/**/*'),
            generate: {
                componentDescription: path.resolve(this.platformRootDir, './files/generate/component.tsx._'),
            },
        };
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.cloneDeep(this.platformConfig) as unknown as T;
        }

        return _.get(_.cloneDeep(this.platformConfig), pathname) as T;
    }

    public getPlatformRootDir() {
        return this.platformRootDir;
    }

    public getPlatformWebpackConfigFactory(): Function {
        return this.platformConfig.configWebpack;
    }

    public getPlatform<T>(): T {
        let platform = require(this.platformIndexFile);
        if (platform) {
            platform = platform.default || platform;
        }
        return platform;
    }

    public getBundlessPlatform(): BundlessPlatform {
        try {
            const bundlessPlatformPathname = path.resolve(this.platformRootDir, this.platformConfig.bundlessPlatform);

            if (!this.platformConfig.bundlessPlatform || !fs.existsSync(bundlessPlatformPathname)) {
                return {};
            }

            const required = require(bundlessPlatformPathname);

            return required.default || required;
        } catch (e) {
            return {};
        }
    }
}
