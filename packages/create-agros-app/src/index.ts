/* eslint-disable no-unused-vars */
import {
    AbstractCollection,
    CollectionGenerateResult,
} from '@agros/common';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import _ from 'lodash';
import * as yup from 'yup';
import * as semver from 'semver';

export interface AppCollectionOptions {
    path?: string;
    skipInstall?: boolean;
}

export class AppCollectionFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        path: targetPath = '',
        skipInstall,
    }: AppCollectionOptions) {
        const targetAbsolutePath = path.resolve(process.cwd(), targetPath);
        const pathExisted = fs.existsSync(targetAbsolutePath);
        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        if (pathExisted && !fs.statSync(targetAbsolutePath).isDirectory()) {
            throw new Error(`Path "${targetPath}" is not a directory`);
        }

        if (pathExisted && fs.readdirSync(targetAbsolutePath).length > 0) {
            throw new Error(`Path "${targetPath}" is not empty, please remove all files in it and try again`);
        }

        const props = await inquirer.prompt([
            {
                name: 'name',
                type: 'input',
                message: 'Project name',
            },
            {
                name: 'version',
                type: 'input',
                message: 'Package initial version',
                default: '0.0.1',
            },
            {
                name: 'description',
                type: 'input',
                message: 'Project description',
            },
            {
                name: 'author',
                type: 'input',
                message: 'Project author\'s name',
            },
            {
                name: 'repository',
                type: 'input',
                message: 'Project repository URL',
            },
            {
                name: 'license',
                type: 'input',
                message: 'The license of this project',
                default: 'MIT',
            },
            {
                name: 'packageManager',
                type: 'list',
                message: 'Package manager of this project',
                choices: [
                    {
                        name: 'NPM',
                        value: 'npm',
                    },
                    {
                        name: 'Yarn',
                        value: 'yarn',
                    },
                    {
                        name: 'PNPM',
                        value: 'pnpm',
                    },
                    {
                        name: 'Other...',
                        value: 'other',
                    },
                ],
            },
        ]);

        const configValidator = yup.object().shape({
            name: yup.string().required(),
            version: yup.string().required().test(
                'test-semver',
                `Property "version" must be a valid semver string, but got: "${props.version}"`,
                (value) => {
                    return Boolean(semver.valid(value));
                },
            ),
            description: yup.string().optional(),
            author: yup.string().optional(),
            repository: yup.string().optional().test(
                'test-git-url',
                'Property "repository" must be a valid Git URL',
                (value) => {
                    return /^(([A-Za-z0-9]+@|http(|s)\:\/\/)|(http(|s)\:\/\/[A-Za-z0-9]+@))([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git){1}$/i.test(value);
                },
            ),
            license: yup.string().optional(),
        });
        const config = _.get(
            props,
            [
                'name',
                'version',
                'description',
                'author',
                'repository',
                'license',
            ],
        );
        let installCommand: string[] = [];

        if (!skipInstall) {
            const { packageManager } = props;

            switch (packageManager) {
                case 'npm': {
                    installCommand = ['npm', 'i'];
                    break;
                }
                case 'yarn': {
                    installCommand = ['yarn'];
                    break;
                }
                case 'pnpm': {
                    installCommand = ['pnpm', 'i'];
                    break;
                }
                case 'other':
                default: {
                    const { installCommandStr } = await inquirer.prompt([
                        {
                            name: 'installCommandStr',
                            type: 'input',
                            message: 'Please input the install command',
                        },
                    ]);

                    if (_.isString(installCommandStr)) {
                        installCommand = installCommandStr.split(/\s+/g);
                    }

                    break;
                }
            }
        }

        return result;
    }
}
