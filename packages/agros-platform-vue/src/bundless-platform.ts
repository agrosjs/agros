import { BundlessPlatform } from '@agros/tools/lib/types';
import { parse } from 'vue/compiler-sfc';

const bundlessPlatform: BundlessPlatform = {
    getComponentScript(source: string) {
        const ast = parse(source);
        const content = ast?.descriptor?.script?.content;
        const start = ast?.descriptor?.script?.loc?.start?.offset;
        const end = ast?.descriptor?.script?.loc?.end.offset;

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
