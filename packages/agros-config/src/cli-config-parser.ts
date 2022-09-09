import * as fs from 'fs-extra';
import _ from 'lodash';
import * as os from 'os';
import * as path from 'path';

export interface CLIConfig {
    collection?: string;
}

export class CLIConfigParser {
    private readonly configFilePath = path.resolve(os.homedir(), '.config/agros/config.json');
    private defaultCLIConfig: CLIConfig = {
        collection: '@agros/collections',
    };
    private cliConfig = _.cloneDeep(this.defaultCLIConfig);

    public constructor() {
        this.reloadUserConfig();
    }

    public setConfig(pathname: string, value: any) {
        if (!pathname || !value || typeof pathname !== 'string') {
            return;
        }

        try {
            if (!fs.existsSync(this.configFilePath)) {
                if (!fs.existsSync(path.dirname(this.configFilePath))) {
                    fs.mkdirpSync(path.dirname(this.configFilePath));
                }
                fs.writeFileSync(this.configFilePath, '{}', { encoding: 'utf-8' });
            }

            const userConfig = _.set(fs.readJsonSync(this.configFilePath), pathname, value);
            fs.writeJsonSync(this.configFilePath, JSON.stringify(userConfig, null, 4), {
                encoding: 'utf-8',
            });
            this.reloadUserConfig();
        } catch (e) {}
    }

    public getConfig<T>(pathname?: string): T {
        if (!pathname) {
            return _.cloneDeep(this.cliConfig) as T;
        }

        return _.get(_.cloneDeep(this.cliConfig), pathname) as T;
    }

    private reloadUserConfig() {
        if (!fs.existsSync(this.configFilePath) || !fs.statSync(this.configFilePath).isFile()) {
            return;
        }

        try {
            this.cliConfig = _.merge(
                _.cloneDeep(this.cliConfig),
                fs.readJsonSync(this.configFilePath),
            );
        } catch (e) {}
    }
}
