/**
 * Prive VS Code Extension — main entry point (Phase 6)
 *
 * Build: cd vscode-extension && npm run build
 * Debug: Press F5 in VS Code to open an Extension Development Host
 */

import * as vscode from 'vscode';

// ── Types ─────────────────────────────────────────────────────────────────

interface OllamaMessage { role: 'user' | 'assistant' | 'system'; content: string; }
interface StreamChunk    { message?: { content: string }; done: boolean; }

// ── Config helpers ────────────────────────────────────────────────────────

function cfg<T>(key: string, fallback: T): T {
  return vscode.workspace.getConfiguration('prive').get<T>(key, fallback);
}

function ollamaHost(): string { return cfg('ollamaHost', 'http://localhost:11434'); }
function model():      string { return cfg('model', 'qwen2.5-coder'); }

// ── Ollama client ─────────────────────────────────────────────────────────

async function ollamaAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${ollamaHost()}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch { return false; }
}

async function listModels(): Promise<string[]> {
  try {
    const r = await fetch(`${ollamaHost()}/api/tags`);
    const d = await r.json() as { models: Array<{ name: string }> };
    return d.models?.map(m => m.name) ?? [];
  } catch { return []; }
}

async function* streamChat(
  messages: OllamaMessage[],
  chosenModel: string,
): AsyncGenerator<string> {
  const res = await fetch(`${ollamaHost()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: chosenModel, messages, stream: true }),
  });

  if (!res.ok || !res.body) throw new Error(`Ollama error: HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line) as StreamChunk;
        if (chunk.message?.content) yield chunk.message.content;
        if (chunk.done) return;
      } catch { /* skip */ }
    }
  }
}

async function chatOnce(messages: OllamaMessage[], chosenModel: string): Promise<string> {
  let out = '';
  for await (const chunk of streamChat(messages, chosenModel)) { out += chunk; }
  return out;
}

// ── Webview chat panel ────────────────────────────────────────────────────

class PriveChatPanel {
  static currentPanel: PriveChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _history: OllamaMessage[] = [];
  private _disposables: vscode.Disposable[] = [];

