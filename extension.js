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
}

function deactivate() {
    if (diagnosticCollection) diagnosticCollection.dispose();
}

module.exports = { activate, deactivate };
