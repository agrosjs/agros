import * as path from 'path';
import _ from 'lodash';
import { permanentlyReadJson } from '@agros/utils';

export interface PackageConfig {
    configPath?: string;
}

export class PackageConfigParser {
    private readonly PROCESS_CWD = process.cwd();
    private defaultPackageConfig: PackageConfig = {
        configPath: 'agros.config.js',
    };
    private packageConfig = _.clone(this.defaultPackageConfig);

    public constructor() {
        try {
            const packageConfig = permanentlyReadJson(path.resolve(this.PROCESS_CWD, 'package.json'));
            this.packageConfig = _.merge(
                {},
                _.clone(this.packageConfig),
                _.get(packageConfig, 'agros') || {},
            );
        } catch (e) {}
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.clone(this.packageConfig) as T;
        }

        return _.get(_.clone(this.packageConfig), pathname) as T;
    };
}
