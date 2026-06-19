const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

let diagnosticCollection;

// ─────────────────────────────────────────────────────────────────
// FORMATTER — Operator / comma spacing (respects strings & comments)
// ─────────────────────────────────────────────────────────────────
function formatLineSpacing(lineText) {
    let result = '';
    let i = 0;

    while (i < lineText.length) {
        const char = lineText[i];

        // ── Quoted strings: copy verbatim ──────────────────────
        if (char === '"' || char === "'" || char === '`') {
            const quote = char;
            const start = i;
            i++;
            while (i < lineText.length && lineText[i] !== quote) {
                if (lineText[i] === '\\') i++; // skip escape
                i++;
            }
            if (i < lineText.length) i++; // closing quote
            result += lineText.substring(start, i);
            continue;
        }

        // ── Comments: copy rest verbatim ────────────────────────
        if (char === '#') {
            result += lineText.substring(i);
            break;
        }

        // ── Operators: add spaces around them ──────────────────
        const operators = [
            '//=', '**=', '>>=', '<<=',
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
            // ++ / -- never get surrounding spaces
            if (matchedOp === '++' || matchedOp === '--') {
                result += matchedOp;
                i += matchedOp.length;
                continue;
            }

            // Detect unary - or +
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
                // Only add a space before if previous char isn't already a space / open bracket
                const last = result[result.length - 1];
                if (result.length > 0 && last !== ' ' && !['(', '[', '{'].includes(last)) {
                    result += ' ';
                }
                result += matchedOp;
            } else {
                // Binary operator: trim trailing space, add " op "
                result = result.trimEnd();
                if (result.length > 0) result += ' ';
                result += matchedOp + ' ';
                i += matchedOp.length;
                // skip leading whitespace after operator
                while (i < lineText.length && (lineText[i] === ' ' || lineText[i] === '\t')) i++;
                continue;
            }

            i += matchedOp.length;
            continue;
        }

        // ── Comma: always ", " ─────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// FORMATTER — Indentation engine (stack-based, handles all constructs)
// ─────────────────────────────────────────────────────────────────
function formatDocument(document, options) {
    const formattedLines = [];
    // blockStack entries: { type: string, isClass: bool }
    const blockStack = [];

    const tabSize       = options ? options.tabSize : 4;
    const indentChar    = options && options.insertSpaces ? ' ' : '\t';
    const indent        = options && options.insertSpaces ? indentChar.repeat(tabSize) : indentChar;

    // Extra depth for multiline map {} / array []
    let braceDepth   = 0;
    let bracketDepth = 0;

    for (let i = 0; i < document.lineCount; i++) {
        const rawText = document.lineAt(i).text;
        const trimmed = rawText.trim();

        if (trimmed === '') {
            formattedLines.push('');
            continue;
        }

        // Strip strings and backtick strings, then comments, for safe keyword detection
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

        // ── Brace / bracket depth tracking for multiline maps & arrays ──
        const openBraces   = (stripped.match(/\{/g) || []).length;
        const closeBraces  = (stripped.match(/\}/g) || []).length;
        const openBrackets  = (stripped.match(/\[/g) || []).length;
        const closeBrackets = (stripped.match(/\]/g) || []).length;
        const netBrace   = openBraces - closeBraces;
        const netBracket = openBrackets - closeBrackets;

        // Closing-heavy line → dedent BEFORE printing
        if (netBrace < 0)   braceDepth   = Math.max(0, braceDepth + netBrace);
        if (netBracket < 0) bracketDepth = Math.max(0, bracketDepth + netBracket);

        // ── Classify the line ────────────────────────────────────
        let isBlockOpener   = false;
        let isBlockCloser   = false;
        let isIntermediate  = false;
        let blockType       = '';
        let isClassScope    = blockStack.length > 0 && blockStack[blockStack.length - 1].isClass;

        if (first !== '') {
            // ── fn / async fn ────────────────────────────────────
            if (first === 'fn' || (first === 'async' && second === 'fn')) {
                isBlockOpener = true;
                blockType = 'fn';
            }

            // ── async fn inside class body (method declared as: async methodName()) ──
            // Djazair class methods are: `methodName(args) ... end`
            // Async methods look like: `async methodName(...)` without `fn`
            else if (first === 'async' && second !== 'fn' && isClassScope) {
                // async methodName(...) — class async method
                isBlockOpener = true;
                blockType = 'method';
            }

            // ── class ─────────────────────────────────────────────
            else if (first === 'class') {
                isBlockOpener = true;
                blockType = 'class';
            }

            // ── for / match / do ──────────────────────────────────
            else if (first === 'for' || first === 'match' || first === 'do') {
                isBlockOpener = true;
                blockType = first;
            }

            // ── try (standalone) ──────────────────────────────────
            else if (first === 'try' && words.length === 1) {
                isBlockOpener = true;
                blockType = 'try';
            }

            // ── if (not ternary) ─────────────────────────────────
            else if (first === 'if' && !stripped.includes('?')) {
                isBlockOpener = true;
                blockType = 'if';
            }

            // ── while: closes do OR opens while loop ─────────────
            else if (first === 'while') {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'do') {
                    isBlockCloser = true;
                } else {
                    isBlockOpener = true;
                    blockType = 'while';
                }
            }

            // ── end ───────────────────────────────────────────────
            // If there's an open case block, pop it first, then pop
            // the surrounding match/fn/class/etc. block.
            else if (first === 'end') {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'case') {
                    blockStack.pop();   // close last case
                }
                isBlockCloser = true;
            }

            // ── else / elif / catch / finally ─────────────────────
            else if (first === 'else' || first === 'elif' ||
                     first === 'catch' || first === 'finally') {
                isIntermediate = true;
            }

            // ── case / default inside match ───────────────────────
            // Pop previous case block (if any), then open a new one.
            // This makes the label sit at match-body level and the
            // statements inside sit one level deeper.
            else if (first === 'case' || first === 'default') {
                const top = blockStack[blockStack.length - 1];
                if (top && top.type === 'case') {
                    blockStack.pop();   // close previous case
                }
                isBlockOpener = true;
                blockType = 'case';
            }

            // ── Class method: bare `identifier(` at class scope ───
            // Covers: `init(...)`, `speak()`, `display()`, etc.
            else if (isClassScope && /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(stripped)) {
                isBlockOpener = true;
                blockType = 'method';
            }
        }

        // ── Pop stack BEFORE computing indent (closer/intermediate) ──
        if (isBlockCloser) {
            blockStack.pop();
        }

        // ── Compute final indent level ────────────────────────────
        let level = blockStack.length + braceDepth + bracketDepth;
        if (isIntermediate) {
            level = Math.max(0, level - 1);
        }

        // ── Emit formatted line ───────────────────────────────────
        const prefix     = indent.repeat(Math.max(0, level));
        const spacedLine = formatLineSpacing(trimmed);
        formattedLines.push(prefix + spacedLine);

        // ── Push opener AFTER emitting it ────────────────────────
        if (isBlockOpener) {
            blockStack.push({ type: blockType, isClass: blockType === 'class' });
        }

        // ── Update brace/bracket depth for open-heavy lines ──────
        if (netBrace > 0)   braceDepth   += netBrace;
        if (netBracket > 0) bracketDepth += netBracket;
    }

    return formattedLines.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// COMPILER PATH RESOLVER
