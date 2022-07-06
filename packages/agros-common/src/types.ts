import { CollectionType } from '@agros/config';
import { Dirent } from 'fs';

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    relativePath: string;
    absolutePath: string;
    aliasPath: string;
    filename: string;
}

export interface CollectionDescriptor extends PathDescriptor {
    collectionType: CollectionType;
}

export interface EntityDescriptor extends CollectionDescriptor {
    entityName: string;
    moduleName: string;
}

export interface RootPointDescriptor extends CollectionDescriptor {
    localName: string;
    exportName: string | 'default';
    name: string;
}
