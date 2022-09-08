import * as path from 'path';
import * as fs from 'fs-extra';
import { cosmiconfigSync } from 'cosmiconfig';
import _ from 'lodash';
import { BundlessPlatform } from '@agros/utils/lib/types';

export class PlatformConfigParser {
    protected platformIndexFile: string;
    protected platformRootDir: string;

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
    }

    public getPlatformRootDir() {
        return this.platformRootDir;
    }

    public getPlatformWebpackConfigFactory(): Function {
        const configFactory = cosmiconfigSync('agros-platform').search(this.platformRootDir);
        if (!configFactory || typeof configFactory.config === 'function') {
            return configFactory.config;
        }
        return (config) => config;
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
            const packageJson = fs.readJsonSync(path.resolve(this.platformRootDir, 'package.json'));
            const bundlessPlatformFilePathname = _.get(packageJson, 'agrosPlatform.bundless');

            if (!bundlessPlatformFilePathname) {
                return {};
            }

            const required = require(path.resolve(this.platformRootDir, bundlessPlatformFilePathname));

            return required.default || required;
        } catch (e) {
            return {};
        }
    }
}
