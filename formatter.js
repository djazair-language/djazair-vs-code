const vscode = require('vscode');

class DjazairFormatter {
    constructor() {
        this.indentSize = 4;
    }

    format(code, options = {}) {
        const tabSize = options.tabSize || this.indentSize;
        const lines = code.split('\n');
        const result = [];
        let depth = 0;

        const blockOpen = /^\s*(fn|if|for|while|class|match|try|do)\b.*:\s*(#.*)?$/;
        const blockMid  = /^\s*(elif|else|catch|finally|case|default)\b.*:\s*(#.*)?$/;
        const blockClose = /^\s*(end)\b/;
        const doWhileTail = /^\s*while\s*\(.*\)\s*$/;

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const trimmed = raw.trim();

            if (trimmed === '') {
                result.push('');
                continue;
            }

            if (blockClose.test(trimmed)) {
                depth = Math.max(0, depth - 1);
            } else if (doWhileTail.test(trimmed)) {
                depth = Math.max(0, depth - 1);
            } else if (blockMid.test(trimmed)) {
                depth = Math.max(0, depth - 1);
            }

            const indent = ' '.repeat(depth * tabSize);
            result.push(indent + trimmed);

            if (blockOpen.test(trimmed)) {
                depth++;
            } else if (blockMid.test(trimmed)) {
                depth++;
            }
        }

        return result.join('\n');
    }
}

function activate(context) {
    const formatter = new DjazairFormatter();
    const provider = vscode.languages.registerDocumentFormattingEditProvider('djazair', {
        provideDocumentFormattingEdits(document, options) {
            const text = document.getText();
            const formatted = formatter.format(text, { tabSize: options.tabSize });
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
            return [vscode.TextEdit.replace(range, formatted)];
        }
    });
    context.subscriptions.push(provider);
}

module.exports = { activate };
