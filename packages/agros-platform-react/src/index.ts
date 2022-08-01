import { AbstractPlatform } from '@agros/platforms';
import { EnsureImportOptions, EnsureImportResult } from '@agros/utils';

export default class PlatformReact extends AbstractPlatform implements AbstractPlatform {
    public getImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/app/lib/router',
                identifierName: 'Routes',
            },
            {
                libName: '@agros/app/lib/router',
                identifierName: 'Route',
            },
            {
                libName: '@agros/app/lib/router',
                identifierName: 'BrowserRouter',
            },
            {
                libName: '@agros/app/lib/factory',
                identifierName: 'Factory',
            },
            {
                libName: '@agros/app',
                identifierName: 'useEffect',
            },
            {
                libName: '@agros/app',
                identifierName: 'useState',
            },
            {
                libName: '@agros/app',
                identifierName: 'createElement',
            },
            {
                libName: '@agros/app',
                identifierName: 'render',
            },
            {
                libName: '@agros/app',
                identifierName: 'Suspense',
            },
        ];
    }

    public getCommands() {
        return {
            start: () => {},
            build: () => {},
            test: () => {},
        };
    }

    public getBootstrapCode(ensuredImports: EnsureImportResult[]): string {}
}
