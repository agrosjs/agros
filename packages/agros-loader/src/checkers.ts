import {
    detectClassExports,
    detectNamedImports,
    getCollectionType,
} from '@agros/common';
import {
    CallExpression,
    Identifier,
} from '@babel/types';
import {
    LoaderChecker,
    LoaderCheckerConfig,
    LoaderGuard,
} from './types';

const createChecker = (guard: LoaderGuard, checker: LoaderChecker): LoaderCheckerConfig => {
    return {
        guard,
        checker,
    };
};

export const checkModule = createChecker(
    ({ context }) => getCollectionType(context.resourcePath) === 'module',
    ({ tree }) => {
        const declaredClasses = detectClassExports(tree);

        if (declaredClasses.length > 1) {
            throw new Error('Module files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A module file should have one named class export');
        }

        const [moduleClass] = declaredClasses;
        const decoratorImports = detectNamedImports(
            tree,
            'Module',
            (source) => source.indexOf('@agros/app') !== -1,
        );
        const decorators = (moduleClass.declaration?.decorators || []).filter((decorator) => {
            return decorator.expression.type === 'CallExpression' &&
                decorator.expression.callee.type === 'Identifier' &&
                decoratorImports.some((specifier) => {
                    return specifier.local.name === ((decorator.expression as CallExpression).callee as Identifier).name;
                });
        });

        if (decorators.length === 0) {
            throw new Error('A module class should call `Module` function as decorator');
        } else if (decorators.length > 1) {
            throw new Error('A module should only call `Module` function once');
        }
    },
);

export const checkService = createChecker(
    ({ context }) => getCollectionType(context.resourcePath) === 'service',
    ({ tree }) => {
        const declaredClasses = detectClassExports(tree);

        if (declaredClasses.length > 1) {
            throw new Error('Service files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A service file should have one named class export');
        }

        const [serviceClass] = declaredClasses;
        const decoratorImports = detectNamedImports(
            tree,
            'Injectable',
            (source) => source.indexOf('@agros/app') !== -1,
        );
        const decorators = (serviceClass.declaration?.decorators || []).filter((decorator) => {
            return decorator.expression.type === 'CallExpression' &&
                decorator.expression.callee.type === 'Identifier' &&
                decoratorImports.some((specifier) => {
                    return specifier.local.name === ((decorator.expression as CallExpression).callee as Identifier).name;
                });
        });

        if (decorators.length === 0) {
            throw new Error('A service class should call `Injectable` function as decorator');
        } else if (decorators.length > 1) {
            throw new Error('A service should only call `Injectable` function once');
        }
    },
);
