<div align="center">

<pre>
<font color="#dc2626">██████╗ ██████╗ ██╗██╗   ██╗███████╗</font>
<font color="#ef4444">██╔══██╗██╔══██╗██║██║   ██║██╔════╝</font>
<font color="#f87171">██████╔╝██████╔╝██║██║   ██║█████╗  </font>
<font color="#a78bfa">██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝  </font>
<font color="#8b5cf6">██║     ██║  ██║██║ ╚████╔╝ ███████╗</font>
<font color="#7c3aed">╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝</font>
</pre>

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-7c3aed?style=flat-square&logo=typescript&logoColor=white&labelColor=dc2626)
![JavaScript](https://img.shields.io/badge/JavaScript-20.1%25-7c3aed?style=flat-square&logo=typescript&logoColor=white&labelColor=dc2626)
![Node.js](https://img.shields.io/badge/Node.js-LTS-8b5cf6?style=flat-square&logo=node.js&logoColor=white&labelColor=dc2626)
![Ollama](https://img.shields.io/badge/Ollama-Local-a78bfa?style=flat-square&labelColor=dc2626)
![Qwen3](https://img.shields.io/badge/Qwen3-Powered-f87171?style=flat-square&labelColor=dc2626)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-dc2626?style=flat-square&labelColor=7c3aed)
![License](https://img.shields.io/badge/License-Public-dc2626?style=flat-square&labelColor=8b5cf6)
![Status](https://img.shields.io/badge/Status-Active%20Development-dc2626?style=flat-square&labelColor=a78bfa)

<br/>

# <font color="#dc2626">⚡ Prive</font>

### <font color="#ef4444">Your Local AI Coding Companion</font>

*Chat. Code. Build. Ship.*

**No subscriptions. No cloud dependency. No API bills.**

Powered entirely by local AI models through Ollama.

<br/>

<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Vub255azJteHhjM3RtcXQ4ZXQ3OXA1Z3M0ZzFwOGd1dW1xZ3ltYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a35yA17T8X9dZZI14w/giphy.gif" alt="Prive Terminal Motion Graphic" width="100%" style="border-radius: 8px; border: 2px solid #dc2626; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);"/>

</div>

---

# <font color="#f87171">🚀 Overview</font>

Prive is an open-source, terminal-first AI coding assistant designed for developers who want complete control over their workflow.

Unlike cloud-based coding assistants, Prive runs entirely on your machine using local language models such as Qwen, DeepSeek, and Llama through Ollama.

No accounts.

No API keys.

No monthly bills.

Just code.

---

# <font color="#a78bfa">✨ Features</font>

## <font color="#8b5cf6">🤖 Local AI Engine</font>

- Powered by Ollama
- Supports Qwen, DeepSeek and Llama
- Fully offline capable
- No API keys required
- No usage limits
- Privacy-first architecture

---

## <font color="#7c3aed">💬 Interactive Chat</font>

```bash
prive
```

* Project-aware conversations
* Multi-turn memory
* Natural language development workflows
* Context-aware responses

---

## <font color="#8b5cf6">📂 Workspace Intelligence</font>

```bash
prive read src/App.tsx
```

* Read files
* Analyze repositories
* Generate architecture summaries
* Understand project structure

---

## <font color="#a78bfa">✏️ Code Generation & Editing</font>

```bash
prive write
```

* Create files
* Modify files
* Refactor code
* Generate boilerplate
* Implement features

---

## <font color="#f87171">💻 Terminal Automation</font>

```bash
prive run npm install
```

* Execute commands
* Capture output
* Monitor processes
* Smart command suggestions

---

## <font color="#ef4444">🌿 Git Integration</font>

```bash
prive git status
prive git commit
prive git push
```

* Repository analysis
* Commit generation
* Branch management
* Release workflows

---

## <font color="#dc2626">🧠 Memory System</font>

Stored locally:

```text
.prive/
```

Capabilities:

* Session history
* Project preferences
* Workspace memory
* User settings

---

# <font color="#ef4444">🛰️ Planned Advanced Features</font>

* 🤖 Multi-Agent Architecture
* 🧠 Autonomous Task Planning
* 📦 Plugin Ecosystem
* 🖥 Desktop Studio
* 🎙 Voice Development
* 🔍 Intelligent Project Search
* ⚡ Workflow Automation
* 🌐 Remote Workspace Support

---

# <font color="#f87171">🧱 Project Structure</font>

```text
Prive/
│
├── src/
│   ├── cli/
│   ├── ai/
│   ├── filesystem/
│   ├── terminal/
│   ├── git/
│   ├── agents/
│   ├── config/
│   └── utils/
│
├── tests/
├── docs/
├── .prive/
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

# <font color="#a78bfa">🏗 Architecture</font>

```text
<font color="#dc2626">User</font>
 │
 ▼
<font color="#ef4444">Prive CLI</font>
 │
 ▼
<font color="#f87171">Agent Layer</font>
 │
 ▼
<font color="#a78bfa">AI Layer</font>
 │
 ▼
<font color="#8b5cf6">Ollama</font>
 │
 ▼
<font color="#7c3aed">Qwen / DeepSeek / Llama</font>
```

---

# <font color="#8b5cf6">🚀 Installation</font>

```bash
git clone [https://github.com/vin1397/prive.git](https://github.com/vin1397/prive.git)

cd prive

npm install

npm run dev
```

---

# <font color="#7c3aed">⚙️ Requirements</font>

```bash
ollama pull qwen3

ollama list
```

---

# <font color="#8b5cf6">⚡ Usage</font>

```bash
prive
```

Example:

```bash
prive explain project

prive read src/App.tsx

prive run npm install

prive git status

prive fix LoginScreen.tsx
```

---

# <font color="#a78bfa">🛣 Roadmap</font>

## Phase 1

* 🟩 Interactive Chat
* 🟩 Ollama Integration
* 🟩 Terminal UI
* 🟩 Qwen Support

## Phase 2

* ⬜ File Reading
* ⬜ File Writing
* ⬜ Project Search
* ⬜ Terminal Commands

## Phase 3

* ⬜ Git Integration
* ⬜ Local Memory

## Phase 4

* ⬜ Multi-Agent Architecture

## Phase 5

* ⬜ Desktop Studio

---

# <font color="#f87171">🤝 Contributing</font>

Contributions, suggestions, bug reports and pull requests are welcome.

---

# <font color="#ef4444">📜 License</font>

MIT License

---

<div align="center">

Built for "Prive" by ~Vini 💜

### Prive — Your Local AI Coding Companion

</div>