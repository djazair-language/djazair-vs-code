const vscode = require('vscode');
const { DJAZAIR_DOCS, DJAZAIR_MODULES, GLOBAL_FUNCTIONS } = require('./docs');

class DjazairCompletionItemProvider {
    provideCompletionItems(document, position, token, context) {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const isDotTrigger = linePrefix.endsWith('.');
        const completionItems = [];

        if (isDotTrigger) {
            for (const [key, doc] of Object.entries(DJAZAIR_DOCS)) {
                if (doc.sig !== 'Keyword' && !GLOBAL_FUNCTIONS.includes(key)) {
                    const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Method);
                    item.detail = doc.sig;
                    item.documentation = new vscode.MarkdownString(doc.desc);
                    completionItems.push(item);
                }
            }
        } else {
            for (const [key, doc] of Object.entries(DJAZAIR_DOCS)) {
                let kind = vscode.CompletionItemKind.Function;
                if (doc.sig === 'Keyword') {
                    kind = vscode.CompletionItemKind.Keyword;
                } else if (!GLOBAL_FUNCTIONS.includes(key)) {
                    continue;
                }
                const item = new vscode.CompletionItem(key, kind);
                if (doc.sig !== 'Keyword') {
                    item.detail = doc.sig;
                }
                item.documentation = new vscode.MarkdownString(doc.desc);
                completionItems.push(item);
            }

            for (const mod of DJAZAIR_MODULES) {
                const item = new vscode.CompletionItem(mod, vscode.CompletionItemKind.Module);
                item.detail = `Module: ${mod}`;
                item.documentation = new vscode.MarkdownString(`Standard library module \`${mod}\`.`);
                completionItems.push(item);
            }
        }

        return completionItems;
    }
}

module.exports = { DjazairCompletionItemProvider };
