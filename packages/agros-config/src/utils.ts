import _ from 'lodash';
import { cosmiconfigSync } from 'cosmiconfig';

export const getCosmiConfig = (moduleName: string) => {
    const explorer = cosmiconfigSync(moduleName);
    const searchResult = explorer.search();
    const config = _.get(searchResult, 'config') || {};
    return config;
};
