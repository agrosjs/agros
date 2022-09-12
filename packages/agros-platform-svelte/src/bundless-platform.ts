import { BundlessPlatform } from '@agros/utils/lib/types';
import { compile } from 'svelte/compiler';

const bundlessPlatform: BundlessPlatform = {
    getComponentScript(source: string) {
        const ast = compile(source);
        const start = (ast?.ast?.instance?.content as any)?.start || 0;
        const end = (ast?.ast?.instance?.content as any)?.end || source.length;
        const content = source.slice(start, end);

        if (typeof start !== 'number' || typeof end !== 'number') {
            return {
                content,
            };
        }

        return {
            content,
            location: {
                start,
                end,
            },
        };
    },
};

export default bundlessPlatform;
