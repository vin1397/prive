<div align="center">

# ⚡ Prive

**Your Local AI Coding Companion**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue)](https://typescriptlang.org)
[![Ollama](https://img.shields.io/badge/Powered%20by-Ollama-orange)](https://ollama.ai)

*An open-source, local-first AI coding assistant. No cloud. No API keys. Just you and your models.*

</div>

---

## What is Prive?

Prive is a terminal-based AI coding assistant that runs entirely on your machine using [Ollama](https://ollama.ai) and local models. It's inspired by tools like Claude Code, Cursor, and Aider — but with a hard commitment to **privacy** and **local-first** operation.

Your code never leaves your machine.

---

## Features

- **💬 AI Chat** — Conversational coding assistance with full context memory
- **📂 File Context** — Read files into the AI's context for targeted help
- **✍️ Code Generation** — Generate, refactor, and explain code
- **🐛 Debugger** — Analyze errors and apply AI-generated fixes
- **🏗️ Architect** — Analyze and improve your project's structure
- **🔀 Git Integration** — Status, commit, push, and branch from the CLI
- **🖥️ Terminal** — Run commands with a built-in safety sandbox
- **🧠 Session Memory** — Conversations are saved locally in `.prive/`
- **🔌 Multi-Model** — Works with any Ollama-compatible model
- **🔒 100% Local** — All data stays on your machine

---

## Requirements

- [Node.js](https://nodejs.org) 18+
- [Ollama](https://ollama.ai) running locally
- At least one Ollama model installed

---

## Installation

### 1. Install Ollama

Follow instructions at [ollama.ai](https://ollama.ai) for your platform, then start it:

```bash
ollama serve
```

### 2. Pull a model

```bash
# Recommended for coding
ollama pull qwen2.5-coder

# Alternative options
ollama pull deepseek-coder-v2
ollama pull codellama
ollama pull llama3.2
```

### 3. Install Prive

```bash
# Clone and install
git clone https://github.com/your-org/prive.git
cd prive
npm install
npm run build
npm link
```

Or install globally from npm (when published):

```bash
npm install -g prive
```

---

## Quick Start

```bash
# Navigate to your project
cd ~/my-project

# Start Prive
prive
```

You'll see:

```
⚡ Prive v0.1
  Your Local AI Coding Companion

  🤖 Model:   qwen2.5-coder
  📂 Project: my-project

  Type a message to chat, /help for commands, /exit to quit.

❯
```

---

## Usage

### Chat (just type)

```
❯ explain what this project does
❯ how do I add rate limiting to my Express routes?
❯ what's the idiomatic way to handle errors in Go?
```

### Read files into context

```
❯ /read src/App.tsx
❯ what does this component do?
❯ refactor this to use React hooks
```

### Generate and write code

```
❯ /write src/utils/date.ts utility functions for date formatting in TypeScript
```

### Debug errors

```
❯ /debug TypeError: Cannot read properties of undefined (reading 'map')
```

### Git workflow

```
❯ /git status
❯ /git commit feat: add user authentication
❯ /git push
```

### Run terminal commands

```
❯ /run npm install
❯ /run npm test
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/read <file>` | Read a file into context |
| `/write <file> <task>` | Generate code and write to file |
| `/list` | List project files |
| `/tree [depth]` | Show project file tree |
| `/run <cmd>` | Execute a terminal command |
| `/git <status\|commit\|push\|branch\|log>` | Git operations |
| `/model [name]` | Show or change active model |
| `/grep <pattern>` | Search file contents |
| `/context [clear]` | Show or clear session context |
| `/history` | Show chat history |
| `/memory [clear]` | View or clear saved sessions |
| `/architect` | Analyze project architecture |
| `/debug <error>` | Debug an error |
| `/clear` | Clear terminal |
| `/exit` | Exit Prive |

Full command reference: [docs/commands.md](docs/commands.md)

---

## Configuration

Prive looks for `.prive/settings.json` in your project directory:

```json
{
  "model": "qwen2.5-coder",
  "ollamaHost": "http://localhost:11434",
  "temperature": 0.7,
  "streamResponses": true,
  "autoSaveMemory": true,
  "maxHistoryLength": 50
}
```

Change your model on the fly:

```
❯ /model deepseek-coder-v2
```

---

## Supported Models

| Model | Best For |
|-------|----------|
| `qwen2.5-coder` ⭐ | Code generation, review, refactoring |
| `deepseek-coder-v2` ⭐ | Complex algorithms, multi-language |
| `codellama` | Code completion |
| `llama3.2` | General questions, explanations |
| `mistral` | Fast general-purpose |

Any Ollama-compatible model works — these are just recommendations.

---

## Project Structure

```
src/
├── cli/          # Entry point, command router, prompt
├── ai/           # Ollama client, chat, context, memory
├── filesystem/   # File read/write/search/tree
├── terminal/     # Command execution and safety sandbox
├── git/          # Git operations
├── agents/       # Coder, Debugger, Architect agents
├── config/       # Constants, model metadata, settings
└── utils/        # Logger, spinner, helpers
```

See [docs/architecture.md](docs/architecture.md) for a full architecture overview.

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (ts-node)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Watch tests
npm run test:watch
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

See [docs/roadmap.md](docs/roadmap.md) for planned features.

---

## Privacy

Prive is designed with privacy as a core principle:

- **No telemetry** — zero analytics or usage tracking
- **No cloud calls** — all AI inference happens locally via Ollama
- **Local storage only** — session memory stored in `.prive/` in your project
- **Open source** — audit every line yourself

---

## License

[MIT](LICENSE) © Prive Contributors
