import { detectEOLCharacter } from './detectors';
import { UpdateItem } from './updaters';

export const applyUpdates = (updates: UpdateItem[], code: string): string => {
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

    const newCodeLines: string[] = mergedCodeBlocks.reduce((result: string[], block) => {
        if (!Array.isArray(block)) {
            return result.concat(block.content);
        } else {
            return result.concat(block);
        }
    }, [] as string[]) as string[];

    return newCodeLines.join(eolCharacter);
};
