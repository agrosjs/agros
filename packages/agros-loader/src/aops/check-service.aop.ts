import * as t from '@babel/types';
import { createLoaderAOP } from '../utils';
import {
    detectExports,
    detectDecorators,
    getCollectionType,
} from '@agros/common';

export const checkService = createLoaderAOP<null>(
    ({ tree }) => {
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');

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

        return null;
    },
    ({ context }) => getCollectionType(context.resourcePath) === 'service',
);
