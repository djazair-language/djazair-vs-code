const vscode = require('vscode');
const { DJAZAIR_DOCS } = require('./docs');

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

module.exports = { DjazairHoverProvider };
