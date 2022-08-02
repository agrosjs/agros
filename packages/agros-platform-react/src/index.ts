import { AbstractPlatform } from '@agros/platforms';
import { EnsureImportOptions, EnsureImportResult } from '@agros/utils';

export default class PlatformReact extends AbstractPlatform implements AbstractPlatform {
    public getImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform/react/lib/react--outer',
                identifierName: 'Routes',
            },
            {
                libName: '@agros/platform/react/lib/react--outer',
                identifierName: 'Route',
            },
            {
                libName: '@agros/platform/react/lib/react--outer',
                identifierName: 'BrowserRouter',
            },
            {
                libName: '@agros/app/lib/factory',
                identifierName: 'Factory',
            },
            {
                libName: '@agros/platform-react/lib/react',
                identifierName: 'useEffect',
            },
            {
                libName: '@agros/platform-react/lib/react',
                identifierName: 'useState',
            },
            {
                libName: '@agros/platform-react/lib/react',
                identifierName: 'createElement',
            },
            {
                libName: '@agros/platform-react',
                identifierName: 'render',
            },
            {
                libName: '@agros/platform-react/lib/react',
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
