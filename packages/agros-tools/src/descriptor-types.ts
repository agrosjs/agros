import { Dirent } from 'fs';
import { CollectionType } from './types';

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    id: string;
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
    modules: EntityDescriptor[];
}

export interface RootPointDescriptor extends EntityDescriptor {
    localName: string;
    exportName: string | 'default';
    name: string;
}
