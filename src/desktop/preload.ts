/**
 * Prive Desktop — Electron preload script
 * Exposes safe IPC bridge to the renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

// ── Type-safe API exposed to renderer ─────────────────────────────────────

contextBridge.exposeInMainWorld('prive', {

  // ── AI ────────────────────────────────────────────────────────────────
  ai: {
    chat: (sessionId: string, message: string, model?: string) =>
      ipcRenderer.invoke('ai:chat', { sessionId, message, model }),
    clearSession: (sessionId: string) =>
      ipcRenderer.invoke('ai:clearSession', { sessionId }),
    listModels: () =>
      ipcRenderer.invoke('ai:listModels'),
    isAvailable: () =>
      ipcRenderer.invoke('ai:isAvailable'),
    onChunk: (cb: (data: { sessionId: string; chunk: string }) => void) => {
      ipcRenderer.on('ai:chunk', (_e, data) => cb(data));
    },
    onDone: (cb: (data: { sessionId: string }) => void) => {
      ipcRenderer.on('ai:done', (_e, data) => cb(data));
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('ai:chunk');
      ipcRenderer.removeAllListeners('ai:done');
    },
  },

  // ── Filesystem ────────────────────────────────────────────────────────
  fs: {
    tree:      (cwd: string, depth?: number) => ipcRenderer.invoke('fs:tree', { cwd, depth }),
    readFile:  (path: string)                => ipcRenderer.invoke('fs:readFile', { path }),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', { path, content }),
    findFiles: (cwd: string, query?: string) => ipcRenderer.invoke('fs:findFiles', { cwd, query }),
    grep:      (cwd: string, query: string)  => ipcRenderer.invoke('fs:grep', { cwd, query }),
  },

  // ── Terminal ──────────────────────────────────────────────────────────
  terminal: {
    run: (command: string, cwd: string) => ipcRenderer.invoke('terminal:run', { command, cwd }),
  },

  // ── Git ───────────────────────────────────────────────────────────────
  git: {
    status: (cwd: string)                      => ipcRenderer.invoke('git:status', { cwd }),
    commit: (message: string, cwd: string)     => ipcRenderer.invoke('git:commit', { message, cwd }),
  },

  // ── System ────────────────────────────────────────────────────────────
  system: {
    metrics: () => ipcRenderer.invoke('system:metrics'),
  },

  // ── Settings ──────────────────────────────────────────────────────────
  settings: {
    load: ()                           => ipcRenderer.invoke('settings:load'),
    set:  (key: string, value: unknown) => ipcRenderer.invoke('settings:set', { key, value }),
  },

  // ── Memory ───────────────────────────────────────────────────────────
  memory: {
    sessions: (cwd: string) => ipcRenderer.invoke('memory:sessions', { cwd }),
  },

  // ── Planner ──────────────────────────────────────────────────────────
  planner: {
    plan: (goal: string, cwd: string) => ipcRenderer.invoke('planner:plan', { goal, cwd }),
  },
});
