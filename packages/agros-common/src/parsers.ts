import * as path from 'path';
import * as fs from 'fs-extra';
import * as parser from '@babel/parser';
import {
    ExpressionStatement,
    ImportDeclaration,
    ObjectExpression,
    ObjectProperty,
} from '@babel/types';
import {
    normalizeSrcPath,
} from './normalizers';
import { RootPointDescriptor } from './types';
import {
    getCollectionType,
    getFileEntityIdentifier,
    getPathDescriptorWithAlias,
} from './utils';

export interface ImportedItem {
    localName: string;
    exportName: string;
    source: string;
}

export const parseRootPoints = (entryPathname = 'index.ts'): RootPointDescriptor[] => {
    const content = fs.readFileSync(path.resolve(entryPathname)).toString();
    const { program } = parser.parse(content, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
        ],
    });
    const body = program.body;

    const coreImportDeclaration: ImportDeclaration = body.find((declaration) => {
        if (declaration.type !== 'ImportDeclaration' || !declaration.source.value.startsWith('@agros/core')) {
            return false;
        }

        return true;
    }) as ImportDeclaration;

    if (!coreImportDeclaration) {
        return [];
    }

    let bootstrapFnLocalName: string;

    for (const specifier of (coreImportDeclaration.specifiers || [])) {
        const currentSpecifier = specifier as any;
        if (!currentSpecifier.imported && specifier.local.name === 'bootstrap') {
            bootstrapFnLocalName = 'bootstrap';
            break;
        } else if (currentSpecifier.imported && currentSpecifier.imported.name === 'bootstrap') {
            bootstrapFnLocalName = specifier.local.name;
            break;
        }
    }

    if (!bootstrapFnLocalName) {
        return [];
    }

    const callerDeclaration: ExpressionStatement = body.find((statement) => {
        if (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression' &&
            (statement.expression.callee as any).name === bootstrapFnLocalName
        ) {
            return true;
        }
        return false;
    }) as ExpressionStatement;

    const moduleNames: string[] = ((callerDeclaration.expression as any)?.arguments[0]?.elements as any[] || [])
        .filter((element) => element.type === 'ObjectExpression')
        .map((element: ObjectExpression) => {
            const moduleProperty: ObjectProperty = (element?.properties || [])
                .find((property: ObjectProperty) => {
                    return (property.key as any).name === 'module';
                }) as ObjectProperty;
            if (moduleProperty) {
                return (moduleProperty.value as any).name;
            }
            return null;
        })
        .filter((moduleName) => !!moduleName);

    const importedItems: ImportedItem[] = body.filter((statement) => {
        return statement.type === 'ImportDeclaration';
    }).reduce((result, currentStatement: ImportDeclaration) => {
        return result.concat(currentStatement.specifiers.map((specifier) => {
            return {
                localName: specifier.local.name,
                source: currentStatement.source.value,
                exportName: (specifier as any).imported.name,
            };
        }));
    }, [] as ImportedItem[]).filter((importedItem) => {
        return moduleNames.indexOf(importedItem.localName) !== -1;
    });

    return importedItems.map((importedItem) => {
        const {
            source,
            localName,
            exportName,
        } = importedItem;

        const pathDescriptor = getPathDescriptorWithAlias(source);

        if (!pathDescriptor) {
            return null;
        }

        const collectionType = getCollectionType(pathDescriptor.absolutePath);

        if (!collectionType) {
            return null;
        }

        const baseFilename = path.basename(pathDescriptor.absolutePath);
        const absoluteDirname = path.dirname(pathDescriptor.absolutePath);
        const relativeDirname = path.relative(normalizeSrcPath(), absoluteDirname);

        return {
            ...pathDescriptor,
            localName,
            collectionType,
            exportName,
            name: relativeDirname
                .split(path.sep)
                .concat(getFileEntityIdentifier(baseFilename))
                .join('/'),
        };
    });
};
