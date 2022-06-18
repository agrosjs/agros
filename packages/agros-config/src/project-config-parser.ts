import _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';

export type ScopeMap = Record<string, string>;

export interface ProjectConfig {
    npmClient?: string;
    indentSize?: number;
    scopes?: ScopeMap;
    defaultScope?: string;
}

export class ProjectConfigParser {
    private defaultProjectConfig: ProjectConfig = {
        npmClient: 'npm',
        indentSize: 4,
        scopes: {
            'main': 'src/modules/**/*',
        },
        defaultScope: 'main',
    };
    private projectConfig: ProjectConfig = _.clone(this.defaultProjectConfig);
    private PROCESS_CWD = process.cwd();

    public constructor(private readonly projectConfigRelativePath = 'agros.json') {
        try {
            const userProjectConfig = fs.readJsonSync(path.resolve(
                this.PROCESS_CWD,
                this.projectConfigRelativePath,
            )) || {};
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
