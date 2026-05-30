<div align="center">

<pre>
██████╗ ██████╗ ██╗██╗   ██╗███████╗
██╔══██╗██╔══██╗██║██║   ██║██╔════╝
██████╔╝██████╔╝██║██║   ██║█████╗  
██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝  
██║     ██║  ██║██║ ╚████╔╝ ███████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
</pre>

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-79.9%25-7c3aed?style=flat-square&logo=typescript&logoColor=white&labelColor=dc2626)
![JavaScript](https://img.shields.io/badge/JavaScript-20.1%25-7c3aed?style=flat-square&logo=javascript&logoColor=white&labelColor=dc2626)
![Node.js](https://img.shields.io/badge/Node.js-LTS-8b5cf6?style=flat-square&logo=node.js&logoColor=white&labelColor=dc2626)
![Ollama](https://img.shields.io/badge/Ollama-Local-a78bfa?style=flat-square&labelColor=dc2626)
![Qwen3](https://img.shields.io/badge/Qwen3-Powered-f87171?style=flat-square&labelColor=dc2626)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-dc2626?style=flat-square&labelColor=7c3aed)
![License](https://img.shields.io/badge/License-Public-dc2626?style=flat-square&labelColor=8b5cf6)
![Status](https://img.shields.io/badge/Status-Active%20Development-dc2626?style=flat-square&labelColor=a78bfa)

<br/>

# ⚡ Prive

### Your Local AI Coding Companion

*Chat. Code. Build. Ship.*

**No subscriptions. No cloud dependency. No API bills.**

Powered entirely by local AI models through Ollama.

<br/>

<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Vub255azJteHhjM3RtcXQ4ZXQ3OXA1Z3M0ZzFwOGd1dW1xZ3ltYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a35yA17T8X9dZZI14w/giphy.gif" alt="Prive Terminal Motion Graphic" width="100%" style="border-radius: 8px; border: 2px solid #dc2626; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);"/>

</div>

---

## 🚀 Overview

Prive is an open-source, terminal-first AI coding assistant designed for developers who want complete control over their workflow.

Unlike cloud-based coding assistants, Prive runs entirely on your machine using local language models such as **Qwen**, **DeepSeek**, and **Llama** through Ollama.

No accounts. No API keys. No monthly bills. **Just code.**

---

## ✨ Features

### 🤖 Local AI Engine

- Powered by Ollama
- Supports Qwen, DeepSeek and Llama
- Fully offline capable
- No API keys required
- No usage limits
- Privacy-first architecture

### 💬 Interactive Chat

```bash
prive
```

* Project-aware conversations
* Multi-turn memory
* Natural language development workflows
* Context-aware responses

### 📂 Workspace Intelligence

```bash
prive read src/App.tsx
```

* Read files
* Analyze repositories
* Generate architecture summaries
* Understand project structure

### ✏️ Code Generation & Editing

```bash
prive write
```

* Create files
* Modify files
* Refactor code
* Generate boilerplate
* Implement features

### 💻 Terminal Automation

```bash
prive run npm install
```

* Execute commands
* Capture output
* Monitor processes
* Smart command suggestions

### 🌿 Git Integration

```bash
prive git status
prive git commit
prive git push
```

* Repository analysis
* Commit generation
* Branch management
* Release workflows

### 🧠 Memory System

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

## 🛰️ Planned Advanced Features

* 🤖 Multi-Agent Architecture
* 🧠 Autonomous Task Planning
* 📦 Plugin Ecosystem
* 🖥 Desktop Studio
* 🎙 Voice Development
* 🔍 Intelligent Project Search
* ⚡ Workflow Automation
* 🌐 Remote Workspace Support

---

## 🧱 Project Structure

```text
Prive/
│
├── src/
│   ├── cli/           # Terminal UI
│   ├── ai/            # Model communication
│   ├── filesystem/    # I/O operations
│   ├── terminal/      # Command execution
│   ├── git/           # VCS integration
│   ├── agents/        # Autonomous tasks
│   ├── config/        # Setup
│   └── utils/         # Helpers
│
├── tests/
├── docs/
├── .prive/            # Local memory store
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 🏗 Architecture Blueprint

```mermaid
graph TD
    User([Developer]) -->|Prompt| CLI[Prive CLI];
    CLI --> Agents[Agent Layer];
    Agents -->|Read/Write| FS[Filesystem];
    Agents -->|Execute| Term[Terminal];
    Agents --> AI[AI Layer];
    AI <--> Ollama[Ollama];
    Ollama <--> Models[[Qwen / DeepSeek]];
```

---

## 🚀 Installation Protocol

**1. Clone the repository:**
```bash
git clone [https://github.com/vin1397/prive.git](https://github.com/vin1397/prive.git)
cd prive
```

**2. Install dependencies & run:**
```bash
npm install
npm run dev
```

**3. Setup Ollama Requirements:**
```bash
ollama pull qwen3
ollama list
```

---

## 🛣 Roadmap

### Phase 1 
* 🟩 Interactive Chat
* 🟩 Ollama Integration
* 🟩 Terminal UI
* 🟩 Qwen Support

### Phase 2
* ⬜ File Reading & Writing
* ⬜ Project Search
* ⬜ Terminal Commands Integration

### Phase 3
* ⬜ Git Integration
* ⬜ Local Memory Storage

### Phase 4
* ⬜ Multi-Agent Architecture
* ⬜ Autonomous Task Planning

### Phase 5
* ⬜ Desktop Studio UI
* ⬜ Voice Development Integration

---

## 🤝 Contributing & License

Contributions, suggestions, bug reports, and pull requests are welcome. Let's build the future of local AI together.

Distributed under the **MIT License**.

---

<div align="center">

Built for **Prive** 💜 by **~Vin**

### Prive — Your Local AI Coding Companion

</div>