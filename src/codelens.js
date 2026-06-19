const vscode = require('vscode');
const { getCompilerPath } = require('./linter');

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
        // Reuse existing terminal if still alive, otherwise create a new one
        const isTerminalAlive = terminal &&
            vscode.window.terminals.find(t => t === terminal) !== undefined;
        if (!isTerminalAlive) {
            terminal = vscode.window.createTerminal('Djazair');
        }
        terminal.show(true);
        const compilerPath = getCompilerPath();
        const filePath = fileUri.fsPath;
        const safeCompilerPath = compilerPath.includes(' ') ? `"${compilerPath}"` : compilerPath;
        const safeFilePath = filePath.includes(' ') ? `"${filePath}"` : filePath;

        let command = `${safeCompilerPath} ${safeFilePath}`;

        const shell = vscode.env.shell || '';
        const isPowerShell = shell.toLowerCase().includes('powershell') || shell.toLowerCase().includes('pwsh');

        if (isPowerShell && safeCompilerPath.startsWith('"')) {
            command = `& ${command}`;
        }

        terminal.sendText(command);
    }
}

module.exports = { DjazairCodeLensProvider, runDjazairFile };
