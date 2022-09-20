import { ComponentInstance } from './component-instance.class';
import { EnsureImportOptions } from './ensure-import';

export type AddVirtualFile = (pathname: string, content: string) => void;

export interface GetComponentFactoryCodeData {
    ensuredImportsMap: Record<string, string>;
    filePath: string;
    componentIdentifierName: string;
    lazy: boolean;
    componentUuid: string;
    absoluteFilePath: string;
    factoryPath: string;
    addVirtualFile: AddVirtualFile;
}

export interface FactoryCode {
    code: string;
    modifier?: (data: string) => string;
}

export interface EntryTailCodeData {
    bootstrapReturnValueIdentifier: string;
}

export interface Platform {
    getLoaderImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getDecoratorImports: () => Omit<EnsureImportOptions, 'statements'>[];
    getBootstrapCode: (ensuredImportsMap: Record<string, string>, addVirtualFile: AddVirtualFile) => string;
    getComponentFactoryCode: (data: GetComponentFactoryCodeData) => string | FactoryCode;
    getDefaultConfig?: () => Record<string, any>;
    generateComponent?: <T = any>(componentInstance: ComponentInstance, component: any) => Promise<T>;
    getEntryTailCode?: (data: EntryTailCodeData) => string[];
}
