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

export type Updater = (
    targetAST: ParseResult<t.File>,
    classImportItem: ClassImportItem,
    initialResult: UpdateItem[],
) => Promise<UpdateItem[]>;

const createUpdater = (updater: Updater) => {
    return async (
        sourceDescriptor: EntityDescriptor,
        targetDescriptor: EntityDescriptor,
    ) => {
        const result: UpdateItem[] = [];

        if (
            sourceDescriptor.collectionType !== 'module' ||
                targetDescriptor.collectionType !== 'module' ||
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

        return await updater(targetAST, importedClass, result);
    };
};

export const updateImportedModuleToModule = createUpdater(async (
    targetAST,
    classImportItem,
    initialResult,
) => {
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

    const decoratorProperties = ['imports'];

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
});

// TODO
// export const updateImportedServiceToModule = createUpdater(async () => {});

// TODO
// export const updateImportedComponentToModule = createUpdater(async () => {});

export const updateImportedServiceToService = async (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
) => {

};

export const updateImportedComponentOrServiceToComponent = async () => {};
