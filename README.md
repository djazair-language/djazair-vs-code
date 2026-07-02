<div align="center">
  <h1>Djazair VS Code Extension</h1>
  <p><strong>The Official Visual Studio Code Support for the Djazair Programming Language</strong></p>

  [![Version](https://img.shields.io/badge/version-1.1.3-emerald.svg)](https://github.com/djazair-language/djazair-vs-code)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Language Website](https://img.shields.io/badge/website-djazair--language-blue.svg)](https://djazair-language.github.io/)
</div>

---

## 📖 About
This is the official Visual Studio Code extension for the **Djazair (`.dz`)** programming language. It is designed to provide developers with a seamless, high-performance, and modern coding experience by integrating Djazair's core tools directly into your favorite editor.

## ©️ Ownership & Copyrights
- **Owner & Creator:** Harizi Riyadh
- **Email:** [hariziriyadh@gmail.com](mailto:hariziriyadh@gmail.com)
- **Official Language Website:** [https://djazair-language.github.io/](https://djazair-language.github.io/)
- **Organization:** [Djazair Language](https://github.com/djazair-language)

All intellectual property rights and copyrights for the Djazair Programming Language, its compiler, and its official editor extensions are exclusively owned by Harizi Riyadh.

---

## 🌟 Key Features

### 1. 🎨 Advanced Syntax Highlighting
Full TextMate grammar tokenization maps precisely to the Djazair grammar:
- **Keywords**: `let`, `fn`, `class`, `if`, `match`, `try`, `use`, `import`, `async`, `await`, etc.
- **Primitive Types**: Numbers, Booleans (`True`, `False`), and `Null`.
- **String Interpolation**: Highlights dynamic expressions inside double-quoted strings (e.g., `"Hello ${name}"`).

### 2. 🔍 Real-time Linter (Error Detection)
- Runs compile-time validation automatically while typing and upon saving.
- Displays error diagnostics as **red wavy underlines** directly in the editor.
- Intelligently detects the `djazair` compiler from your system `PATH` or local build directory.

### 3. ✨ Intelligent Auto-Formatting
- Instantly format your document using `Shift + Alt + F` or on-save.
- Automatically structures code blocks (`fn`, `class`, loops, conditionals) with clean and standard indentation.

### 4. 💡 IntelliSense (Auto-Complete)
Context-aware completions that understand what you're typing:
- **Global Functions**: `print`, `input`, `range`, `type`, `str` — complete with full documentation.
- **Keywords & Snippets**: Rapid development snippets for all language constructs.
- **Standard Library Modules**: Instant access to all 20+ built-in modules (`math`, `os`, `file`, `json`, `net`, etc.).

### 5. 🖱️ Hover Tooltips & Signature Help
- Hover over any built-in function, method, or keyword to see its **signature** and **detailed description**.
- Type `(` after a function call to see its **parameters** highlighted as you type each argument dynamically.

### 6. 🗺️ Outline View (Document Symbols)
- The **Outline** panel provides a structured tree of your entire file, including **Classes**, **Functions**, **Methods**, **Variables**, and **Imports**.
- Click any symbol to jump directly to its definition.

### 7. ▶️ Integrated Run Button
- A **▷ Play button** in the editor title bar and a **`$(play) Run File`** CodeLens button above your code allow you to execute Djazair scripts instantly.

---

## ⚡ Installation

### Via VS Code Marketplace (Recommended)
1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for **Djazair Programming Language** and click **Install**.

### Manual Installation (VSIX)
1. Download the latest `.vsix` file from the [Releases page](https://github.com/djazair-language/djazair-vs-code).
2. Open VS Code, go to Extensions → Click **`...`** → **Install from VSIX...**
3. Select the downloaded `.vsix` file.

---

## 💻 Compatibility
Built upon standard VS Code API definitions, this extension runs seamlessly across:
- **VS Code** (Desktop & Web)
- **Cursor** & **Antigravity IDE**
- **VSCodium**, **Gitpod**, & **GitHub Codespaces**

---

## ⚙️ Configuration Settings
| Setting | Default | Description |
|---------|---------|-------------|
| `djazair.compilerPath` | `"djazair"` | Custom path to the `djazair` compiler executable. |

---

<div align="center">
  <i>Developed with ❤️ by Harizi Riyadh for the Djazair Community.</i>
</div>
