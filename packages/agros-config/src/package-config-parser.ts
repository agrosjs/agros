import * as fs from 'fs-extra';
import * as path from 'path';
import _ from 'lodash';

export interface PackageConfig {
    configPath?: string;
}

export class PackageConfigParser {
    private readonly PROCESS_CWD = process.cwd();
    private defaultPackageConfig: PackageConfig = {
        configPath: 'agros.json',
    };
    private packageConfig = _.clone(this.defaultPackageConfig);

    public constructor() {
        try {
            const packageConfig = fs.readJsonSync(path.resolve(this.PROCESS_CWD, 'package.json')) || {};
            this.packageConfig = _.merge(_.clone(this.packageConfig), packageConfig);
        } catch (e) {}
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.clone(this.packageConfig) as T;
        }

        return _.get(_.clone(this.packageConfig), pathname) as T;
    };
}
