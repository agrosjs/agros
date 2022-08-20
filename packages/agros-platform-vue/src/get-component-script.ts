import { ComponentScript } from '@agros/utils/lib/platform-loader';
import { parse } from 'vue/compiler-sfc';

export const getComponentScript = (source: string): ComponentScript => {
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
};
