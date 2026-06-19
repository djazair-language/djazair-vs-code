# Djazair VS Code Extension

<div align="center">

[![Version](https://img.shields.io/badge/version-1.1.1-emerald.svg)](https://github.com/djazair-language/djazair-vs-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/organization-djazair--language-blue.svg)](https://github.com/djazair-language)
[![VS Code](https://img.shields.io/badge/editor-VS%20Code-purple.svg)](https://code.visualstudio.com/)

**The official Visual Studio Code extension providing rich language support for the Djazair Programming Language.**

[Features](#-key-features) · [Compatibility](#-compatibility) · [Installation](#-installation) · [Configuration](#-configuration-settings) · [Developer Guide](#-developer-guide--packaging) · [Contributing](#-contributing)

</div>

---

This extension provides comprehensive support for **Djazair (`.dz`)** source files in VS Code, including syntax highlighting, intelligent code completion, real-time error detection, formatting, and more.

---

## 🌟 Key Features

### 1. 🎨 Advanced Syntax Highlighting
Full TextMate grammar tokenization maps precisely to the Djazair grammar:
- **Keywords**: `let`, `fn`, `class`, `is`, `if`, `elif`, `else`, `match`, `case`, `default`, `try`, `catch`, `finally`, `end`, `use`, `import`, `async`, `await`, etc.
- **Primitive Types**: Numbers, Booleans (`True`, `False`), and `Null`.
- **String Interpolation**: Highlights dynamic expressions inside double-quoted strings (e.g. `"Hello ${name}"`).
- **Comments**: Special colorization for single-line (`#`) and multi-line (`#* ... *#`).

### 2. 🔍 Real-time Linter (Error Detection)
- Runs compile-time validation on **save** and **while typing** (debounced).
- Displays error diagnostics as **red wavy underlines** directly in the editor.
- Shows precise **column highlights** and detailed messages in the **Problems** tab.
- Automatically detects the `djazair` compiler from your system `PATH` or local build directory.

### 3. ✨ Code Auto-Formatting
- Instantly format your document using `Shift + Alt + F` or on-save (`editor.formatOnSave`).
- Automatically structures blocks (`fn`, `class`, loops, conditionals) with clean indentation.

### 4. 💡 IntelliSense (Auto-Complete)
Context-aware completions that understand what you're typing:
- **Global Functions**: `print`, `input`, `range`, `type`, `str`, and more — with full documentation.
- **Keywords**: `fn`, `class`, `match`, `if`, `for`, `while`, `try`, and more.
- **Standard Library Modules**: All 20 built-in modules (`math`, `os`, `file`, `json`, `net`, `regex`, `thread`, `crypto`, `datetime`, `uuid`, `path`, `http`, etc.)
- **Methods (Dot trigger)**: Type `.` after any variable to get a filtered list of array, string, and map methods.

### 5. 🖱️ Hover Tooltips
- Hover over any built-in function, method, or keyword to see its **signature** and **description**.

### 6. 🪧 Signature Help
- Type `(` after a function call to see its **parameters** highlighted as you type each argument.
- Automatically highlights the active parameter as you move through arguments separated by `,`.

### 7. 🗺️ Outline View (Document Symbols)
- The **Outline** panel shows a structured tree of your entire file:
  - 🟧 **Classes** (`class MyClass is Base`)
  - 🔵 **Functions** (`fn myFunction()`) and **async Functions** (`async fn fetch()`)
  - 🟢 **Methods** nested inside their parent class
  - 🔶 **Variables** (`let myVar = ...`) and **Fields** inside classes
  - 📦 **Modules** (`use math as m`)
  - 📄 **File Imports** (`import "utils.dz"`)
- Supports the **Breadcrumbs** navigation bar at the top of the editor.
- Click any symbol to jump directly to its definition.

### 8. ▶️ Run Button
- A **▷ Play button** appears in the editor title bar (top-right corner) for every `.dz` file.
- A **`$(play) Run File`** CodeLens button appears at the top of the source code.
- Right-click a `.dz` file in the Explorer to find **"Run Djazair File"** in the context menu.
- Automatically saves the file before running.
- Intelligently detects `djazair` from system `PATH` or falls back to a local build.

### 9. 📄 Custom File Icon
- `.dz` files display a custom **DZ** icon in the file explorer and editor tabs.

### 10. ✂️ Code Snippets
Rapid-development snippets for core language constructs:

| Prefix | Description |
|--------|-------------|
| `fn` | Function definition |
| `af` | Arrow / lambda function |
| `class` | Class with `init` constructor |
| `if`, `ife`, `ifel` | If / if-else / if-elif-else |
| `match` | Match-case statement |
| `for`, `while`, `dowhile` | Loop constructs |
| `try` | Try-catch-finally block |
| `let` | Variable declaration |
| `imp`, `impa`, `imps`, `imf` | Module & file imports |
| `pr` | `print()` statement |

---

## 💻 Compatibility

Built upon standard VS Code API definitions, this extension runs seamlessly across:
- **VS Code** (Desktop & Web)
- **Antigravity IDE** (Official agent workspace)
- **Cursor** & **VSCodium**
- **Gitpod** & **GitHub Codespaces**

---

## ⚡ Installation

### Option 1: Manual (Development)
1. Clone this repository into your editor's extensions folder:
   - **Windows**:
     ```powershell
     git clone https://github.com/djazair-language/djazair-vs-code.git "$HOME\.vscode\extensions\djazair-vs-code"
     ```
   - **Linux / macOS**:
     ```bash
     git clone https://github.com/djazair-language/djazair-vs-code.git ~/.vscode/extensions/djazair-vs-code
     ```
2. Restart your editor.

### Option 2: VSIX File
1. Open VS Code.
2. Open the Extensions View (`Ctrl+Shift+X`).
3. Click **`...`** → **Install from VSIX...** and select the `.vsix` file.

---

## ⚙️ Configuration Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `djazair.compilerPath` | `"djazair"` | Path to the `djazair` compiler executable. The extension auto-discovers it from `PATH` or local build directories. |

---

## 🛠️ Developer Guide & Packaging

### Prerequisites
```bash
npm install -g @vscode/vsce
```

### Packaging
```bash
vsce package
```
Generates `djazair-language-1.1.1.vsix` in the project root.

### Project Structure
```
djazair-vs-extension/
├── extension.js          # Entry point — registers all providers
├── src/
│   ├── docs.js           # Built-in function & keyword documentation database
│   ├── linter.js         # Real-time error detection (runs djazair --check)
│   ├── formatter.js      # Code auto-formatter
│   ├── hover.js          # Hover tooltip provider
│   ├── completion.js     # IntelliSense / auto-complete provider
│   ├── signature.js      # Signature help provider
│   ├── codelens.js       # Run button (CodeLens + title bar)
│   └── symbols.js        # Outline view (Document Symbols)
├── syntaxes/
│   └── djazair.tmLanguage.json   # TextMate grammar
├── snippets/
│   └── djazair.json              # Code snippets
└── images/
    └── dz-file-icon.svg          # Custom .dz file icon
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Check the [issues page](https://github.com/djazair-language/djazair-vs-code/issues).

---

## 📄 License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.
