import { EntityDescriptor } from './types';
import * as fs from 'fs';
import {
    ClassImportItem,
    detectDecorators,
    detectImportedClass,
    detectLastImportLine,
} from './detectors';
import { parseAST } from '@agros/utils';
import * as t from '@babel/types';
import { generateDecoratorCode } from './code-generators';
import { ParseResult } from '@babel/parser';

export interface UpdateItem {
    line: number;
    content: string[];
    deleteLines: number;
};

export type Updater<T> = (data: {
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
    targetAST: ParseResult<t.File>,
    classImportItem: ClassImportItem,
    initialResult: UpdateItem[],
    options?: T;
}) => Promise<UpdateItem[]>;

const createUpdater = <T = Record<string, any>>(
    updater: Updater<T>,
    check: (source: EntityDescriptor, target: EntityDescriptor) => boolean = () => true,
) => {
    return async (
        sourceDescriptor: EntityDescriptor,
        targetDescriptor: EntityDescriptor,
        options: T = {} as T,
    ) => {
        const result: UpdateItem[] = [];

        if (
            !check(sourceDescriptor, targetDescriptor) ||
                !fs.existsSync(sourceDescriptor.absolutePath) ||
                !fs.existsSync(targetDescriptor.absolutePath)
        ) {
            return result;
        }

        const importedClass = await detectImportedClass(
            sourceDescriptor.absolutePath,
            targetDescriptor.absolutePath,
        );
        const {
            exportItem,
            imported,
            importLiteralValue,
        } = importedClass;

        if (!exportItem) {
            return [];
        }

        const targetAST = parseAST(fs.readFileSync(targetDescriptor.absolutePath).toString());

        if (!imported) {
            result.push({
                line: detectLastImportLine(targetAST),
                content: [importLiteralValue],
                deleteLines: 0,
            });
        }

        return await updater({
            targetAST,
            sourceDescriptor,
            targetDescriptor,
            classImportItem: importedClass,
            initialResult: result,
            options,
        });
    };
};

export const updateImportedEntityToModule = createUpdater(
    async ({
        sourceDescriptor,
        targetAST,
        classImportItem,
        initialResult,
        options,
    }) => {
        const { identifierName } = classImportItem;
        const result = Array.from(initialResult);

        const [decorator] = detectDecorators(targetAST, 'Module');

        if (!decorator) {
            return result;
        }

        if (!decorator.expression.arguments[0]) {
            decorator.expression.arguments.push(
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('imports'),
                        t.arrayExpression([
                            t.identifier(identifierName),
                        ]),
                    ),
                ]),
            );
        }

        const argument = decorator.expression.arguments[0];

        if (argument.type !== 'ObjectExpression') {
            return result;
        }

        let decoratorProperties: string[];

        switch (sourceDescriptor.collectionType) {
            case 'component': {
                decoratorProperties = ['components', ...(options.noExport ? [] : ['exports'])];
                break;
            }
            case 'service': {
                decoratorProperties = ['providers', ...(options.noExport ? [] : ['exports'])];
                break;
            }
            case 'module': {
                decoratorProperties = ['imports'];
                break;
            }
            default:
                return result;
        }

        for (const decoratorProperty of decoratorProperties) {
            let property: t.ObjectProperty = argument.properties.find((property) => {
                return property.type === 'ObjectProperty' && (
                    (property.key.type === 'Identifier' && property.key.name === decoratorProperty) ||
                (property.key.type === 'StringLiteral' && property.key.value === decoratorProperty)
                ) && property.value.type === 'ArrayExpression';
            }) as t.ObjectProperty;

            if (!property) {
                property = t.objectProperty(
                    t.identifier(decoratorProperty),
                    t.arrayExpression([]),
                );
                argument.properties.push(property);
            }

            if (
                !(property.value as t.ArrayExpression).elements.some((element) => {
                    return element.type === 'Identifier' && element.name === identifierName;
                })
            ) {
                (property.value as t.ArrayExpression).elements.push(t.identifier(identifierName));
            }
        }

        const decoratorCode = await generateDecoratorCode(decorator);
        result.push({
            line: decorator.loc?.start.line,
            content: decoratorCode.split(/\r|\n|\r\n/).map((line) => {
                return new Array(decorator.loc?.start.column).fill(' ').join('') + line;
            }),
            deleteLines: decorator.loc?.end.line - decorator.loc?.start.line + 1,
        });

        return result;
    },
    (source, target) => source.collectionType && target.collectionType === 'module',
);

export const updateImportedServiceToService = async (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
) => {

};

// TODO
export const updateImportedEntityToComponent = async () => {};

// TODO
export const updateRouteToModule = async () => {};
