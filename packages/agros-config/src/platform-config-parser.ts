import * as path from 'path';
import { Configuration } from 'webpack';
import { cosmiconfigSync } from 'cosmiconfig';
import { ProjectConfigParser } from './project-config-parser';

export class PlatformConfigParser {
    protected projectConfigParser: ProjectConfigParser;
    protected platformName: string;
    protected platformDir: string;

    public constructor() {
        this.projectConfigParser = new ProjectConfigParser();
        this.platformName = this.projectConfigParser.getConfig<string>('platform');
        this.platformDir = path.resolve(process.cwd(), 'node_modules', this.platformName);
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
