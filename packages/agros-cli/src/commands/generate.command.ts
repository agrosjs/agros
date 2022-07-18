import {
    Command,
    Option,
} from 'commander';
import { AbstractCommand } from '../command.abstract';
import { getCollections } from '../utils';
import _ from 'lodash';
import * as path from 'path';
import { normalizeSrcPath } from '@agros/common';

export class GenerateCommand extends AbstractCommand implements AbstractCommand {
    public register(): Command {
        const collections = getCollections();
        const command = new Command('generate');
        command.alias('g');

        for (const collection of collections) {
            const {
                name,
                schema = {},
                FactoryClass,
            } = collection;
            const {
                properties = {},
                required = [],
            } = schema;
            const collectionCommand = new Command(name);

            if (schema?.alias) {
                collectionCommand.alias(schema.alias);
            }

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
                        collectionCommand.argument(
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
                            optionLiterals.push((key.length === 1 ? '-' + key : '--' + _.kebabCase(key)) );
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

                        collectionCommand.addOption(option);
                        break;
                    }
                    default:
                        break;
                }
            }

            collectionCommand.action(async (...data) => {
                try {
                    const argumentValues = data.slice(0, -2) || [];
                    const options = data[data.length - 2] || {};
                    const propsWithContext = {
                        ...options,
                        ...argumentIndexes.reduce((result, keyIndex, valueIndex) => {
                            result[Object.keys(properties)[keyIndex]] = argumentValues[valueIndex];
                            return result;
                        }, {}) as Record<string, any>,
                    };

                    const props = Object.keys(propsWithContext).reduce((result, key) => {
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
                    }, {});

                    const factory = new FactoryClass();
                    const result = await factory.generate(props);

                    for (const resultKey of Object.keys(result)) {
                        const files = result[resultKey];

                        if (!Array.isArray(files)) {
                            continue;
                        }

                        for (const filepath of files) {
                            process.stdout.write(resultKey.toUpperCase() + ': ' + path.relative(normalizeSrcPath(), filepath) + '\n');
                        }
                    }
                } catch (e) {
                    process.stdout.write('\x1b[31m' + (e.message || e.toString()) + '\x1b[0m\n');
                    process.stdout.write('\n');
                    process.exit(1);
                }
            });

            command.addCommand(collectionCommand);
        }

        return command;
    }
}
