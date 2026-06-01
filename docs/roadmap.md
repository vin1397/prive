# Prive Roadmap

## v0.1 — Foundation ✅

The baseline local AI coding assistant.

- [x] Ollama integration with streaming
- [x] Interactive CLI with command system
- [x] File read/write/search operations
- [x] Project tree generation
- [x] Git integration (status, commit, push, branch, log)
- [x] Terminal command execution with sandbox safety
- [x] Coder, Debugger, Architect agents
- [x] Session memory (`.prive/memory.json`)
- [x] Token-aware context management
- [x] Configurable model selection

---

## v0.2 — Intelligence

Smarter context and better workflows.

- [ ] **Auto-context** — automatically include relevant files based on the user's question
- [ ] **Inline diffs** — show before/after diffs instead of full file rewrites
- [ ] **Multi-file edits** — apply changes across multiple files in one operation
- [ ] **Project indexing** — index the codebase for faster file discovery
- [ ] **Semantic search** — find files by meaning, not just text pattern
- [ ] **Token usage display** — show token count per message
- [ ] **Session resume** — reload a past session and continue where you left off

---

## v0.3 — Tooling

Better developer experience.

- [ ] **Watch mode** — auto-reload context when files change
- [ ] **Test runner integration** — run tests and feed failures to the debugger
- [ ] **Linter integration** — ESLint / Pylint results piped to AI
- [ ] **Git diff context** — automatically include staged/unstaged diffs
- [ ] **Config file** — `prive.config.json` for per-project settings
- [ ] **Plugin system** — custom commands via JS plugins
- [ ] **Shell completions** — tab completion for commands

---

## v0.4 — Multi-Model

Support for multiple simultaneous models.

- [ ] **Model routing** — use a fast model for quick questions, slow model for complex tasks
- [ ] **Model comparison** — ask two models the same question and compare
- [ ] **Ollama model management** — pull, remove, and update models from within Prive
- [ ] **OpenAI-compatible backends** — support for LM Studio, Jan, LocalAI
- [ ] **Model benchmarking** — test models against your codebase

---

## v0.5 — Agents

Autonomous multi-step task execution.

- [ ] **Task planner** — break complex tasks into steps and execute them
- [ ] **PR agent** — automatically create a PR from a feature description
- [ ] **Refactor agent** — rename symbols, reorganize modules across the project
- [ ] **Test writer** — generate comprehensive tests for a module
- [ ] **Doc writer** — generate or update documentation automatically
- [ ] **Dependency auditor** — audit and update dependencies with AI assistance

---

## v1.0 — Stable

Production-ready release.

- [ ] Full test coverage (>80%)
- [ ] Windows, Linux, macOS CI
- [ ] Published to npm
- [ ] Comprehensive documentation site
- [ ] Community plugin registry
- [ ] Stability guarantee / semver

---

## Long-term Ideas

- **TUI dashboard** — rich terminal UI with panels for tree, chat, git
- **Prive Cloud Sync** *(optional, opt-in)* — sync settings across machines
- **VS Code extension** — embed Prive in the editor sidebar
- **Voice input** — speak to Prive using local Whisper
- **MCP server** — expose Prive as a Model Context Protocol server
