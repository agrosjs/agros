import { detectEOLCharacter } from '../detectors';
import { UpdateItem } from './updaters';

export const applyAddUpdates = (updates: UpdateItem[], code: string): string => {
    if (!code || !Array.isArray(updates) || updates.length === 0) {
        return code;
    }

    const eolCharacter = detectEOLCharacter(code);
    const codeLines = code.split(/\r|\n|\r\n/);
    const mergedCodeBlocks: Array<string[] | UpdateItem> = [];

    mergedCodeBlocks.push(codeLines.slice(0, updates[0].line - 1));
    mergedCodeBlocks.push(updates[0]);

    if (updates.length > 1) {
        for (const [index, update] of updates.entries()) {
            if (index === 0) {
                continue;
            }

            mergedCodeBlocks.push(codeLines.slice(...[updates[index - 1].line - 1, update.line - 1]));
            mergedCodeBlocks.push(update);
        }
    }

    mergedCodeBlocks.push(codeLines.slice(updates[updates.length - 1].line - 1));

    for (const [index, mergedCodeBlock] of mergedCodeBlocks.entries()) {
        if (!Array.isArray(mergedCodeBlock)) {
            const nextLines = mergedCodeBlocks[index + 1];
            if (Array.isArray(nextLines)) {
                nextLines.splice(0, mergedCodeBlock.deleteLines);
            }
        }
    }

    const newCodeLines: string[] = mergedCodeBlocks.reduce((rawResult: string[], block, index) => {
        const result = Array.from(rawResult);
        if (!Array.isArray(block)) {
            let lines = [];
            /**
             * process update lines
             */
            const {
                content = [],
                cutLine,
            } = block as UpdateItem;

            if (cutLine && index > 0) {
                const previousLine = result.pop();
                lines.push(previousLine.slice(0, cutLine.start.column + 1));
                lines = lines.concat(content);
                lines.push(previousLine.slice(cutLine.start.column + 1));
            } else {
                lines = block.content;
            }

            return result.concat(lines);
        } else {
            return result.concat(block);
        }
    }, [] as string[]) as string[];

    return newCodeLines.join(eolCharacter);
};
