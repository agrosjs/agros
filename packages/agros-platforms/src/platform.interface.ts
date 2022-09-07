import { RouterItem } from '@agros/common/lib/types';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';

export type AddVirtualFile = (pathname: string, content: string) => void;

export interface Platform {
    getLoaderImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDecoratorImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDefaultConfig: () => Record<string, any>;
    getBootstrapCode: (ensuredImportsMap: Record<string, string>, addVirtualFile: AddVirtualFile) => string;
    getComponentFactoryCode: (
        ensuredImportsMap: Record<string, string>,
        filePath: string,
        componentIdentifierName: string,
        lazy: boolean,
    ) => string;
    generateComponent: <T = any>(componentInstance: ComponentInstance, component: any) => Promise<T>;
    createRoutes: (routerItems: RouterItem[], level?: number) => any;
}
