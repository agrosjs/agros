import * as path from 'path';
import * as fs from 'fs-extra';
import { Configuration } from 'webpack';
import { cosmiconfigSync } from 'cosmiconfig';
import { ProjectConfigParser } from './project-config-parser';

export class PlatformConfigParser {
    protected projectConfigParser: ProjectConfigParser;
    protected platformName: string;
    protected platformDir = '';

    public constructor() {
        this.projectConfigParser = new ProjectConfigParser();
        this.platformName = this.projectConfigParser.getConfig<string>('platform');
        const platformIndexPath = require.resolve(this.platformName, {
            paths: [process.cwd()].concat(module.paths),
        });
        const platformIndexPathSegments = path.dirname(platformIndexPath).split(path.sep);

        for (let i = platformIndexPathSegments.length; i >= 0; i -= 1) {
            const currentPath = platformIndexPathSegments.slice(0, i).join(path.sep);

            if (!fs.existsSync(path.resolve(currentPath, 'package.json'))) {
                continue;
            }

            const packageJson = fs.readJsonSync(path.resolve(currentPath, 'package.json'));

            if (packageJson.name === this.platformName) {
                this.platformDir = platformIndexPath.replace(new RegExp((packageJson.main || 'lib/index.js') + '$'), '');
                break;
            }
        }
        this.platformDir = this.platformDir.replace(new RegExp(path.sep + '+$', 'gi'), '');
        const configFactory = cosmiconfigSync('agros-platform').search(this.platformDir);

        if (!configFactory || typeof configFactory.config === 'function') {
            this.configFactory = configFactory.config;
        }
    }

    public getConfigFactory() {
        return this.configFactory;
    }

    protected configFactory: (config: Configuration) => Configuration = () => null;
}
