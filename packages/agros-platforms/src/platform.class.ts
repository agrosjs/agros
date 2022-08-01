import { RouterItem } from '@agros/common';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import {
    EnsureImportOptions,
    EnsureImportResult,
} from '@agros/utils';
import {
    CommandConfig,
} from './types';

export abstract class AbstractPlatform {
    public getImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [];
    }

    public getDefaultConfig() {
        return {};
    }

    public abstract getCommands(): CommandConfig | Promise<CommandConfig>;
    public abstract getBootstrapCode(ensuredImports: EnsureImportResult[]): string;
    public abstract getRoutes<T>(routerItems: RouterItem[], ...args: any): T[];
    public abstract generateReactComponent<T = any>(componentInstance: ComponentInstance): T;
}
