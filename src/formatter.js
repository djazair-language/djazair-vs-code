function formatLineSpacing(lineText, initialState = null, returnObject = false) {
    let result = '';
    let i = 0;
    let quote = initialState;

    while (i < lineText.length) {
        if (quote) {
            while (i < lineText.length && lineText[i] !== quote) {
                if (lineText[i] === '\\') {
                    result += lineText[i]; i++;
                    if (i < lineText.length) { result += lineText[i]; i++; }
                } else {
                    result += lineText[i]; i++;
                }
            }
            if (i < lineText.length && lineText[i] === quote) {
                result += lineText[i]; i++;
                quote = null;
            }
            continue;
        }

        const char = lineText[i];

        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            result += char; i++;
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

    const res = quote ? result : result.trimEnd();
    return returnObject ? { text: res, state: quote } : res;
}

function formatDocument(document, options) {
    const formattedLines = [];
    const blockStack = [];

    const tabSize       = options ? options.tabSize : 4;
    const indentChar    = options && options.insertSpaces ? ' ' : '\t';
    const indent        = options && options.insertSpaces ? indentChar.repeat(tabSize) : indentChar;

    let braceDepth   = 0;
    let bracketDepth = 0;
    let inStringQuote = null;

    for (let i = 0; i < document.lineCount; i++) {
        const rawText = document.lineAt(i).text;
        const startInString = inStringQuote;

        let stripped = '';
        let j = 0;
        let tempQuote = inStringQuote;
        
        while (j < rawText.length) {
            const char = rawText[j];
            if (tempQuote) {
                if (char === '\\') {
                    j += 2;
                } else {
                    if (char === tempQuote) tempQuote = null;
                    j++;
                }
            } else {
                if (char === '"' || char === "'" || char === '`') {
                    tempQuote = char;
                    stripped += '""';
                    j++;
                } else if (char === '#') {
                    break;
                } else {
                    stripped += char;
                    j++;
                }
            }
        }

        let trimmed = rawText.trim();
        if (startInString) {
            trimmed = rawText;
            if (!tempQuote) trimmed = trimmed.trimEnd();
        } else if (tempQuote) {
            trimmed = trimmed.trimStart();
        }

        if (trimmed === '' && !startInString) {
            formattedLines.push('');
            continue;
        }

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
            if (first === 'fn' || (first === 'async' && second === 'fn')) {
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

            else if (/^end\b/.test(first)) {
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

            else if (/\bfn\b\s*\(/.test(stripped) && !stripped.includes('=>') && !/\bend\b/.test(stripped) && !/^end\b/.test(first)) {
                isBlockOpener = true;
                blockType = 'fn';
            }
        }

        if (isBlockOpener && /\bend\b/.test(stripped)) {
            isBlockOpener = false;
        }

        if (isBlockCloser) {
            blockStack.pop();
        }

        let level = blockStack.length + braceDepth + bracketDepth;
        if (isIntermediate) {
            level = Math.max(0, level - 1);
        }

        const prefix     = startInString ? '' : indent.repeat(Math.max(0, level));
        const { text: spacedLine, state: nextQuote } = formatLineSpacing(trimmed, inStringQuote, true);
        formattedLines.push(prefix + spacedLine);
        
        inStringQuote = nextQuote;

        if (isBlockOpener) {
            blockStack.push({ type: blockType, isClass: blockType === 'class' });
        }

        if (netBrace > 0)   braceDepth   += netBrace;
        if (netBracket > 0) bracketDepth += netBracket;
    }

    return formattedLines.join('\n');
}

module.exports = { formatDocument, formatLineSpacing };
