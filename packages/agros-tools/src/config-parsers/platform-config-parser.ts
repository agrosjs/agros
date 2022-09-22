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
    protected platformIndexDir: string;
    protected platformPackageDir: string;
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
    protected platformConfigFile: string;

    public constructor(protected readonly platformName: string) {
        try {
            this.platformIndexFile = require.resolve(platformName, {
                paths: [process.cwd()],
            });
            this.platformIndexDir = path.dirname(this.platformIndexFile);
            let currentDetectDir = path.dirname(this.platformIndexFile);

            while (true) {
                if (currentDetectDir === path.dirname(currentDetectDir)) {
                    break;
                }

                if (fs.existsSync(path.resolve(currentDetectDir, 'package.json'))) {
                    this.platformPackageDir = currentDetectDir;
                    break;
                }

                currentDetectDir = path.dirname(currentDetectDir);
            }

            const platformCosmiconfig = cosmiconfigSync('agros-platform').search(
                this.platformPackageDir || this.platformIndexDir,
            );
            const platformConfig = (platformCosmiconfig?.config || {}) as PlatformConfig;
            this.platformConfigFile = platformCosmiconfig.filepath;
            this.platformConfig = _.merge({}, _.clone(this.platformConfig), platformConfig);
            const configFileDirname = path.dirname(this.platformConfigFile);
            this.platformConfig.files = {
                create: path.resolve(configFileDirname, './files/create/**/*'),
                generate: {
                    componentDescription: path.resolve(configFileDirname, './files/generate/component.tsx._'),
                },
            };
        } catch (e) {}
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.cloneDeep(this.platformConfig) as unknown as T;
        }

        return _.get(_.cloneDeep(this.platformConfig), pathname) as T;
    }

    public getPlatformPackageDir() {
        return this.platformPackageDir;
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
            const bundlessPlatformPathname = path.resolve(
                path.dirname(this.platformConfigFile),
                this.platformConfig.bundlessPlatform,
            );

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
