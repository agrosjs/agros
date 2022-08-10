/* eslint-disable @typescript-eslint/no-invalid-this */
import { parse } from 'vue/compiler-sfc';
import qs from 'qs';

export default function(source: string) {
    try {
        const ast = parse(source);
        const parsedQuery = qs.parse((this.resourceQuery || '').replace(/^\?/gi, '')) || {};
        const styleUrls = (parsedQuery.styles as string || '')
            .split(',')
            .filter((styleUrl) => !!styleUrl)
            .map((styleUrl) => decodeURI(styleUrl));
        const styleUrlsImports = styleUrls.map((styleUrl) => `import '${styleUrl}';`);
        let newSource: string;

        if (ast?.descriptor?.script) {
            const lines = source.split(/\r|\n|\r\n/gi).map((line, index) => {
                const {
                    line: startLine,
                    column,
                } = ast.descriptor.script.loc.start;
                if (startLine - 1 === index) {
                    return line.slice(0, column - 1) +
                        '\n' +
                        styleUrlsImports.join('\n');
                } else {
                    return line;
                }
            });
            newSource = lines.join('\n');
        } else {
            newSource = source + [
                '\n',
                '<script>',
                styleUrlsImports,
                '</script>',
            ].join('\n');
        }

        return newSource;
    } catch (e) {
        return source;
    }
}