  static create(context: vscode.ExtensionContext): PriveChatPanel {
    if (PriveChatPanel.currentPanel) {
      PriveChatPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return PriveChatPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'priveChat', 'Prive AI Chat',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    PriveChatPanel.currentPanel = new PriveChatPanel(panel, context);
    return PriveChatPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, _context: vscode.ExtensionContext) {
    this._panel = panel;
    this._panel.webview.html = this._buildHtml();

    this._panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'send') await this._handleMessage(msg.text);
      if (msg.type === 'clear') { this._history = []; }
    }, null, this._disposables);

    this._panel.onDidDispose(() => {
      PriveChatPanel.currentPanel = undefined;
      this._disposables.forEach(d => d.dispose());
    });
  }

  async sendWithContext(userMessage: string, context?: string): Promise<void> {
    this._panel.reveal(vscode.ViewColumn.Two);
    const full = context ? `${context}\n\n${userMessage}` : userMessage;
    await this._handleMessage(full, userMessage);
  }

  private async _handleMessage(text: string, displayText?: string): Promise<void> {
    this._history.push({ role: 'user', content: text });
    this._panel.webview.postMessage({ type: 'user', text: displayText ?? text });

    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are Prive, an expert AI coding assistant running locally via VS Code.
Be concise and precise. Use markdown code blocks with language tags.
Current file: ${vscode.window.activeTextEditor?.document.fileName ?? 'unknown'}`,
      },
      ...this._history,
    ];

    let full = '';
    try {
      for await (const chunk of streamChat(messages, model())) {
        full += chunk;
        this._panel.webview.postMessage({ type: 'chunk', text: chunk });
      }
      this._panel.webview.postMessage({ type: 'done' });
      this._history.push({ role: 'assistant', content: full });
    } catch (err) {
      this._panel.webview.postMessage({ type: 'error', text: String(err) });
    }
  }

  private _buildHtml(): string {
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<style>
  body { background:#080808; color:#e2e8f0; font:13px system-ui; margin:0; display:flex; flex-direction:column; height:100vh; }
  #messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
  .msg { line-height:1.6; white-space:pre-wrap; word-break:break-word; }
  .msg.user  { color:#c084fc; }
  .msg.user::before  { content:'You  · '; font-size:10px; opacity:.5; }
  .msg.ai    { color:#e2e8f0; }
  .msg.ai::before    { content:'Prive · '; font-size:10px; color:#7c3aed; }
  .msg.error { color:#f87171; }
  pre { background:#0d0d0d; border:1px solid #1e1020; border-radius:4px; padding:10px; overflow-x:auto; font-family:monospace; font-size:11px; }
  code { background:#111; border-radius:3px; padding:1px 4px; font-family:monospace; color:#c084fc; }
  .input-row { display:flex; gap:8px; padding:10px; border-top:1px solid #1e1020; }
  textarea { flex:1; background:#0d0d0d; border:1px solid #2a1a3a; border-radius:4px; color:#e2e8f0; font:13px system-ui; padding:7px 10px; resize:none; height:38px; outline:none; }
  textarea:focus { border-color:#7c3aed; }
  button { background:#7c3aed; border:none; border-radius:4px; color:#fff; padding:0 14px; cursor:pointer; font-size:13px; }
  button:hover { background:#a855f7; }
  button.clear { background:#1e1020; color:#666; }
  button.clear:hover { color:#e2e8f0; }
</style></head><body>
<div id="messages"></div>
<div class="input-row">
  <textarea id="inp" placeholder="Ask Prive anything…" rows="1"
    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}"></textarea>
  <button onclick="send()">▶</button>
  <button class="clear" onclick="clear_()">✕</button>
</div>
<script>
  const vscode = acquireVsCodeApi();
  const msgs   = document.getElementById('messages');
  let aiDiv    = null;
  let aiText   = '';

  function send() {
    const inp = document.getElementById('inp');
    const t   = inp.value.trim();
    if (!t) return;
    inp.value = '';
    inp.style.height = '38px';
    vscode.postMessage({ type: 'send', text: t });
  }

  function clear_() {
    msgs.innerHTML = '';
    aiDiv = null; aiText = '';
    vscode.postMessage({ type: 'clear' });
  }

  function fmt(text) {
    return text
      .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, (_,l,c)=>\`<pre><code>\${c.trim()}</code></pre>\`)
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
  }

  window.addEventListener('message', e => {
    const m = e.data;
    if (m.type === 'user') {
      const d = document.createElement('div');
      d.className = 'msg user';
      d.innerHTML = fmt(m.text);
      msgs.appendChild(d);
      aiDiv = null; aiText = '';
    }
    if (m.type === 'chunk') {
      if (!aiDiv) {
        aiDiv = document.createElement('div');
        aiDiv.className = 'msg ai';
        msgs.appendChild(aiDiv);
      }
      aiText += m.text;
      aiDiv.innerHTML = fmt(aiText);
      msgs.scrollTop = msgs.scrollHeight;
    }
    if (m.type === 'done') {
      aiDiv = null; aiText = '';
    }
    if (m.type === 'error') {
      const d = document.createElement('div');
      d.className = 'msg error';
      d.textContent = m.text;
      msgs.appendChild(d);
    }
    msgs.scrollTop = msgs.scrollHeight;
  });

  document.getElementById('inp').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
</script></body></html>`;
  }
}

// ── Commands ──────────────────────────────────────────────────────────────

async function getActiveFileContext(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return '';
  const doc = editor.document;
  return `## File: ${doc.fileName}\n\`\`\`${doc.languageId}\n${doc.getText().slice(0, 6000)}\n\`\`\``;
}

