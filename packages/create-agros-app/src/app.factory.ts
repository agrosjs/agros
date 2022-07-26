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
import {
    execSync,
} from 'child_process';
import * as glob from 'glob';
import { Logger } from '@agros/logger';
import { runCommand } from '@agros/utils';
import { LicenseUtils } from './license';

export interface AppCollectionOptions {
    path?: string;
    skipInstall?: boolean;
}

export class AppCollectionFactory extends AbstractCollection implements AbstractCollection {
    private licenseUtils = new LicenseUtils();
    private licenseList = this.licenseUtils.getLicenseList();

    public async generate({
        path: targetPath = process.cwd(),
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

        let gitConfigUserEmail: string;
        let gitConfigUserName: string;

        try {
            gitConfigUserEmail = execSync('git config --get user.email').toString().trim();
        } catch (e) {}

        try {
            gitConfigUserName = execSync('git config --get user.name').toString().trim();
        } catch (e) {}

        const props = await inquirer.prompt([
            {
                name: 'name',
                type: 'input',
                message: 'Project name',
                default: path.basename(targetAbsolutePath),
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
                ...(
                    gitConfigUserName
                        ? {
                            default: `${gitConfigUserName}${gitConfigUserEmail ? ' <' + gitConfigUserEmail + '>' : ''}`,
                        }
                        : {
                            default: '',
                        }
                ),
            },
            {
                name: 'repository',
                type: 'input',
                message: 'Project repository URL',
            },
            ...(
                this.licenseList.length > 0
                    ? [
                        {
                            name: 'license',
                            type: 'list',
                            message: 'The license of this project',
                            default: 'mit',
                            choices: this.licenseList,
                        },
                    ]
                    : []
            ),
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
            repository: yup.string().required().test(
                'test-git-url',
                'Property "repository" must be a valid Git URL',
                (value) => {
                    return /^(([A-Za-z0-9]+@|http(|s)\:\/\/)|(http(|s)\:\/\/[A-Za-z0-9]+@))([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git){1}$/i.test(value);
                },
            ),
            license: yup.string().optional(),
        });

        const templateConfig = _.pick(
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

        if (templateConfig?.license) {
            templateConfig.license = this.licenseUtils.getLicenseName(templateConfig.license);
        }

        configValidator.validateSync(templateConfig);

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

        const templateAbsolutePath = path.resolve(__dirname, '../files');
        const paths = glob.sync(templateAbsolutePath + '/**/{.*,*}._');

        for (const pathname of paths) {
            this.writeTemplateFile(
                pathname,
                path.resolve(targetAbsolutePath, path.relative(templateAbsolutePath, pathname)).replace(/\.\_$/g, ''),
                templateConfig,
            );
        }

        if (props.license) {
            this.writeFile(
                this.projectPath('LICENSE'),
                this.licenseUtils.generate(props.license, {
                    user: props.author,
                    description: props.description,
                    year: new Date().getFullYear().toString(),
                }),
            );
        }

        if (installCommand && installCommand.length > 0) {
            const logger = new Logger();
            const loadingLog = logger.loadingLog('Installing dependencies...');
            const result = await runCommand(installCommand[0], installCommand.slice(1), {
                cwd: targetAbsolutePath,
            });
            if (result instanceof Error) {
                loadingLog('warning', 'Failed to install dependencies');
            } else {
                loadingLog('success', 'Dependencies installed');
            }
        }

        return result;
    }
}
