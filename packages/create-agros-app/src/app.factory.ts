import {
    AbstractGeneratorFactory,
    CollectionFactoryResult,
} from '@agros/tools/lib/collection';
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
import { Logger } from '@agros/tools/lib/logger';
import { runCommand } from '@agros/tools/lib/run-command';
import { LicenseUtils } from './license';
import { PlatformConfigParser } from '@agros/tools/lib/config-parsers';
import parseGlob from 'parse-glob';

export interface AppCollectionOptions {
    path?: string;
    skipInstall?: boolean;
}

export class AppCollectionFactory extends AbstractGeneratorFactory implements AbstractGeneratorFactory {
    private licenseUtils = new LicenseUtils();
    private licenseList = this.licenseUtils.getLicenseList();

    public async generate({
        path: targetPath = process.cwd(),
        skipInstall,
    }: AppCollectionOptions) {
        const targetAbsolutePath = path.resolve(process.cwd(), targetPath);
        const pathExisted = fs.existsSync(targetAbsolutePath);
        const result: CollectionFactoryResult = {
            create: [],
            update: [],
        };
        const platformConfig = new PlatformConfigParser(this.projectConfig.getConfig<string>('platform'));
        const logger = new Logger();

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
                name: 'platform',
                type: 'input',
                message: 'Enter the package name or directory name of platform you want to use in this project',
                default: '@agros/platform-react',
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

        {
            const finishLoadingLog = logger.loadingLog('Generating project files...');
            try {
                const templateAbsolutePath = path.resolve(__dirname, '../files');
                const paths = glob.sync(templateAbsolutePath + '/**/{.*,*}._');

                for (const pathname of paths) {
                    const relativePath = path.relative(templateAbsolutePath, pathname).replace(/\.\_$/g, '');
                    this.writeTemplateFile(
                        pathname,
                        path.resolve(targetAbsolutePath, relativePath),
                        templateConfig,
                    );
                    result.create.push(relativePath);
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
                    result.create.push('LICENSE');
                }

                finishLoadingLog('success');
            } catch (e) {
                finishLoadingLog('error', 'Failed to generate project files, with error: ' + e.message || e.toString());
            }
        }

        if (!skipInstall) {
            {
                const finishLoadingLog = logger.loadingLog('Installing dependencies...');
                const result = await runCommand('npm', ['i'], {
                    cwd: targetAbsolutePath,
                });
                if (result instanceof Error) {
                    finishLoadingLog('error', 'Failed to install dependencies');
                } else {
                    finishLoadingLog('success', 'Dependencies installed');
                }
            }
            {
                let succeeded = true;
                const finishLoadingLog = logger.loadingLog('Installing platform \'' + props.platform + '\'...');
                if (fs.existsSync(path.resolve(props.platform))) {
                    const result = await runCommand(
                        'npm',
                        [
                            'install',
                            props.platform,
                            '-S',
                        ],
                    );
                    if (result instanceof Error) {
                        finishLoadingLog('error', 'Failed to install platform package \'' + props.platform + '\'');
                        succeeded = false;
                    } else {
                        finishLoadingLog('success', 'Platform package \'' + props.platform + '\' installed');
                    }
                } else {
                    finishLoadingLog('success', 'The platform pathname is a local directory, installation skipped');
                }
                if (succeeded) {
                    const finishLoadingLog = logger.loadingLog('Generating platform-specified files...');
                    try {
                        const createFilesDir = platformConfig.getConfig<string>('files.create');
                        const files = glob.sync(createFilesDir);
                        for (const pathname of files) {
                            const relativePath = path.relative(parseGlob(createFilesDir).base, pathname).replace(/\.\_$/g, '');
                            this.writeTemplateFile(
                                pathname,
                                path.resolve(targetAbsolutePath, relativePath),
                                templateConfig,
                            );
                            result.create.push(relativePath);
                        }
                        finishLoadingLog('success');
                    } catch (e) {
                        finishLoadingLog('error', 'Failed to generate platform-specified file with error: ' + e.message || e.toString());
                    }
                }
            }
        } else {
            logger.warning('There is no package manager specified, you should install platform package and dependencies manually');
        }

        return result;
    }
}
