import { EntityDescriptor } from './types';
import * as fs from 'fs';
import {
    detectDecorators,
    detectImportedClass,
} from './detectors';
import { parseAST } from '@agros/utils';
import * as t from '@babel/types';
import { generateDecoratorCode } from './generate-decorator-code';

export interface UpdateItem {
    line: number;
    content: string[];
    deleteLines: number;
};

export const updateImportedModuleToModule = async (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
): Promise<UpdateItem[]> => {
    if (!fs.existsSync(sourceDescriptor.absolutePath)) {
        throw new Error(`Source module '${sourceDescriptor.entityName}' does not exist`);
    }

    if (!fs.existsSync(targetDescriptor.absolutePath)) {
        throw new Error(`Target module '${targetDescriptor.entityName}' does not exist`);
    }

    const result: UpdateItem[] = [];

    const importedClass = detectImportedClass(
        sourceDescriptor.absolutePath,
        targetDescriptor.absolutePath,
    );
    const {
        exportItem,
        imported,
        importLiteralValue,
        identifierName,
    } = importedClass;

    if (!exportItem) {
        return [];
    }

    const targetAST = parseAST(fs.readFileSync(targetDescriptor.absolutePath).toString());

    if (!imported) {
        let lastImportLine = 0;

        for (const statement of targetAST.program.body) {
            if (statement.type === 'ImportDeclaration') {
                lastImportLine = statement.loc?.end.line;
            } else {
                continue;
            }
        }

        result.push({
            line: lastImportLine + 1,
            content: [importLiteralValue],
            deleteLines: 0,
        });
    }

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

    let importsProperty: t.ObjectProperty = argument.properties.find((property) => {
        return property.type === 'ObjectProperty' && (
            (property.key.type === 'Identifier' && property.key.name === 'imports') ||
            (property.key.type === 'StringLiteral' && property.key.value === 'imports')
        ) && property.value.type === 'ArrayExpression';
    }) as t.ObjectProperty;

    if (!importsProperty) {
        importsProperty = t.objectProperty(
            t.identifier('imports'),
            t.arrayExpression([]),
        );
        argument.properties.push(importsProperty);
    }

    if (
        !(importsProperty.value as t.ArrayExpression).elements.some((element) => {
            return element.type === 'Identifier' && element.name === identifierName;
        })
    ) {
        (importsProperty.value as t.ArrayExpression).elements.push(t.identifier(identifierName));
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
};
