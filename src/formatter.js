function formatLineSpacing(lineText) {
    let result = '';
    let i = 0;

    while (i < lineText.length) {
        const char = lineText[i];

        if (char === '"' || char === "'" || char === '`') {
            const quote = char;
            const start = i;
            i++;
            while (i < lineText.length && lineText[i] !== quote) {
                if (lineText[i] === '\\') i++;
                i++;
            }
            if (i < lineText.length) i++;
            result += lineText.substring(start, i);
            continue;
        }

        if (char === '#') {
            result += lineText.substring(i);
            break;
        }

        const operators = [
            '//=', '**=', '>>=', '<<=',
            '**', '//', '>>', '<<',
            '&&', '||',
            '==', '!=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '>=', '<=', '=>', '..',
            '++', '--',
            '=', '+', '-', '*', '/', '%', '<', '>', '&', '|', '^', '?'
        ];

        let matchedOp = null;
        for (const op of operators) {
            if (lineText.substring(i, i + op.length) === op) {
                matchedOp = op;
                break;
            }
        }

        if (matchedOp) {
            if (matchedOp === '++' || matchedOp === '--') {
                result += matchedOp;
                i += matchedOp.length;
                continue;
            }

            let isUnary = false;
            if (matchedOp === '-' || matchedOp === '+') {
                const prev = result.trimEnd();
                if (prev === '') {
                    isUnary = true;
                } else {
                    const last = prev[prev.length - 1];
                    if (['=', '+', '-', '*', '/', '%', '<', '>', '&', '|',
                         '^', '?', ':', ',', '(', '[', '{', '!'].includes(last)) {
                        isUnary = true;
                    }
                }
            }

            if (isUnary) {
                const last = result[result.length - 1];
                if (result.length > 0 && last !== ' ' && !['(', '[', '{'].includes(last)) {
                    result += ' ';
                }
                result += matchedOp;
            } else {
                result = result.trimEnd();
                if (result.length > 0) result += ' ';
                result += matchedOp + ' ';
                i += matchedOp.length;
                while (i < lineText.length && (lineText[i] === ' ' || lineText[i] === '\t')) i++;
                continue;
            }

            i += matchedOp.length;
            continue;
        }

        if (char === ',') {
            result = result.trimEnd();
            result += ', ';
            i++;
            while (i < lineText.length && (lineText[i] === ' ' || lineText[i] === '\t')) i++;
            continue;
        }

        result += char;
        i++;
    }

    return result;
}

function formatDocument(document, options) {
    const formattedLines = [];
    const blockStack = [];

    const tabSize       = options ? options.tabSize : 4;
    const indentChar    = options && options.insertSpaces ? ' ' : '\t';
    const indent        = options && options.insertSpaces ? indentChar.repeat(tabSize) : indentChar;

    let braceDepth   = 0;
    let bracketDepth = 0;

    for (let i = 0; i < document.lineCount; i++) {
        const rawText = document.lineAt(i).text;
        const trimmed = rawText.trim();

        if (trimmed === '') {
            formattedLines.push('');
            continue;
        }

        let stripped = trimmed
            .replace(/"(\\.|[^"\\])*"/g, '""')
            .replace(/'(\\.|[^'\\])*'/g, "''")
            .replace(/`(\\.|[^`\\])*`/g, '``');
        const ci = stripped.indexOf('#');
        if (ci !== -1) stripped = stripped.substring(0, ci);
        stripped = stripped.trim();

        const words    = stripped.split(/\s+/);
        const first    = words[0] || '';
        const second   = words[1] || '';

        const openBraces   = (stripped.match(/\{/g) || []).length;
        const closeBraces  = (stripped.match(/\}/g) || []).length;
        const openBrackets  = (stripped.match(/\[/g) || []).length;
        const closeBrackets = (stripped.match(/\]/g) || []).length;
        const netBrace   = openBraces - closeBraces;
        const netBracket = openBrackets - closeBrackets;

        if (netBrace < 0)   braceDepth   = Math.max(0, braceDepth + netBrace);
        if (netBracket < 0) bracketDepth = Math.max(0, bracketDepth + netBracket);

        let isBlockOpener   = false;
        let isBlockCloser   = false;
        let isIntermediate  = false;
        let blockType       = '';
        let isClassScope    = blockStack.length > 0 && blockStack[blockStack.length - 1].isClass;

        if (first !== '') {
            if (first === 'fn' || (first === 'async' && second === 'fn') || stripped.endsWith('fn()') || stripped.endsWith('fn')) {
                isBlockOpener = true;
                blockType = 'fn';
            }

            else if (first === 'async' && second !== 'fn' && isClassScope) {
                isBlockOpener = true;
                blockType = 'method';
            }

            else if (first === 'class') {
                isBlockOpener = true;
                blockType = 'class';
            }

            else if (first === 'for' || first === 'match' || first === 'do') {
                isBlockOpener = true;
                blockType = first;
            }

            else if (first === 'try' && words.length === 1) {
                isBlockOpener = true;
                blockType = 'try';
            }

            else if (first === 'if' && !stripped.includes('?')) {
                isBlockOpener = true;
                blockType = 'if';
            }

            else if (first === 'while') {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'do') {
                    isBlockCloser = true;
                } else {
                    isBlockOpener = true;
                    blockType = 'while';
                }
            }

            else if (first.startsWith('end')) {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'case') {
                    blockStack.pop();
                }
                isBlockCloser = true;
            }

            else if (first === 'else' || first === 'elif' ||
                     first === 'catch' || first === 'finally') {
                isIntermediate = true;
            }

            else if (first === 'case' || first === 'default') {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'case') {
                    blockStack.pop();
                }
                isBlockOpener = true;
                blockType = 'case';
            }

            else if (isClassScope && /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(stripped)) {
                isBlockOpener = true;
                blockType = 'method';
            }
        }

        if (isBlockCloser) {
            blockStack.pop();
        }

        let level = blockStack.length + braceDepth + bracketDepth;
        if (isIntermediate) {
            level = Math.max(0, level - 1);
        }

        const prefix     = indent.repeat(Math.max(0, level));
        const spacedLine = formatLineSpacing(trimmed);
        formattedLines.push(prefix + spacedLine);

        if (isBlockOpener) {
            blockStack.push({ type: blockType, isClass: blockType === 'class' });
        }

        if (netBrace > 0)   braceDepth   += netBrace;
        if (netBracket > 0) bracketDepth += netBracket;
    }

    return formattedLines.join('\n');
}

module.exports = { formatDocument, formatLineSpacing };
