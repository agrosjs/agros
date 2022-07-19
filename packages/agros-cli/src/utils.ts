import { CLIConfigParser } from '@agros/config';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Collection } from '@agros/common';
import _ from 'lodash';
import {
    Command,
    Option,
} from 'commander';

export const getCollections = () => {
    try {
        const cliConfigParser = new CLIConfigParser();
        const collectionPackageName = cliConfigParser.getConfig<string>('collection');
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
                return fs.statSync(absolutePath).isDirectory() &&
                    fs.existsSync(path.resolve(absolutePath, 'schema.json'));
            })
            .map((dirname) => {
                try {
                    const name = _.kebabCase(dirname);
                    return {
                        name,
                        schema: fs.readJsonSync(path.resolve(collectionsDir, dirname, 'schema.json')),
                        FactoryClass: collectionExports[name],
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

export const addArgumentsAndOptionsToCommandWithSchema = (
    command: Command,
    schema: Record<string, any>,
    propertiesKey: string,
    requiredPropertiesKey: string,
) => {
    if (schema?.alias) {
        command.alias(schema.alias);
    }

    const properties = schema[propertiesKey] || {};
    const required = schema[requiredPropertiesKey] || [];

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
                        optionLiterals.push(
                            required.indexOf(propertyKey) === -1
                                ? '[value]'
                                : '<value>',
                        );
                        break;
                    }
                    case 'number': {
                        optionLiterals.push(
                            required.indexOf(propertyKey) === -1
                                ? '[value]'
                                : '<value>',
                        );
                        transformer = (option) => parseInt(option, 10);
                        break;
                    }
                    case 'list':
                    case 'rawlist': {
                        optionLiterals.push(
                            required.indexOf(propertyKey) === -1
                                ? '[value...]'
                                : '<value...>',
                        );
                        break;
                    }
                    default: {
                        break;
                    }
                }

                const option = new Option(
                    optionLiterals
                        .slice(0, -1)
                        .join(', ')
                        .concat(' ')
                        .concat(optionLiterals[optionLiterals.length - 1]),
                    message,
                );

                if (!_.isUndefined(defaultValue)) {
                    option.defaultValue = defaultValue;
                }

                if (_.isFunction(transformer)) {
                    option.argParser(transformer);
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
        return {
            ...options,
            ...argumentIndexes.reduce((result, keyIndex, valueIndex) => {
                result[Object.keys(properties)[keyIndex]] = argumentValues[valueIndex];
                return result;
            }, {}) as Record<string, any>,
        };
    };
};
