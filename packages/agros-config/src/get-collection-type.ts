import {
    CollectionType,
    ProjectConfigParser,
} from './project-config-parser';

const projectConfigParser = new ProjectConfigParser();

export const getCollectionType = (pathname: string): CollectionType => {
    const collectionMap = projectConfigParser.getConfig('collection');
    for (const collectionType of Object.keys(collectionMap)) {
        for (const filenamePattern of collectionMap[collectionType]) {
            if (new RegExp(`${filenamePattern.replace('*', '(.*)')}$`).exec(pathname).length > 1) {
                return collectionType as CollectionType;
            }
        }
    }
    return null;
};
