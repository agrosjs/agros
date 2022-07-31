import { RouterItem } from '@agros/common';
import {
    EnsureImportOptions,
    EnsureImportResult,
} from '@agros/utils';
import {
    CommandConfig,
} from './types';

export abstract class AbstractPlatform {
    public getImports(): EnsureImportOptions[] {
        return [];
    }

    public getDefaultConfig() {
        return {};
    }

    public abstract getCommands(): CommandConfig | Promise<CommandConfig>;
    public abstract getBootstrapCode(ensuredImports: EnsureImportResult[]): string;
    public abstract getRoutes<T>(routerItems: RouterItem[], ...args: any): T[];
}
