const vscode = require('vscode');
const { formatDocument } = require('./src/formatter');
const { initLinter, disposeLinter, runLinter, debouncedLint } = require('./src/linter');
const { DjazairHoverProvider } = require('./src/hover');
const { DjazairCompletionItemProvider } = require('./src/completion');
const { DjazairSignatureHelpProvider } = require('./src/signature');
const { DjazairCodeLensProvider, runDjazairFile } = require('./src/codelens');
const { DjazairDocumentSymbolProvider } = require('./src/symbols');

let diagnosticCollection;

function activate(context) {
    // 1. Diagnostics / Linter
    diagnosticCollection = initLinter();
    context.subscriptions.push(diagnosticCollection);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(runLinter));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(runLinter));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'djazair') debouncedLint(event.document);
    }));
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

    // 4. Auto-Complete Provider
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'djazair', scheme: 'file' },
            new DjazairCompletionItemProvider(),
            '.'
        )
    );

    // 5. Signature Help Provider
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            { language: 'djazair', scheme: 'file' },
            new DjazairSignatureHelpProvider(),
            '(', ','
        )
    );

    // 6. Document Symbols (Outline View)
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'djazair', scheme: 'file' },
            new DjazairDocumentSymbolProvider()
        )
    );

    // 7. CodeLens Provider & Run Command
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'djazair', scheme: 'file' }, new DjazairCodeLensProvider())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('djazair.runFile', runDjazairFile)
    );
}

function deactivate() {
    disposeLinter();
}

module.exports = { activate, deactivate };
