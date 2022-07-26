import {
    Identifier,
    ImportDeclaration,
    Statement,
} from '@babel/types';
import template from '@babel/template';

export interface EnsureImportOptions {
    statements: Statement[];
    libName: string;
    identifierName: string;
}

export interface EnsureImportResult {
    statements: Statement[];
    identifierName: string;
}

export const ensureImport = (options: EnsureImportOptions): EnsureImportResult => {
    const prefix = 'Agros$$';
    const body = Array.from(options.statements || []);
    let importDeclaration: ImportDeclaration;
    let identifierName: string;

    importDeclaration = body.find((statement) => {
        return statement.type === 'ImportDeclaration' && statement.source.value === options.libName;
    }) as ImportDeclaration;

    if (!importDeclaration) {
        identifierName = prefix + options.identifierName;
        importDeclaration = template.ast(`import { ${options.identifierName} as ${identifierName} } from '${options.libName}';`) as ImportDeclaration;
        body.splice(0, 0, importDeclaration);
    } else {
        for (const specifier of importDeclaration.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
                identifierName = `${specifier.local.name}.${options.identifierName}`;
            } else if ((specifier.imported as Identifier).name === options.identifierName) {
                identifierName = (specifier.local as Identifier).name;
            }
        }

        if (!identifierName) {
            identifierName = prefix + options.identifierName;
            importDeclaration.specifiers.push({
                type: 'ImportSpecifier',
                imported: {
                    type: 'Identifier',
                    name: options.identifierName,
                },
                local: {
                    type: 'Identifier',
                    name: identifierName,
                },
            });
        }
    }

    return {
        identifierName,
        statements: body,
    };
};
