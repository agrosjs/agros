export interface EntityDescriptor {
    localName: string;
    exportName: string;
    relativePath: string;
    filename: string;
    aliasPath?: string;
}

export interface RootPointDescriptor extends EntityDescriptor {
    name: string;
}
