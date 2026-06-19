const vscode = require('vscode');
const { DJAZAIR_DOCS } = require('./docs');

class DjazairSignatureHelpProvider {
    provideSignatureHelp(document, position, token, context) {
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);

        const funcMatch = beforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*$/);
        if (!funcMatch) return null;

        const funcName = funcMatch[1];
        const doc = DJAZAIR_DOCS[funcName];
        if (!doc || doc.sig === 'Keyword') return null;

        const sigMatch = doc.sig.match(/\(([^)]*)\)/);
        if (!sigMatch) return null;

        const paramStr = sigMatch[1];
        const params = paramStr ? paramStr.split(',').map(p => p.trim()).filter(p => p) : [];

        const signatureInfo = new vscode.SignatureInformation(
            doc.sig,
            new vscode.MarkdownString(doc.desc)
        );

        const openParen = beforeCursor.lastIndexOf('(');
        const textAfterParen = beforeCursor.substring(openParen + 1);
        let activeParam = 0;
        if (textAfterParen.includes(',')) {
            activeParam = (textAfterParen.match(/,/g) || []).length;
        }

        const paramNames = params.map(p => p.replace(/[?=].*$/, '').trim());
        for (const p of paramNames) {
            signatureInfo.parameters.push(
                new vscode.ParameterInformation(p)
            );
        }

        const sigHelp = new vscode.SignatureHelp();
        sigHelp.signatures = [signatureInfo];
        sigHelp.activeSignature = 0;
        sigHelp.activeParameter = Math.min(activeParam, Math.max(0, params.length - 1));

        return sigHelp;
    }
}

module.exports = { DjazairSignatureHelpProvider };
