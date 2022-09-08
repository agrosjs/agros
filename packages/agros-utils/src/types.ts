export interface CodeLocation {
    start: number;
    end: number;
}

export interface ComponentScript {
    content: string;
    location?: CodeLocation;
}

export interface BundlessPlatform {
    getComponentScript?: (source: string) => ComponentScript;
}
