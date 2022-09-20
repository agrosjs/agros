import * as t from '@babel/types';
import * as path from 'path';
import { createLoaderAOP } from '../utils';
import {
    detectExports,
    detectDecorators,
} from '@agros/tools/lib/detectors';
import {
    getCollectionType,
    getFileEntityIdentifier,
} from '@agros/tools/lib/utils';

export const checkModule = createLoaderAOP<null>(
    async ({
        tree,
        context,
        modulesPath,
    }) => {
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');
        const moduleName = getFileEntityIdentifier(context.resourcePath);
        const dirname = path.basename(path.dirname(context.resourcePath));

        if (path.dirname(context.resourcePath).startsWith(modulesPath) && moduleName !== dirname) {
            throw new Error(`Module file '${path.basename(context.resourcePath)}' should match its directory name '${dirname}'`);
        }

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

        return null;
    },
    async ({ context }) => getCollectionType(context.resourcePath) === 'module',
);
