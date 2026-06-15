# Djazair VS Code Extension

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/organization-djazair--language-blue.svg)](https://github.com/djazair-language)
[![VS Code](https://img.shields.io/badge/editor-VS%20Code-purple.svg)](https://code.visualstudio.com/)

**Official extension providing rich language support for the Djazair programming language.**

[Features](#-features) · [Compatibility](#-compatibility) · [Installation](#-installation) · [Contributing](#-contributing)

</div>

---

This extension provides syntax highlighting, language configuration, and snippets for **Djazair (`.dz`)** source files, enabling a smooth and productive development experience in modern editors and AI development environments.

---

## ✨ Features

- **Syntax Highlighting**: Full tokenization for Djazair syntax, including keywords (`let`, `var`, `fn`, `class`, `is`, `try`, `catch`, `finally`, `end`), data types, strings, interpolation, and comments.
- **Language Configuration**:
  - Auto-closing brackets, quotes, and parentheses.
  - Bracket surrounding logic.
  - Comment toggling support (single-line `#` and multi-line `#! ... !#`).
- **Code Snippets**: Built-in templates for quick coding, including:
  - Variable declarations and loops.
  - Function definitions (`fn`).
  - Class structures with constructors (`init`).
  - Error handling (`try/catch`).

---

## 💻 Compatibility

This extension is built on standard VS Code API specifications and is fully compatible with:
* **VS Code** (Visual Studio Code)
* **Antigravity IDE**
* **Cursor**
* **VSCodium**
* Other compatible desktop and web-based VS Code-like editors.

---

## ⚡ Installation

### Manual Installation
Since the extension is currently in development/private release, you can install it manually by placing it in your extensions directory:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/djazair-language/djazair-vs-code.git
   ```
2. Move the cloned directory into your editor's extensions folder:
   - **Windows**: `%USERPROFILE%\.vscode\extensions\`
   - **Linux / macOS**: `~/.vscode/extensions/`
3. Restart your editor.

---

## 🤝 Contributing

Contributions, bug reports, and syntax improvements are welcome!

1. **Fork** the repository.
2. Create your feature branch (`git checkout -b feature/improved-highlighting`).
3. Commit your changes.
4. Push to the branch.
5. Open a **Pull Request**.

---

## 📄 License

This extension is licensed under the MIT License. See [LICENSE](LICENSE) for details.