// ─────────────────────────────────────────────────────────────────
function getCompilerPath() {
    let compilerPath = vscode.workspace.getConfiguration('djazair').get('compilerPath') || 'djazair';

    if (compilerPath === 'djazair') {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath   = workspaceFolders[0].uri.fsPath;
            const parentPath = path.dirname(rootPath);
            const candidates = [
                path.join(parentPath, 'djazair-language', 'build', 'bin', 'djazair.exe'),
                path.join(parentPath, 'djazair-language', 'build', 'bin', 'djazair'),
                path.join(rootPath,   'build', 'bin', 'djazair.exe'),
                path.join(rootPath,   'build', 'bin', 'djazair')
            ];
            for (const p of candidates) {
                if (fs.existsSync(p)) { compilerPath = p; break; }
            }
        }
    }
    return compilerPath;
}

// ─────────────────────────────────────────────────────────────────
// LINTER — Runs `djazair --check <file>` on save / open
// ─────────────────────────────────────────────────────────────────
function runLinter(document) {
    if (document.languageId !== 'djazair') return;

    const compilerPath = getCompilerPath();
    const filePath     = document.uri.fsPath;

    cp.execFile(compilerPath, ['--check', filePath], (error, stdout, stderr) => {
        const diagnostics = [];
        diagnosticCollection.set(document.uri, []);

        const output = (stdout + '\n' + stderr).trim();
        if (!output) return;

        const errorMatch    = output.match(/\[Djazair Error\]\s*(.*)/);
        const fileLineMatch = output.match(/at\s+(.*?):(\d+)/);

        if (errorMatch && fileLineMatch) {
            const errorMessage = errorMatch[1].trim();
            const lineNum      = parseInt(fileLineMatch[2], 10) - 1;

            if (lineNum < 0 || lineNum >= document.lineCount) return;

            let startChar = 0, endChar = 0;

            const lines = output.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('|') && i + 1 < lines.length && lines[i + 1].includes('^')) {
                    const caretLine  = lines[i + 1];
                    const pipeIndex  = caretLine.indexOf('|');
                    if (pipeIndex !== -1) {
                        const caretPart = caretLine.substring(pipeIndex + 1);
                        startChar = caretPart.search(/\^/);
                        const lastCaret = caretPart.lastIndexOf('^');
                        endChar = lastCaret !== -1 ? lastCaret + 1 : startChar + 1;
                    }
                    break;
                }
            }

            if (endChar <= startChar) {
                const lineText = document.lineAt(lineNum).text;
                startChar = lineText.search(/\S/);
                if (startChar === -1) startChar = 0;
                endChar = lineText.length;
            }

            const range      = new vscode.Range(lineNum, startChar, lineNum, endChar);
            const diagnostic = new vscode.Diagnostic(range, errorMessage, vscode.DiagnosticSeverity.Error);
            diagnostic.source = 'Djazair Compiler';
            diagnostics.push(diagnostic);
        }

        diagnosticCollection.set(document.uri, diagnostics);
    });
}

