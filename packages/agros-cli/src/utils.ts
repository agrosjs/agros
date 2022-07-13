import { CLIConfigParser } from '@agros/config';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Collection } from '@agros/common';
import _ from 'lodash';

export const getCollections = () => {
    try {
        const cliConfigParser = new CLIConfigParser();
        const collectionPackageName = cliConfigParser.getConfig<string>('collection');
        let collectionIndexFilePath: string;

        try {
            collectionIndexFilePath = require.resolve(collectionPackageName);
        } catch (e) {
            collectionIndexFilePath = require.resolve(collectionPackageName);
        }

        if (!collectionIndexFilePath) {
            return [];
        }

        const collectionsDir = path.resolve(path.dirname(collectionIndexFilePath), './collections');
        let collectionExports = require(collectionIndexFilePath);
        collectionExports = collectionExports?.default || collectionExports;

        if (!collectionExports || !_.isObjectLike(collectionExports)) {
            return [];
        }

        collectionExports = Object.keys(collectionExports).reduce((result, key) => {
            result[_.kebabCase(key)] = collectionExports[key];
            return result;
        }, {});

        const collections: Collection[] = fs.readdirSync(collectionsDir)
            .filter((entity) => {
                const absolutePath = path.resolve(collectionsDir, entity);
                return fs.statSync(absolutePath).isDirectory() &&
                    fs.existsSync(path.resolve(absolutePath, 'schema.json'));
            })
            .map((dirname) => {
                try {
                    const name = _.kebabCase(dirname);
                    return {
                        name,
                        schema: fs.readJsonSync(path.resolve(collectionsDir, dirname, 'schema.json')),
                        FactoryClass: collectionExports[name],
                    } as Collection;
                } catch (e) {
                    return null;
                }
            })
            .filter((collection) => !!collection && !!collection.FactoryClass);

        return collections;
    } catch (e) {
        return [];
    }
};
