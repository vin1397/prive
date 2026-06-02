/**
 * Prive Desktop — Electron main process (Phase 5)
 *
 * Install deps first:
 *   npm install --save-dev electron electron-builder
 *
 * Run:
 *   npx electron src/desktop/main.js   (after build)
 *   npm run desktop                    (via package.json script)
 */

// NOTE: This file uses CommonJS-style dynamic requires because Electron's
// main process must be CJS. It is compiled separately via tsconfig.desktop.json.

import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOllamaClient } from '../ai/ollama.js';
import { ChatManager } from '../ai/chat.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { readFile, readFileInfo } from '../filesystem/read.js';
import { writeFile } from '../filesystem/write.js';
import { findFiles, grepFiles } from '../filesystem/search.js';
import { execute } from '../terminal/execute.js';
import { getStatus } from '../git/status.js';
import { commit } from '../git/commit.js';
import { loadSettings, updateSetting } from '../config/settings.js';
import { getMemoryManager } from '../ai/memory.js';
import { TaskPlanner } from '../agents/planner.js';
import os from 'os';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Window management ─────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
const chatManagers = new Map<string, ChatManager>();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 820,
    minWidth:  900,
    minHeight: 600,
    backgroundColor: '#080808',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Prive — Your Local AI Coding Companion',
  });

  // Load UI
  const uiPath = path.join(__dirname, 'ui', 'index.html');
  mainWindow.loadFile(uiPath);

  // Open DevTools in dev mode
  if (process.env.PRIVE_DEV === '1') {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App menu ──────────────────────────────────────────────────────────────

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Prive',
      submenu: [
        { label: 'About Prive', role: 'about' },
        { type: 'separator' },
        { label: 'Quit Prive', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC Handlers — AI ─────────────────────────────────────────────────────

ipcMain.handle('ai:chat', async (_event, { sessionId, message, model }: {
  sessionId: string; message: string; model?: string;
}) => {
  if (!chatManagers.has(sessionId)) {
    const settings = await loadSettings();
    chatManagers.set(sessionId, new ChatManager({ model: model ?? settings.model }));
  }
  const chat = chatManagers.get(sessionId)!;
  if (model) chat.setModel(model);

  let fullResponse = '';
  await chat.send(message, {
    stream: true,
    onChunk: (chunk) => {
      fullResponse += chunk;
      mainWindow?.webContents.send('ai:chunk', { sessionId, chunk });
    },
  });
  mainWindow?.webContents.send('ai:done', { sessionId });
  return { response: fullResponse };
});

ipcMain.handle('ai:clearSession', async (_event, { sessionId }: { sessionId: string }) => {
  const chat = chatManagers.get(sessionId);
  if (chat) chat.clearHistory();
  return { cleared: true };
});

ipcMain.handle('ai:listModels', async () => {
  const settings = await loadSettings();
  const client = getOllamaClient(settings.ollamaHost);
  const models  = await client.listModels();
  return { models: models.map(m => m.name) };
});

ipcMain.handle('ai:isAvailable', async () => {
  const settings = await loadSettings();
  const client = getOllamaClient(settings.ollamaHost);
  return { available: await client.isAvailable() };
});

// ── IPC Handlers — Filesystem ─────────────────────────────────────────────

ipcMain.handle('fs:tree', async (_event, { cwd, depth }: { cwd: string; depth?: number }) => {
  const tree = await generateProjectTree(cwd, { maxDepth: depth ?? 4 });
  return { tree };
});

ipcMain.handle('fs:readFile', async (_event, { path: filePath }: { path: string }) => {
  const info = await readFileInfo(filePath);
  return { content: info.content, lines: info.lines, size: info.size };
});

ipcMain.handle('fs:writeFile', async (_event, { path: filePath, content }: { path: string; content: string }) => {
  await writeFile(filePath, content, { backup: true });
  return { written: true };
});

ipcMain.handle('fs:findFiles', async (_event, { cwd, query }: { cwd: string; query?: string }) => {
  const files = await findFiles(undefined, { cwd, maxResults: 200 });
  const filtered = query
    ? files.filter(f => f.toLowerCase().includes(query.toLowerCase()))
    : files;
  return { files: filtered.map(f => f.replace(cwd + '/', '').replace(cwd + '\\', '')) };
});

ipcMain.handle('fs:grep', async (_event, { cwd, query }: { cwd: string; query: string }) => {
  const results = await grepFiles(query, { cwd, maxResults: 50 });
  return { results };
});

// ── IPC Handlers — Terminal ───────────────────────────────────────────────

ipcMain.handle('terminal:run', async (_event, { command, cwd }: { command: string; cwd: string }) => {
  const result = await execute(command, { cwd });
  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, success: result.success };
});

// ── IPC Handlers — Git ────────────────────────────────────────────────────

ipcMain.handle('git:status', async (_event, { cwd }: { cwd: string }) => {
  return getStatus(cwd);
});

ipcMain.handle('git:commit', async (_event, { message, cwd }: { message: string; cwd: string }) => {
  return commit(message, [], { all: true }, cwd);
});

// ── IPC Handlers — System ─────────────────────────────────────────────────

ipcMain.handle('system:metrics', async () => {
  const cpus  = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const [k, v] of Object.entries(cpu.times)) {
      total += v;
      if (k === 'idle') idle += v;
    }
  }
  const cpuPct = Math.round(100 - (idle / total) * 100);
  const memTotal = os.totalmem();
  const memUsed  = memTotal - os.freemem();

  return {
    cpu:      cpuPct,
    memUsed:  Math.round(memUsed  / 1024 / 1024 / 1024 * 10) / 10,
    memTotal: Math.round(memTotal / 1024 / 1024 / 1024 * 10) / 10,
    memPct:   Math.round((memUsed / memTotal) * 100),
    uptime:   os.uptime(),
    platform: os.platform(),
    arch:     os.arch(),
    cores:    cpus.length,
  };
});

ipcMain.handle('settings:load', async () => loadSettings());
ipcMain.handle('settings:set', async (_event, { key, value }: { key: string; value: unknown }) => {
  await updateSetting(key as never, value as never);
  return { updated: true };
});

ipcMain.handle('memory:sessions', async (_event, { cwd }: { cwd: string }) => {
  const mem = getMemoryManager(cwd);
  return mem.getRecentSessions(20);
});

// ── IPC Handlers — Planner ────────────────────────────────────────────────

ipcMain.handle('planner:plan', async (_event, { goal, cwd }: { goal: string; cwd: string }) => {
  const planner = new TaskPlanner();
  return planner.plan(goal, cwd);
});

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
