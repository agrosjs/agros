import { CollectionType } from '@agros/config';
import { Dirent } from 'fs';

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    relativePath: string;
    absolutePath: string;
    aliasPath: string | null;
    filename: string;
}

export interface EntityDescriptor extends PathDescriptor {
    localName: string;
    exportName: string | 'default';
    collectionType: CollectionType;
}

export interface RootPointDescriptor extends EntityDescriptor {
    name: string;
}
