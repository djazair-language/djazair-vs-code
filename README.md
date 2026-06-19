# Djazair VS Code Extension

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/organization-djazair--language-blue.svg)](https://github.com/djazair-language)
[![VS Code](https://img.shields.io/badge/editor-VS%20Code-purple.svg)](https://code.visualstudio.com/)

**The official Visual Studio Code extension providing rich language support, syntax highlighting, and code snippets for the Djazair Programming Language.**

[Features](#-key-features) · [Compatibility](#-compatibility) · [Installation](#-installation) · [Developer Guide](#-developer-guide--packaging) · [Contributing](#-contributing)

</div>

---

This extension provides comprehensive support for **Djazair (`.dz`)** source files, enabling syntax highlighting, structural folding, auto-closing brackets, and intelligent code snippets in VS Code, Antigravity, and compatible IDEs.

---

## 🌟 Key Features

### 1. Advanced Syntax Highlighting
Full TextMate grammar tokenization maps precisely to the Djazair grammar:
* **Control Flows & Keywords**: `let`, `var`, `fn`, `class`, `is`, `if`, `elif`, `else`, `match`, `case`, `default`, `try`, `catch`, `finally`, `end`, etc.
* **Primitive Types**: Numbers, Booleans (`True`, `False`), and `Null`.
* **String Interpolation**: Highlights dynamic expressions inside double-quoted strings (e.g. `"Hello ${name}"`).
* **Comments**: Special colorization for single-line (`#`) and multi-line block comments (`#! ... !#`).

### 2. Automatic Syntax Checking (Linter) 🆕
* Run compile-time validation on save to catch syntax errors instantly.
* Displays error diagnostics directly in your editor as red wavy underlines.
* Provides detailed descriptions and precise column highlights for errors in the **Problems** tab.

### 3. Code Auto-Formatting (Like JS/Prettier) 🆕
* Instantly format your entire document using `Shift + Alt + F` or on-save (`editor.formatOnSave`).
* Automatically structures your blocks (functions, classes, loops, conditionals) with clean and consistent indentation.

### 4. Productivity Snippets
Includes rich code snippets for rapid development:
* `fn`: Standard function structure.
* `class`: Class outline with an initialization constructor (`init`).
* `try`: Full Exception handling try-catch block.
* `print`: Print statement wrapper.
* `let` / `var`: Variable declaration templates.

---

## 💻 Compatibility

Built upon standard VS Code API definitions, this extension runs seamlessly across a variety of editors and AI coding environments:
* **VS Code** (Desktop & Web)
* **Antigravity IDE** (Official agent workspace)
* **Cursor** & **VSCodium**
* **Gitpod** & **GitHub Codespaces**

---

## ⚡ Installation

### Option 1: Manual Installation (Development)
To run and test the extension directly from the source code:

1. Clone this repository into your editor's extensions folder:
   - **Windows**: 
     ```powershell
     git clone https://github.com/djazair-language/djazair-vs-code.git "$HOME\.vscode\extensions\djazair-vs-code"
     ```
   - **Linux / macOS**:
     ```bash
     git clone https://github.com/djazair-language/djazair-vs-code.git ~/.vscode/extensions/djazair-vs-code
     ```
2. Restart your editor to activate the extension.

### Option 2: Pre-packaged VSIX Installation
If you have a compiled `.vsix` file:
1. Open VS Code.
2. Open the Extensions View (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the **`...`** (More Actions) menu in the top-right corner of the Extensions panel.
4. Select **Install from VSIX...** and select the `.vsix` file.

---

## ⚙️ Configuration Settings

This extension provides the following settings:
* `djazair.compilerPath`: Specify the absolute path to your `djazair` or `djazair.exe` compiler binary. (Defaults to `"djazair"`. The extension will also attempt to auto-discover the compiler binary inside parent workspaces if built from source).

---

## 🛠️ Developer Guide & Packaging

If you are a maintainer and want to package the extension into a shareable `.vsix` file, follow these steps:

### Prerequisites
Make sure you have Node.js installed, then install the VS Code Extension Manager globally:
```bash
npm install -g @vscode/vsce
```

### Packaging the Extension
Navigate to the root directory of this extension and run:
```bash
vsce package
```
This command compiles and generates a `djazair-1.0.3.vsix` file (matching the version in `package.json`) in the root directory, which can be shared and installed directly.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/djazair-language/djazair-vs-code/issues) to report bugs or request new snippets.

---

## 📄 License

This extension is licensed under the MIT License. See [LICENSE](LICENSE) for details.
