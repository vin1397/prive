# Prive Architecture

## Overview

Prive follows a layered, modular architecture designed for local-first operation,
extensibility, and clean separation of concerns.

```
User Input
    │
    ▼
┌──────────────────────────────────────────────┐
│                  CLI Layer                   │
│  src/cli/index.ts   src/cli/commands.ts      │
│  src/cli/prompt.ts                           │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Agent   │ │Filesystem│ │   Git    │
│  Layer   │ │  Layer   │ │  Layer   │
└────┬─────┘ └──────────┘ └──────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│                   AI Layer                   │
│  ollama.ts   chat.ts   context.ts  memory.ts │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│                  Ollama                      │
│         http://localhost:11434               │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│            Local LLM Model                   │
│   qwen2.5-coder / deepseek-coder-v2 / ...    │
└──────────────────────────────────────────────┘
```

---

## Layers

### CLI Layer (`src/cli/`)

The user-facing interactive shell. Responsibilities:
- Parse and route commands
- Manage the REPL loop
- Render prompts and output
- Handle startup / shutdown

**Key files:**
- `index.ts` — entry point, startup banner, interactive loop
- `commands.ts` — command registry and all command handlers
- `prompt.ts` — readline interface, input helpers

---

### AI Layer (`src/ai/`)

Handles all communication with the local AI backend.

**Key files:**

| File | Responsibility |
|------|---------------|
| `ollama.ts` | Raw HTTP client for the Ollama API |
| `chat.ts` | Conversation management, message history, context trimming |
| `context.ts` | Build structured file context for the AI |
| `memory.ts` | Persist and retrieve session history from `.prive/` |

**Context trimming:**
`ChatManager` trims the message history when it approaches `MAX_CONTEXT_TOKENS`
to avoid overflowing the model's context window. Oldest messages are dropped first.

---

### Agent Layer (`src/agents/`)

Specialized agents that combine AI + filesystem capabilities for specific tasks.

| Agent | Purpose |
|-------|---------|
| `CoderAgent` | Generate, refactor, and explain code |
| `DebuggerAgent` | Analyze errors and apply fixes |
| `ArchitectAgent` | Analyze project structure and suggest improvements |

Each agent uses its own `ChatManager` with a domain-specific system prompt.

---

### Filesystem Layer (`src/filesystem/`)

Pure I/O operations with no AI coupling.

| File | Exports |
|------|---------|
| `read.ts` | `readFile`, `readFiles`, `readFileInfo`, `fileExists` |
| `write.ts` | `writeFile`, `createFile`, `appendFile`, `deleteFile` |
| `search.ts` | `searchFiles`, `findFiles`, `grepFiles` |
| `tree.ts` | `generateProjectTree`, `getAllFilePaths` |

---

### Git Layer (`src/git/`)

Thin wrappers over `simple-git`.

| File | Exports |
|------|---------|
| `status.ts` | `getStatus`, `formatStatus`, `isGitRepo` |
| `commit.ts` | `commit`, `stageAll`, `getRecentCommits` |
| `push.ts` | `push`, `pull`, `fetchAll` |
| `branch.ts` | `listBranches`, `createBranch`, `checkoutBranch`, `mergeBranch` |

---

### Terminal Layer (`src/terminal/`)

| File | Exports |
|------|---------|
| `execute.ts` | `execute`, `executeStreaming`, `executeSequence` |
| `sandbox.ts` | `checkCommandSafety`, `isSafeCommand` |

The sandbox performs pattern matching against known destructive commands
before any execution occurs.

---

### Config Layer (`src/config/`)

| File | Purpose |
|------|---------|
| `constants.ts` | Immutable global constants |
| `models.ts` | Known Ollama model metadata |
| `settings.ts` | User settings (read/write to `.prive/settings.json`) |

---

### Utils Layer (`src/utils/`)

| File | Purpose |
|------|---------|
| `logger.ts` | Colored console output with log levels |
| `spinner.ts` | Ora spinner wrappers |
| `helpers.ts` | Pure utility functions (tokens, formatting, parsing) |

---

## Data Flow: Chat Request

```
1. User types: "refactor src/auth.ts to use async/await"
2. CLI dispatch() routes to handleChat()
3. ChatManager.send() is called
4. Context files are embedded in the prompt (if /read was used)
5. OllamaClient.chatStream() sends to Ollama HTTP API
6. Streamed tokens are printed via logger.ai()
7. Full response is stored in ChatManager message history
8. On /exit, MemoryManager.saveSession() persists the session
```

---

## Storage: `.prive/` Directory

```
.prive/
├── memory.json     # Saved conversation sessions (last 50)
├── projects.json   # Known projects and their last model/visit
└── settings.json   # User preferences
```

All data is local and never leaves the machine.
