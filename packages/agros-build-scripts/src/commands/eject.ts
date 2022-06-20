import * as path from 'path';
import {
    permanentlyReadJson,
    runCommand,
} from '@agros/utils';
import _ from 'lodash';
import { ProjectConfigParser } from '@agros/config';
import { Logger } from '@agros/logger';
import * as fs from 'fs';

const logger = new Logger();

export const ejectedDevDependencies = [
    '@babel/core',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-decorators',
    'babel-plugin-transform-typescript-metadata',
];

export const eject = async () => {
    const stopCopyFileLoadingLog = logger.loadingLog('Copying config-overrides.js');
    try {
        const configOverridesConfigContent = fs.readFileSync(path.resolve(__dirname, '../../config-overrides.js')).toString();
        fs.writeFileSync(
            path.resolve(process.cwd(), 'config-overrides.js'),
            configOverridesConfigContent.replace('./lib/customize', '@agros/build-scripts/lib/customize'),
            {
                encoding: 'utf-8',
            },
        );
        stopCopyFileLoadingLog('success');
    } catch (e) {
        stopCopyFileLoadingLog('error');
        logger.error('Failed to copy config-overrides.js', e);
    }

    const projectConfigParser = new ProjectConfigParser();
    const buildScriptsPackageConfig: any = permanentlyReadJson(path.resolve(__dirname, '../../package.json'));
    const dependencies = _.merge(
        {},
        buildScriptsPackageConfig.dependencies || {},
        buildScriptsPackageConfig.devDependencies || {},
    );
    const installedDevDependencies = Object.keys(dependencies).reduce((result, currentDependencyName) => {
        if (ejectedDevDependencies.indexOf(currentDependencyName) !== -1) {
            return result.concat(`${currentDependencyName}@${dependencies[currentDependencyName]}`);
        }
        return result;
    }, []);

    logger.info(
        'The packages will be installed:\n' +
        '\nDev Dependencies:' +
        [''].concat(installedDevDependencies).join('\n\t').concat('\n\n'),
    );
    const stop = logger.loadingLog('Starting installing dependencies');

    const result = await runCommand(
        projectConfigParser.getConfig<string>('npmClient'),
        ['install', ...installedDevDependencies, '-D'],
    );

    if (result === true) {
        stop('success', 'Dependencies installation completed');
    } else {
        stop('error');
        logger.error('Failed to install dependencies, you must install them manually.', result);
        process.exit(1);
    }
};