// ─────────────────────────────────────────────────────────────────
// DOCUMENTATION / HOVER PROVIDER
// ─────────────────────────────────────────────────────────────────

const DJAZAIR_DOCS = {
    // Global Functions
    'print': { sig: 'print(value, ...)', desc: 'Prints the given values to the standard output.' },
    'input': { sig: 'input(prompt)', desc: 'Reads a line of input from the user with an optional prompt string.' },
    'type': { sig: 'type(value)', desc: 'Returns a string representing the type of the value.' },
    'str': { sig: 'str(value)', desc: 'Converts a value to its string representation.' },
    'int': { sig: 'int(value)', desc: 'Converts a value to an integer.' },
    'num': { sig: 'num(value)', desc: 'Converts a value to a number.' },
    'float': { sig: 'float(value)', desc: 'Converts a value to a floating-point number.' },
    'bool': { sig: 'bool(value)', desc: 'Converts a value to a boolean.' },
    'isNull': { sig: 'isNull(value)', desc: 'Returns true if the value is null.' },
    'isString': { sig: 'isString(value)', desc: 'Returns true if the value is a string.' },
    'isNumber': { sig: 'isNumber(value)', desc: 'Returns true if the value is a number.' },
    'isBool': { sig: 'isBool(value)', desc: 'Returns true if the value is a boolean.' },
    'isArray': { sig: 'isArray(value)', desc: 'Returns true if the value is an array.' },
    'isMap': { sig: 'isMap(value)', desc: 'Returns true if the value is a map/dictionary.' },
    'isFunction': { sig: 'isFunction(value)', desc: 'Returns true if the value is a function.' },
    'isClass': { sig: 'isClass(value)', desc: 'Returns true if the value is a class.' },
    'isInstance': { sig: 'isInstance(value, class)', desc: 'Returns true if the value is an instance of the class.' },
    'chr': { sig: 'chr(value)', desc: 'Returns the character representing the given Unicode code point.' },
    'ord': { sig: 'ord(char)', desc: 'Returns the Unicode code point for the given character.' },
    'exit': { sig: 'exit(code)', desc: 'Exits the program with the given status code.' },
    'has': { sig: 'has(obj, key)', desc: 'Checks if an object or map has the specified key/property.' },
    'abs': { sig: 'abs(value)', desc: 'Returns the absolute value of a number.' },
    'round': { sig: 'round(value)', desc: 'Rounds a number to the nearest integer.' },
    'enumerate': { sig: 'enumerate(iterable)', desc: 'Returns an array of [index, value] pairs for the iterable.' },
    'range': { sig: 'range(start, end, step?)', desc: 'Generates an array of numbers from start to end.' },
    'zip': { sig: 'zip(arr1, arr2)', desc: 'Zips two arrays together into an array of pairs.' },
    'getLine': { sig: 'getLine()', desc: 'Returns the current execution line number.' },
    'getFile': { sig: 'getFile()', desc: 'Returns the current execution file path.' },
    'getDir': { sig: 'getDir()', desc: 'Returns the current execution directory path.' },

    // Array Methods
    'length': { sig: 'length()', desc: 'Returns the number of elements in the collection/string.' },
    'append': { sig: 'append(value)', desc: 'Adds an element to the end of the array.' },
    'pop': { sig: 'pop()', desc: 'Removes and returns the last element of the array or map.' },
    'insert': { sig: 'insert(index, value)', desc: 'Inserts an element at the specified index.' },
    'remove': { sig: 'remove(value)', desc: 'Removes the first occurrence of the value.' },
    'reverse': { sig: 'reverse()', desc: 'Reverses the array or string in place (or returns reversed).' },
    'index': { sig: 'index(value)', desc: 'Returns the index of the first occurrence of the value.' },
    'extend': { sig: 'extend(arr)', desc: 'Extends the array by appending elements from another array.' },
    'sort': { sig: 'sort()', desc: 'Sorts the array in place.' },
    'copy': { sig: 'copy()', desc: 'Returns a shallow copy of the array or map.' },
    'clear': { sig: 'clear()', desc: 'Removes all elements from the array or map.' },
    'contains': { sig: 'contains(value)', desc: 'Returns true if the collection contains the value.' },
    'count': { sig: 'count(value)', desc: 'Returns the number of occurrences of the value.' },
    'concat': { sig: 'concat(other)', desc: 'Returns a new array/string by concatenating with another.' },
    'slice': { sig: 'slice(start, end?)', desc: 'Returns a sub-array or sub-string.' },
    'join': { sig: 'join(separator)', desc: 'Joins array elements into a string using the separator.' },
    'flatten': { sig: 'flatten()', desc: 'Returns a flattened 1D array.' },
    'unique': { sig: 'unique()', desc: 'Returns a new array with duplicate elements removed.' },
    'sum': { sig: 'sum()', desc: 'Returns the sum of all elements in the array.' },
    'max': { sig: 'max()', desc: 'Returns the maximum value in the array.' },
    'min': { sig: 'min()', desc: 'Returns the minimum value in the array.' },
    'all': { sig: 'all()', desc: 'Returns true if all elements in the array are truthy.' },
    'any': { sig: 'any()', desc: 'Returns true if any element in the array is truthy.' },
    'filter': { sig: 'filter(fn)', desc: 'Returns a new array with elements that pass the test function.' },
    'map': { sig: 'map(fn)', desc: 'Returns a new array with the results of calling the function on every element.' },
    'reduce': { sig: 'reduce(fn, initial?)', desc: 'Reduces the array to a single value using the reducer function.' },
    'find': { sig: 'find(fn)', desc: 'Returns the first element that satisfies the provided testing function.' },
    'every': { sig: 'every(fn)', desc: 'Returns true if all elements pass the test function.' },
    'some': { sig: 'some(fn)', desc: 'Returns true if at least one element passes the test function.' },

    // Map Methods
    'get': { sig: 'get(key, default?)', desc: 'Returns the value for the key, or default if not found.' },
    'keys': { sig: 'keys()', desc: 'Returns an array of all keys in the map.' },
    'values': { sig: 'values()', desc: 'Returns an array of all values in the map.' },
    'items': { sig: 'items()', desc: 'Returns an array of [key, value] pairs for the map.' },
    'setDefault': { sig: 'setDefault(key, default)', desc: 'Returns the value of the key. If not present, sets it to default and returns it.' },
    'update': { sig: 'update(map)', desc: 'Updates the map with key-value pairs from another map.' },

    // String Methods
    'capitalize': { sig: 'capitalize()', desc: 'Returns a copy of the string with its first character capitalized.' },
    'center': { sig: 'center(width)', desc: 'Returns a centered string of the given width.' },
    'charCodeAt': { sig: 'charCodeAt(index)', desc: 'Returns the Unicode value of the character at the given index.' },
    'endsWith': { sig: 'endsWith(str)', desc: 'Returns true if the string ends with the specified substring.' },
    'startsWith': { sig: 'startsWith(str)', desc: 'Returns true if the string starts with the specified substring.' },
    'isAlpha': { sig: 'isAlpha()', desc: 'Returns true if all characters are alphabetic.' },
    'isAlnum': { sig: 'isAlnum()', desc: 'Returns true if all characters are alphanumeric.' },
    'isDigit': { sig: 'isDigit()', desc: 'Returns true if all characters are digits.' },
    'isLower': { sig: 'isLower()', desc: 'Returns true if all characters are lowercase.' },
    'isUpper': { sig: 'isUpper()', desc: 'Returns true if all characters are uppercase.' },
    'isSpace': { sig: 'isSpace()', desc: 'Returns true if all characters are whitespace.' },
    'lower': { sig: 'lower()', desc: 'Returns a copy of the string converted to lowercase.' },
    'upper': { sig: 'upper()', desc: 'Returns a copy of the string converted to uppercase.' },
    'strip': { sig: 'strip()', desc: 'Returns a copy of the string with leading and trailing whitespace removed.' },
    'lStrip': { sig: 'lStrip()', desc: 'Returns a copy of the string with leading whitespace removed.' },
    'rStrip': { sig: 'rStrip()', desc: 'Returns a copy of the string with trailing whitespace removed.' },
    'replace': { sig: 'replace(old, new)', desc: 'Returns a copy of the string with all occurrences of substring old replaced by new.' },
    'split': { sig: 'split(separator)', desc: 'Splits the string into an array of substrings using the separator.' },
    'subStr': { sig: 'subStr(start, length)', desc: 'Returns a substring beginning at start with the given length.' },

    // Keywords
    'fn': { sig: 'Keyword', desc: 'Defines a function.' },
    'async': { sig: 'Keyword', desc: 'Defines an asynchronous function or method.' },
    'await': { sig: 'Keyword', desc: 'Pauses execution until the asynchronous operation completes.' },
    'let': { sig: 'Keyword', desc: 'Declares a local variable.' },
    'return': { sig: 'Keyword', desc: 'Exits a function and optionally returns a value.' },
    'if': { sig: 'Keyword', desc: 'Starts a conditional statement.' },
    'elif': { sig: 'Keyword', desc: 'Adds an else-if branch to a conditional statement.' },
    'else': { sig: 'Keyword', desc: 'Executes a block of code if the condition is false.' },
    'for': { sig: 'Keyword', desc: 'Starts a for loop, usually over an iterable (e.g., `for x in arr`).' },
    'while': { sig: 'Keyword', desc: 'Starts a while loop that executes as long as the condition is true.' },
    'do': { sig: 'Keyword', desc: 'Starts a do-while loop.' },
    'match': { sig: 'Keyword', desc: 'Starts a pattern matching statement.' },
    'case': { sig: 'Keyword', desc: 'Defines a case branch in a match statement.' },
    'default': { sig: 'Keyword', desc: 'Defines the default branch in a match statement.' },
    'try': { sig: 'Keyword', desc: 'Starts a block of code to test for errors.' },
    'catch': { sig: 'Keyword', desc: 'Catches and handles errors thrown in a try block.' },
    'finally': { sig: 'Keyword', desc: 'Executes a block of code regardless of whether an error was thrown.' },
    'end': { sig: 'Keyword', desc: 'Marks the end of a block (e.g., fn, class, if, while, for).' },
    'class': { sig: 'Keyword', desc: 'Defines a new class.' },
    'is': { sig: 'Keyword', desc: 'Used in class definitions for inheritance (e.g., `class Dog is Animal`).' },
    'self': { sig: 'Keyword', desc: 'Refers to the current instance within a class method.' },
    'init': { sig: 'Keyword', desc: 'Constructor method for a class, called when an instance is created.' },
    'break': { sig: 'Keyword', desc: 'Exits a loop prematurely.' },
    'continue': { sig: 'Keyword', desc: 'Skips the rest of the current loop iteration and moves to the next.' },
    'import': { sig: 'Keyword', desc: 'Imports a module or file.' },
    'from': { sig: 'Keyword', desc: 'Specifies the source module to import from.' },
    'in': { sig: 'Keyword', desc: 'Used in a for loop to iterate over elements.' },
    'True': { sig: 'Keyword', desc: 'The boolean truth value.' },
    'False': { sig: 'Keyword', desc: 'The boolean false value.' },
    'Null': { sig: 'Keyword', desc: 'Represents the intentional absence of any value.' }
};

