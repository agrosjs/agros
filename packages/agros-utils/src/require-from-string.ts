import Module from 'module';
import * as path from 'path';

export interface RequireFromStringOptions {
    /**
     * List of `paths`, that will be appended to module `paths`.
     * Useful when you want to be able require modules from these paths.
     */
    appendPaths?: string[] | undefined;
    /**
     * List of `paths`, that will be preppended to module `paths`.
     * Useful when you want to be able require modules from these paths.
     */
    prependPaths?: string[] | undefined;
}

function requireFromString(code: string, options?: RequireFromStringOptions): any;
function requireFromString(code: string, filename?: string, options?: RequireFromStringOptions): any;
function requireFromString(code: string, filename?: string | RequireFromStringOptions, options?: RequireFromStringOptions): any {
    let requireFilename: string;
    let requireOptions: RequireFromStringOptions;
    if (typeof filename === 'object') {
        requireOptions = requireFilename as RequireFromStringOptions;
    }
    requireFilename = requireFilename || '';
    requireOptions = requireOptions || {};
    requireOptions.appendPaths = requireOptions.appendPaths || [];
    requireOptions.prependPaths = requireOptions.prependPaths || [];

    if (typeof code !== 'string') {
        throw new Error('code must be a string, not ' + typeof code);
    }

    // @ts-ignore
    const paths = Module._nodeModulePaths(path.dirname(requireFilename));
    const parent = module.parent;
    let exportedModule = new Module(requireFilename, parent);
    exportedModule.filename = requireFilename;
    exportedModule.paths = []
        .concat(requireOptions.prependPaths)
        .concat(paths)
        .concat(requireOptions.appendPaths);
    // @ts-ignore
    exportedModule._compile(code, filename);
    const exports = exportedModule.exports;

    if (parent?.children) {
        parent.children.splice(parent.children.indexOf(exportedModule), 1);
    }

    return exports;
}

export { requireFromString };
