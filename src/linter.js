const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

let diagnosticCollection = null;
let lintDebounceTimer = null;

function initLinter() {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('djazair');
    return diagnosticCollection;
}

function disposeLinter() {
    if (diagnosticCollection) diagnosticCollection.dispose();
}

function getCompilerPath() {
    let compilerPath = vscode.workspace.getConfiguration('djazair').get('compilerPath') || 'djazair';

    if (compilerPath === 'djazair') {
        try {
            const result = cp.spawnSync('djazair', ['--version'], { timeout: 5000 });
            if (!result.error) {
                return 'djazair';
            }
        } catch (e) {
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath   = workspaceFolders[0].uri.fsPath;
            const candidates = [
                path.join(rootPath, 'build', 'bin', 'djazair.exe'),
                path.join(rootPath, 'build', 'bin', 'djazair'),
                path.join(rootPath, 'node_modules', '.bin', 'djazair.cmd'),
                path.join(rootPath, 'node_modules', '.bin', 'djazair')
            ];
            for (const p of candidates) {
                if (fs.existsSync(p)) { compilerPath = p; break; }
            }
        }
    }
    return compilerPath;
}

function runLinter(document) {
    if (document.languageId !== 'djazair') return;

    const compilerPath = getCompilerPath();
    const filePath     = document.uri.fsPath;

    try {
        cp.execFile(compilerPath, ['--check', filePath], { timeout: 10000 }, (error, stdout, stderr) => {
            const diagnostics = [];
            diagnosticCollection.set(document.uri, []);

            if (error) {
                if (error.code === 'ENOENT') {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(0, 0, 0, 0),
                        `Compiler not found: "${compilerPath}". Set "djazair.compilerPath" in settings.`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.source = 'Djazair';
                    diagnostics.push(diagnostic);
                    diagnosticCollection.set(document.uri, diagnostics);
                    return;
                }
            }

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
    } catch (e) {
        diagnosticCollection.set(document.uri, []);
    }
}

function debouncedLint(document) {
    if (lintDebounceTimer) clearTimeout(lintDebounceTimer);
    lintDebounceTimer = setTimeout(() => runLinter(document), 800);
}

module.exports = { initLinter, disposeLinter, runLinter, debouncedLint, getCompilerPath };
