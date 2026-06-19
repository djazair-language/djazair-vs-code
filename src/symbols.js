const vscode = require('vscode');

// ─── Patterns extracted directly from the Djazair AST (ast.h) ─────────────────
// STMT_FN_DECL  : fn name(...)  |  async fn name(...)
// STMT_CLASS    : class Name  |  class Name is SuperClass
// STMT_VAR      : let name = ...
// STMT_USE      : use module  |  use module as alias
// STMT_IMPORT   : import "file"

const PATTERNS = {
    fn:     /^\s*(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
    class:  /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+is\s+([a-zA-Z_][a-zA-Z0-9_]*))?/,
    let:    /^\s*let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/,
    use:    /^\s*use\s+([a-zA-Z_][a-zA-Z0-9_.]*)(?:\s+as\s+(\*|[a-zA-Z_][a-zA-Z0-9_]*))?/,
    import: /^\s*import\s+"([^"]+)"/,
};

class DjazairDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const symbols  = [];
        const classStack = [];   // tracks open class blocks for method nesting

        for (let i = 0; i < document.lineCount; i++) {
            if (token.isCancellationRequested) break;

            const line     = document.lineAt(i);
            const text     = line.text;
            const indent   = text.search(/\S/);

            // ── Class ────────────────────────────────────────────────────────
            const classMatch = PATTERNS.class.exec(text);
            if (classMatch) {
                const name   = classMatch[1];
                const detail = classMatch[2] ? `is ${classMatch[2]}` : '';
                const range  = new vscode.Range(i, 0, i, text.length);
                const symbol = new vscode.DocumentSymbol(
                    name, detail,
                    vscode.SymbolKind.Class,
                    range, range
                );
                symbols.push(symbol);
                classStack.push({ symbol, indent });
                continue;
            }

            // ── Function / Method ────────────────────────────────────────────
            const fnMatch = PATTERNS.fn.exec(text);
            if (fnMatch) {
                const isAsync = /^\s*async\s+fn/.test(text);
                const name    = fnMatch[1];
                const detail  = isAsync ? 'async' : '';
                const range   = new vscode.Range(i, 0, i, text.length);
                const symbol  = new vscode.DocumentSymbol(
                    name, detail,
                    vscode.SymbolKind.Function,
                    range, range
                );

                // Nest inside class if indented deeper than the class opener
                const parentClass = classStack.length > 0
                    ? classStack[classStack.length - 1]
                    : null;

                if (parentClass && indent > parentClass.indent) {
                    symbol.kind = vscode.SymbolKind.Method;
                    parentClass.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                continue;
            }

            // ── Variable (let) ───────────────────────────────────────────────
            const letMatch = PATTERNS.let.exec(text);
            if (letMatch) {
                const range  = new vscode.Range(i, 0, i, text.length);
                const symbol = new vscode.DocumentSymbol(
                    letMatch[1], '',
                    vscode.SymbolKind.Variable,
                    range, range
                );

                const parentClass = classStack.length > 0
                    ? classStack[classStack.length - 1]
                    : null;

                if (parentClass && indent > parentClass.indent) {
                    symbol.kind = vscode.SymbolKind.Field;
                    parentClass.symbol.children.push(symbol);
                } else {
                    symbols.push(symbol);
                }
                continue;
            }

            // ── use (module import) ──────────────────────────────────────────
            const useMatch = PATTERNS.use.exec(text);
            if (useMatch) {
                const alias  = useMatch[2] && useMatch[2] !== '*' ? ` as ${useMatch[2]}` : '';
                const range  = new vscode.Range(i, 0, i, text.length);
                symbols.push(new vscode.DocumentSymbol(
                    useMatch[1] + alias, 'module',
                    vscode.SymbolKind.Module,
                    range, range
                ));
                continue;
            }

            // ── import (file) ────────────────────────────────────────────────
            const importMatch = PATTERNS.import.exec(text);
            if (importMatch) {
                const range  = new vscode.Range(i, 0, i, text.length);
                symbols.push(new vscode.DocumentSymbol(
                    importMatch[1], 'file import',
                    vscode.SymbolKind.File,
                    range, range
                ));
                continue;
            }

            // ── Pop class stack when indentation returns to class level ───────
            if (/^\s*end\s*$/.test(text)) {
                if (classStack.length > 0 && indent <= classStack[classStack.length - 1].indent) {
                    classStack.pop();
                }
            }
        }

        return symbols;
    }
}

module.exports = { DjazairDocumentSymbolProvider };
