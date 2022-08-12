import * as path from 'path';

export class PlatformLoader {
    protected platformIndexFile: string;
    protected platformIndexDir: string;

    public constructor(protected readonly platformName: string) {
        this.platformIndexFile = require.resolve(platformName, {
            paths: [process.cwd()],
        });
        this.platformIndexDir = path.dirname(this.platformIndexFile);
    }

    public getPlatform<T>(): T {
        let platform = require(path.join(this.platformIndexDir, 'platform'));
        if (platform) {
            platform = platform.default || platform;
        }
        return platform;
    }

    public runCommands(command: string) {
        const required = require(path.join(this.platformIndexDir, 'run-commands'));
        if (typeof required?.runCommands === 'function') {
            required.runCommands(command);
        }
    }
}