class DjazairHoverProvider {
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        const word = document.getText(range);
        
        const doc = DJAZAIR_DOCS[word];
        if (doc) {
            const md = new vscode.MarkdownString();
            if (doc.sig !== 'Keyword') {
                md.appendCodeblock(doc.sig, 'djazair');
            } else {
                md.appendMarkdown('**' + word + '** (Keyword)\n\n');
            }
            md.appendMarkdown(doc.desc);
            return new vscode.Hover(md);
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────
// CODELENS PROVIDER (Run Button)
// ─────────────────────────────────────────────────────────────────
class DjazairCodeLensProvider {
    provideCodeLenses(document, token) {
        const codeLenses = [];
        const range = new vscode.Range(0, 0, 0, 0);
        const command = {
            title: "$(play) Run File",
            tooltip: "Run this Djazair file in the terminal",
            command: "djazair.runFile",
            arguments: [document.uri]
        };
        codeLenses.push(new vscode.CodeLens(range, command));
        return codeLenses;
    }
}

let terminal = null;
function runDjazairFile(uri) {
    if (!uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        uri = editor.document.uri;
    }
    
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    if (doc && doc.isDirty) {
        doc.save().then(() => execute(uri));
    } else {
        execute(uri);
    }
    
    function execute(fileUri) {
        if (!terminal || terminal.exitStatus !== undefined) {
            terminal = vscode.window.createTerminal("Djazair");
        }
        terminal.show(true);
        const compilerPath = getCompilerPath();
        const filePath = fileUri.fsPath;
        const safeCompilerPath = compilerPath.includes(' ') ? `"${compilerPath}"` : compilerPath;
        const safeFilePath = filePath.includes(' ') ? `"${filePath}"` : filePath;
        
        terminal.sendText(`${safeCompilerPath} ${safeFilePath}`);
    }
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION
// ─────────────────────────────────────────────────────────────────
function activate(context) {
    // 1. Diagnostics / Linter
    diagnosticCollection = vscode.languages.createDiagnosticCollection('djazair');
    context.subscriptions.push(diagnosticCollection);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(runLinter));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(runLinter));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) runLinter(editor.document);
    }));
    vscode.workspace.textDocuments.forEach(runLinter);

    // 2. Code Formatter
    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('djazair', {
        provideDocumentFormattingEdits(document, options) {
            const formattedText = formatDocument(document, options);
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
            return [vscode.TextEdit.replace(range, formattedText)];
        }
    });
    context.subscriptions.push(formattingProvider);

    // 3. Hover Provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('djazair', new DjazairHoverProvider())
    );

    // 4. CodeLens Provider & Run Command
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'djazair', scheme: 'file' }, new DjazairCodeLensProvider())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('djazair.runFile', runDjazairFile)
    );
}

function deactivate() {
    if (diagnosticCollection) diagnosticCollection.dispose();
}

module.exports = { activate, deactivate };