async function getSelectionContext(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) return '';
  const doc  = editor.document;
  const text = doc.getText(editor.selection);
  return `## Selected code (${doc.fileName}):\n\`\`\`${doc.languageId}\n${text}\n\`\`\``;
}

// ── Activation ────────────────────────────────────────────────────────────

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Check Ollama on startup
  const available = await ollamaAvailable();
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text  = available ? `$(zap) Prive · ${model()}` : `$(warning) Prive offline`;
  statusBar.color = available ? '#c084fc' : '#f87171';
  statusBar.command = 'prive.openChat';
  statusBar.tooltip = available ? `Prive connected · ${ollamaHost()}` : 'Prive: Ollama not reachable';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Re-check every 30s
  const checker = setInterval(async () => {
    const ok = await ollamaAvailable();
    statusBar.text  = ok ? `$(zap) Prive · ${model()}` : `$(warning) Prive offline`;
    statusBar.color = ok ? '#c084fc' : '#f87171';
  }, 30_000);
  context.subscriptions.push({ dispose: () => clearInterval(checker) });

  // ── Register commands ────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('prive.openChat', () => {
      PriveChatPanel.create(context);
    }),

    vscode.commands.registerCommand('prive.explainFile', async () => {
      const panel = PriveChatPanel.create(context);
      const fileCtx = await getActiveFileContext();
      const selCtx  = await getSelectionContext();
      await panel.sendWithContext('Explain this code in detail.', selCtx || fileCtx);
    }),

    vscode.commands.registerCommand('prive.refactorFile', async () => {
      const instruction = await vscode.window.showInputBox({
        prompt: 'Refactor instruction',
        placeHolder: 'e.g. use async/await, add error handling, simplify…',
      });
      if (!instruction) return;
      const panel   = PriveChatPanel.create(context);
      const fileCtx = await getActiveFileContext();
      await panel.sendWithContext(instruction, fileCtx);
    }),

    vscode.commands.registerCommand('prive.debugSelection', async () => {
      const panel  = PriveChatPanel.create(context);
      const selCtx = await getSelectionContext();
      if (!selCtx) { vscode.window.showWarningMessage('Select some code first.'); return; }
      await panel.sendWithContext('Debug this code — identify issues and provide fixes.', selCtx);
    }),

    vscode.commands.registerCommand('prive.generateTests', async () => {
      const panel   = PriveChatPanel.create(context);
      const fileCtx = await getActiveFileContext();
      await panel.sendWithContext(
        'Generate comprehensive unit tests for this file. Include edge cases.',
        fileCtx,
      );
    }),

    vscode.commands.registerCommand('prive.gitCommit', async () => {
      const wf = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!wf) return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Prive: generating commit message…' },
        async () => {
          const msg = await chatOnce(
            [{ role: 'user', content: `Analyze the staged changes in a git repo at ${wf} and write a concise, conventional commit message. Reply with ONLY the commit message, nothing else.` }],
            model(),
          );
          const trimmed = msg.trim().replace(/^["']|["']$/g, '');
          await vscode.env.clipboard.writeText(trimmed);
          vscode.window.showInformationMessage(`Commit message copied: ${trimmed}`);
        },
      );
    }),

    vscode.commands.registerCommand('prive.switchModel', async () => {
      const models = await listModels();
      if (!models.length) { vscode.window.showWarningMessage('No models found. Is Ollama running?'); return; }

      const chosen = await vscode.window.showQuickPick(models, {
        placeHolder: 'Select a model',
        title: 'Prive: Switch Model',
      });
      if (!chosen) return;

      await vscode.workspace.getConfiguration('prive').update('model', chosen, vscode.ConfigurationTarget.Global);
      statusBar.text = `$(zap) Prive · ${chosen}`;
      vscode.window.showInformationMessage(`Prive: switched to ${chosen}`);
    }),
  );
}

export function deactivate(): void { /* nothing to clean up */ }
