import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';

export type AddVirtualFile = (pathname: string, content: string) => void;

export interface GetComponentFactoryCodeData {
    ensuredImportsMap: Record<string, string>;
    filePath: string;
    componentIdentifierName: string;
    lazy: boolean;
    componentUuid: string;
    addVirtualFile: AddVirtualFile;
}

export interface Platform {
    getLoaderImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDecoratorImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getBootstrapCode: (ensuredImportsMap: Record<string, string>, addVirtualFile: AddVirtualFile) => string;
    getComponentFactoryCode: (data: GetComponentFactoryCodeData) => string;
    getDefaultConfig?: () => Record<string, any>;
    generateComponent?: <T = any>(componentInstance: ComponentInstance, component: any) => Promise<T>;
}
