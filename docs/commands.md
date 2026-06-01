# Prive Commands Reference

## Usage

Start Prive in your project directory:

```bash
prive
```

Once running, type any message to chat with the AI, or use a `/command`.

---

## Chat (Default)

Simply type any message — no slash needed:

```
❯ explain what this codebase does
❯ how do I add authentication to this Express app?
❯ what's the best way to handle errors in TypeScript?
```

---

## Commands

### `/help [command]`
**Aliases:** `/h`, `/?`

Show all available commands, or details for a specific command.

```
❯ /help
❯ /help git
❯ /help read
```

---

### `/read <file>`
**Aliases:** `/r`, `/open`

Read a file and add it to the AI's context. The AI will then be aware of the file's contents.

```
❯ /read src/App.tsx
❯ /read package.json
❯ /read src/utils/helpers.ts
```

After reading, ask the AI about it:
```
❯ /read src/auth.ts
❯ refactor this to use async/await throughout
```

---

### `/write <file> <instruction>`
**Aliases:** `/w`, `/save`

Generate code and write it to a file.

```
❯ /write src/utils/date.ts utility functions for date formatting
❯ /write tests/auth.test.ts unit tests for the auth module
```

---

### `/list [pattern]`
**Aliases:** `/ls`

List source files in the project (excludes `node_modules`, `dist`, etc.).

```
❯ /list
❯ /list *.ts
```

---

### `/tree [depth]`
**Aliases:** `/t`

Display the project file tree. Optional depth argument (default: 3).

```
❯ /tree
❯ /tree 4
```

---

### `/run <command>`
**Aliases:** `/exec`, `/x`

Execute a terminal command. Output is streamed in real time.
Dangerous commands are blocked by the sandbox.

```
❯ /run npm install
❯ /run npm run build
❯ /run npm test
❯ /run node scripts/migrate.js
```

---

### `/git <subcommand>`
**Aliases:** `/g`

Git operations:

| Subcommand | Description |
|------------|-------------|
| `status` | Show working tree status |
| `commit <message>` | Stage all changes and commit |
| `push` | Push to origin |
| `branch [name]` | List branches, or create/switch |
| `log [count]` | Show recent commits |

```
❯ /git status
❯ /git commit feat: add user authentication
❯ /git push
❯ /git branch feature/dark-mode
❯ /git log 5
```

---

### `/model [name]`
**Aliases:** `/m`

Show installed models or switch to a different one.

```
❯ /model                        # list all available models
❯ /model deepseek-coder-v2      # switch model
❯ /model qwen2.5-coder:7b
```

---

### `/grep <pattern>`
**Aliases:** `/search`, `/find`

Search all project files for a text pattern.

```
❯ /grep useState
❯ /grep "async function"
❯ /grep TODO
```

---

### `/context [clear]`
**Aliases:** `/ctx`

Show current session info (model, message count, token estimate) or clear history.

```
❯ /context         # show session info
❯ /context clear   # clear message history
```

---

### `/history`
**Aliases:** `/hist`

Show recent messages from the current session.

```
❯ /history
```

---

### `/memory [clear]`
**Aliases:** `/mem`

View saved sessions from previous runs, or clear all saved sessions.

```
❯ /memory
❯ /memory clear
```

---

### `/architect`
**Aliases:** `/arch`

Analyze the current project's architecture. Generates a project tree, reads key config files, and provides AI-powered architectural insights.

```
❯ /architect
```

---

### `/debug <error>`
**Aliases:** `/fix`

Analyze an error message or description and get debugging advice.

```
❯ /debug TypeError: Cannot read properties of undefined (reading 'map')
❯ /debug my tests are failing with ECONNREFUSED
```

---

### `/clear`
**Aliases:** `/cls`

Clear the terminal screen.

```
❯ /clear
```

---

### `/exit`
**Aliases:** `/quit`, `/q`

Exit Prive. The current session is automatically saved to `.prive/memory.json`.

```
❯ /exit
```

---

## Workflow Examples

### Understand a codebase
```
❯ /tree
❯ /read src/index.ts
❯ explain the entry point and main execution flow
❯ /read src/core/engine.ts
❯ how does this integrate with the rest of the app?
```

### Fix a bug
```
❯ /debug TypeError: Cannot read properties of null (reading 'id')
❯ /read src/components/UserCard.tsx
❯ /read src/hooks/useUser.ts
❯ fix the null reference issue in UserCard
❯ /write src/components/UserCard.tsx the fixed version
```

### Add a new feature
```
❯ /read src/api/routes.ts
❯ /read src/middleware/auth.ts
❯ add a POST /api/v1/users/avatar route for uploading profile pictures
❯ /write src/api/routes.ts updated routes file
❯ /git commit feat: add avatar upload route
```

### Code review
```
❯ /git status
❯ /read src/services/payment.ts
❯ review this payment service for security issues and edge cases
```
