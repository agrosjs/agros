import { ImportDeclaration } from '@babel/types';
import * as t from '@babel/types';
import template from '@babel/template';
import {
    EnsureImportOptions,
    EnsureImportResult,
} from './types';

export const ensureImport = (options: EnsureImportOptions): EnsureImportResult => {
    const prefix = 'Agros$$';
    const body = Array.from(options.statements || []);
    let importDeclaration: ImportDeclaration;
    let identifierName: string;
    const importType = options.type || 'named';

    importDeclaration = body.find((statement) => {
        return statement.type === 'ImportDeclaration' && statement.source.value === options.libName;
    }) as ImportDeclaration;

    if (!importDeclaration) {
        identifierName = prefix + options.identifierName;
        switch (importType) {
            case 'named': {
                importDeclaration = template.ast(`import { ${options.identifierName} as ${identifierName} } from '${options.libName}';`) as ImportDeclaration;
                break;
            }
            case 'default': {
                importDeclaration = template.ast(`import ${identifierName} from '${options.libName}';`) as ImportDeclaration;
                break;
            }
            case 'namespace': {
                importDeclaration = template.ast(`import * as ${identifierName} from '${options.libName}';`) as ImportDeclaration;
                break;
            }
            default:
                break;
        }
        body.splice(0, 0, importDeclaration);
    } else {
        for (const specifier of importDeclaration.specifiers) {
            if (specifier.type === 'ImportSpecifier' && importType === 'named' && specifier.local.name === options.identifierName) {
                identifierName = options.identifierName;
            }
            if (
                (specifier.type === 'ImportDefaultSpecifier' && importType === 'default') ||
                (specifier.type === 'ImportNamespaceSpecifier' && importType === 'namespace')
            ) {
                identifierName = specifier.local.name;
            }
        }

        if (!identifierName) {
            identifierName = prefix + options.identifierName;

            switch (importType) {
                case 'default': {
                    importDeclaration.specifiers.unshift(
                        t.importDefaultSpecifier(t.identifier(identifierName)),
                    );
                    break;
                }
                case 'named': {
                    importDeclaration.specifiers.push(
                        t.importSpecifier(
                            t.identifier(identifierName),
                            t.identifier(options.identifierName),
                        ),
                    );
                    break;
                }
                case 'namespace': {
                    body.splice(
                        0,
                        0,
                        template.ast(`import * as ${identifierName} from '${options.libName}';`) as ImportDeclaration,
                    );
                    break;
                }
                default:
                    break;
            }
        }
    }

    return {
        identifierName,
        statements: body,
    };
};
