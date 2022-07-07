import {
    detectClassExports,
    detectDecorators,
    getCollectionType,
} from '@agros/common';
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

        const decorators = detectDecorators(tree, 'Module');

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

        const decorators = detectDecorators(tree, 'Injectable');

        if (decorators.length === 0) {
            throw new Error('A service class should call `Injectable` function as decorator');
        } else if (decorators.length > 1) {
            throw new Error('A service should only call `Injectable` function once');
        }
    },
);
