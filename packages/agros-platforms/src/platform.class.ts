import {
    Factory,
    RouterItem,
} from '@agros/common';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { EnsureImportOptions } from '@agros/utils';

export abstract class AbstractPlatform {
    public getImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [];
    }

    public getDefaultConfig() {
        return {};
    }

    public abstract runCommand(command: string): void;
    public abstract getBootstrapCode(ensuredImportsMap: Record<string, string>): string;
    public abstract getRoutes<T>(routerItems: RouterItem[], ...args: any): T[];
    public abstract generateComponent<T = any>(componentInstance: ComponentInstance, context: Factory): T;
}
