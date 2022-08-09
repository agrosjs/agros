/* eslint-disable @typescript-eslint/no-invalid-this */
import { parse } from 'vue/compiler-sfc';
import qs from 'qs';

export default function(source: string) {
    const ast = parse(source);
    const parsedQuery = qs.parse((this.resourceQuery || '').replace(/^\?/, '')) || {};
    const styleUrls = (parsedQuery.styles as string || '')
        .split(',')
        .filter((styleUrl) => !!styleUrl)
        .map((styleUrl) => decodeURI(styleUrl));
    const styleUrlsImports = styleUrls.map((styleUrl) => `import '${styleUrl}'`);

    if (ast?.descriptor?.script) {
        const lines = source.split(/\r|\n|\r\n/g).map((line, index) => {
            const {
                line: startLine,
                column,
            } = ast.descriptor.script.loc.start;
            if (startLine - 1 === index) {
                return line.slice(0, column - 1) +
                    '\n' +
                    styleUrls.join('\n');
            } else {
                return line;
            }
        });
        return lines.join('\n');
    } else {
        return source + [
            '\n',
            '<script>',
            styleUrlsImports,
            '</script>',
        ].join('\n');
    }
}
