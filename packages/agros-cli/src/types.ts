import { PathDescriptor } from '@agros/config';

export interface EntityDescriptor extends PathDescriptor {
    localName: string;
    exportName: string | 'default';
}

export interface RootPointDescriptor extends EntityDescriptor {
    name: string;
}
