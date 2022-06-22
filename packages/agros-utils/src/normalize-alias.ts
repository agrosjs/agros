export const normalizeAlias = (aliasKey: string) => {
    if (!aliasKey) {
        return '';
    }

    let result = aliasKey.replace(/\*\*(\/?)/gi, '');

    if (!result.endsWith('/*')) {
        result += '/*';
    }

    return result.replace(/\*/gi, '(.*)');
};
