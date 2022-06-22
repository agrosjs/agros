import {
    PathDescriptor,
    CollectionType,
} from '@agros/config';

export interface EntityDescriptor extends PathDescriptor {
    localName: string;
    exportName: string | 'default';
    collectionType: CollectionType;
}

export interface RootPointDescriptor extends EntityDescriptor {
    name: string;
}
