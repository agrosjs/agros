import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';

export interface FactoryCodeConfig {
    importCodeLines?: string[];
    factoryCode?: string;
}

export interface Platform {
    getLoaderImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDecoratorImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDefaultConfig: () => Record<string, any>;
    getBootstrapCode: (ensuredImportsMap: Record<string, string>) => string;
    getComponentFactoryCode: (
        ensuredImportsMap: Record<string, string>,
        filePath: string,
        lazy: boolean,
    ) => FactoryCodeConfig;
    generateComponent: <T = any>(componentInstance: ComponentInstance, component: any) => Promise<T>;
}
