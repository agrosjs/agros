import { parseAST } from '@agros/utils/lib/parse-ast';
import generate from '@babel/generator';
import * as t from '@babel/types';
import {
    lintCode,
    lintWithPrettier,
} from './linters';

export const generateDecoratorCode = async (ast: t.Node): Promise<string> => {
    const CLASS_PLACEHOLDER = 'class AgrosPlaceholder {}';
    const rawCode = generate(ast).code + '\n' + CLASS_PLACEHOLDER;
    const codeLines = (await lintCode(rawCode)).split(/\r|\n|\r\n/);
    return codeLines.slice(0, codeLines.indexOf(CLASS_PLACEHOLDER)).join('\n');
};

export const generateConstructorCode = async (ast: t.Node): Promise<string> => {
    const prePlaceholders = ['class Test {'];
    const postPlaceholders = ['}'];
    const code = []
        .concat(prePlaceholders)
        .concat(generate(ast).code)
        .concat(postPlaceholders)
        .join('\n');
    const lintedCode = await lintCode(code, {
        prePlugins: [lintWithPrettier],
    });
    const lintedCodeLines = lintedCode.split(/\r|\n|\r\n/);
    const lintedCodeAST = parseAST(lintedCode);
    const classBody = (lintedCodeAST.program.body.find((statement) => {
        return statement.type === 'ClassDeclaration';
    }) as t.ClassDeclaration)?.body?.body || [];
    const constructorSegment = classBody.find((statement) => statement.type === 'ClassMethod' && statement.kind === 'constructor');
    const sliceIndexes = [1, -1];

    if (constructorSegment) {
        sliceIndexes[0] = (constructorSegment.loc?.start.line || sliceIndexes[0] + 1) - 1;
        sliceIndexes[1] = constructorSegment.loc?.end.line || sliceIndexes[1];
    }

    return lintedCodeLines.slice(...sliceIndexes).join('\n');
};
