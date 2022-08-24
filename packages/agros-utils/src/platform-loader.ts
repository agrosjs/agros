import * as path from 'path';

export interface CodeLocation {
    start: number;
    end: number;
}

export interface ComponentScript {
    content: string;
    location?: CodeLocation;
}

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

    public getComponentScript(source: string): ComponentScript {
        try {
            const required = require(path.join(this.platformIndexDir, 'get-component-script'));
            if (typeof required?.getComponentScript === 'function') {
                return required.getComponentScript(source) as ComponentScript;
            }
        } catch (e) {}
        return null;
    }
}
