import * as path from 'path';
import {
    permanentlyReadJson,
    runCommand,
} from '@agros/utils';

export const ejectedDevDependencies = [
    '@babel/core',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-decorators',
    'babel-plugin-transform-typescript-metadata',
    'customize-cra',
];

export const eject = async () => {
    const projectPackageConfig = permanentlyReadJson('package.json');
    const buildScriptsPackageConfig = permanentlyReadJson(path.resolve(__dirname, 'package.json'));
};
