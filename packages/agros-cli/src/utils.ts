import {
    CLIConfigParser,
    ProjectConfigParser,
} from '@agros/config';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
    Collection,
    CollectionGenerateResult,
} from '@agros/common';
import _ from 'lodash';
import {
    Command,
    Option,
} from 'commander';
import { Logger } from '@agros/logger';

export const loadCollections = (scene: string) => {
    try {
        const cliConfigParser = new CLIConfigParser();
        const projectConfigParser = new ProjectConfigParser();
        const collectionPackageName = projectConfigParser.getConfig<string>('useCollection') || cliConfigParser.getConfig<string>('collection');
        let collectionIndexFilePath: string;

        try {
            collectionIndexFilePath = require.resolve(collectionPackageName);
        } catch (e) {
            collectionIndexFilePath = require.resolve(collectionPackageName);
        }

        if (!collectionIndexFilePath) {
            try {
                const projectCollectionPackagePath = path.resolve(
                    process.cwd(),
                    'node_modules',
                    collectionPackageName,
                    'lib/collections',
                );
                if (fs.existsSync(projectCollectionPackagePath) && fs.statSync(projectCollectionPackagePath).isDirectory()) {
                    collectionIndexFilePath = projectCollectionPackagePath;
                }
            } catch (e) {}
        }

        if (!collectionIndexFilePath) {
            return [];
        }

        const collectionsDir = path.resolve(path.dirname(collectionIndexFilePath), './collections');
        let collectionExports = require(collectionIndexFilePath);
        collectionExports = collectionExports?.default || collectionExports;

        if (!collectionExports || !_.isObjectLike(collectionExports)) {
            return [];
        }

        collectionExports = Object.keys(collectionExports).reduce((result, key) => {
            result[_.kebabCase(key)] = collectionExports[key];
            return result;
        }, {});

        const collections: Collection[] = fs.readdirSync(collectionsDir)
            .filter((entity) => {
                const absolutePath = path.resolve(collectionsDir, entity);
                return fs.statSync(absolutePath).isDirectory() && fs.existsSync(path.resolve(absolutePath, 'schema.json'));
            })
            .map((dirname) => {
                try {
                    const name = _.kebabCase(dirname);
                    return {
                        name,
                        schema: fs.readJsonSync(path.resolve(collectionsDir, dirname, 'schema.json')),
                        FactoryClass: collectionExports[scene][name],
                    } as Collection;
                } catch (e) {
                    return null;
                }
            })
            .filter((collection) => !!collection && !!collection.FactoryClass);

        return collections;
    } catch (e) {
        return [];
    }
};

export const addArgumentsAndOptionsToCommandWithSchema = ({
    scene,
    command,
    schema,
    prependProperties = {},
    appendProperties = {},
    defaultRequired = [],
}: {
    scene: string;
    command: Command;
    schema: Record<string, any>;
    prependProperties?: Record<string, Record<string, any>>;
    appendProperties?: Record<string, Record<string, any>>;
    defaultRequired?: string[];
}) => {
    if (schema?.alias) {
        command.alias(schema.alias);
    }

    let properties = _.get(schema, `scenes.${scene}.properties`) || {};
    const required = defaultRequired.concat(_.get(schema, `scenes.${scene}.required`) || []);

    properties = {
        ...prependProperties,
        ...properties,
        ...appendProperties,
    };

    /**
     * an array stores a map for argument index and schema properties index
     * the index of this array is the index of arguments
     * this value of this array is the index of properties
     */
    const argumentIndexes: number[] = [];

    for (const [index, propertyKey] of Object.keys(properties).entries()) {
        const {
            cliType,
            message = '',
            type = 'input',
            alias = '',
            default: defaultValue,
        } = properties[propertyKey];

        switch (cliType) {
            case 'argument': {
                command.argument(
                    required.indexOf(propertyKey) === -1
                        ? `[${_.kebabCase(propertyKey)}]`
                        : `<${_.kebabCase(propertyKey)}>`,
                    message,
                    defaultValue,
                );
                argumentIndexes.push(index);
                break;
            }
            case 'option': {
                let optionLiterals = [];
                let transformer: Function;

                [propertyKey, alias].forEach((key) => {
                    if (!key) {
                        return;
                    }
                    optionLiterals.unshift((key.length === 1 ? '-' + key : '--' + _.kebabCase(key)));
                });

                switch (type) {
                    case 'confirm': {
                        break;
                    }
                    case 'input': {
                        optionLiterals.push('[value]');
                        break;
                    }
                    case 'number': {
                        optionLiterals.push('[value]');
                        transformer = (option) => {
                            if (_.isUndefined) {
                                return defaultValue;
                            }
                            return parseInt(option, 10);
                        };
                        break;
                    }
                    case 'list':
                    case 'rawlist': {
                        optionLiterals.push('[value...]');
                        break;
                    }
                    default: {
                        break;
                    }
                }

                const optionFlags = optionLiterals
                    .slice(0, -1)
                    .join(', ')
                    .concat(' ')
                    .concat(optionLiterals[optionLiterals.length - 1]);

                let option = new Option(optionFlags, message);

                if (_.isFunction(transformer)) {
                    option = option.argParser(transformer);
                }

                if (required.indexOf(propertyKey) !== -1) {
                    if (_.isUndefined(defaultValue)) {
                        option = option.preset('');
                    }
                    option = option.makeOptionMandatory(true);
                } else if (!_.isUndefined(defaultValue)) {
                    option = option.default(defaultValue);
                }

                command.addOption(option);

                break;
            }
            default:
                break;
        }
    }

    return (data: any[]) => {
        const argumentValues = data.slice(0, -2) || [];
        const options = data[data.length - 2] || {};
        const propsWithContext = {
            ...options,
            ...argumentIndexes.reduce((result, keyIndex, valueIndex) => {
                result[Object.keys(properties)[keyIndex]] = argumentValues[valueIndex];
                return result;
            }, {}) as Record<string, any>,
        };
        return Object.keys(propsWithContext).reduce((result, key) => {
            const value = propsWithContext[key];
            if (_.isString(value) && value.startsWith('$context$')) {
                const contextKey = value.replace(/^\$context\$/g, '');
                if (contextKey) {
                    result[key] = propsWithContext[contextKey];
                    return result;
                }
            }
            result[key] = propsWithContext[key];
            return result;
        }, {}) as Record<string, any>;
    };
};

export const logGenerateResult = (result: CollectionGenerateResult) => {
    const logger = new Logger();
    const terminateLog = logger.loadingLog('Updating and creating files...');
    const bgColorMap = {
        CREATE: '\x1b[42m',
        UPDATE: '\x1b[44m',
    };
    const fgColorMap = {
        CREATE: '\x1b[37m',
        UPDATE: '\x1b[37m',
    };

    if (!Object.keys(result).some((key) => Array.isArray(result[key]) && result[key].length > 0)) {
        terminateLog('warning', 'No files was updated or created');
    } else {
        terminateLog('success', 'Updated and/or created files successfully');
        for (const resultKey of Object.keys(result)) {
            const files = result[resultKey];

            if (!Array.isArray(files)) {
                continue;
            }

            for (const filepath of files) {
                const key = resultKey.toUpperCase();
                const fgColor = fgColorMap[key] || '\x1b[7m';
                const bgColor = bgColorMap[key] || '\x1b[7m';
                process.stdout.write(fgColor + bgColor + key + '\x1b[0m ' + path.relative(process.cwd(), filepath) + '\n');
            }
        }
    }
};
