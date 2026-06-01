/**
 * Session memory — save and load conversations to .prive/memory.json
 */

import fs from 'fs-extra';
import path from 'path';
import { MEMORY_FILE, PROJECTS_FILE } from '../config/constants.js';
import { fileTimestamp } from '../utils/helpers.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  timestamp: string;
  model: string;
  projectName: string;
  projectRoot: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  summary?: string;
  tags?: string[];
}

export interface MemoryStore {
  version: string;
  entries: MemoryEntry[];
  lastUpdated: string;
}

export interface ProjectRecord {
  name: string;
  path: string;
  lastVisited: string;
  model?: string;
  messageCount: number;
}

export interface ProjectsStore {
  projects: ProjectRecord[];
}

// ── Memory Manager ────────────────────────────────────────────────────────

export class MemoryManager {
  private memoryPath: string;
  private projectsPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.memoryPath = path.join(projectRoot, MEMORY_FILE);
    this.projectsPath = path.join(projectRoot, PROJECTS_FILE);
  }

  /**
   * Save a session to memory
   */
  async saveSession(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    const store = await this.loadStore();

    const newEntry: MemoryEntry = {
      ...entry,
      id: `session-${fileTimestamp()}`,
      timestamp: new Date().toISOString(),
    };

    store.entries.unshift(newEntry);

    // Keep only last 50 sessions
    store.entries = store.entries.slice(0, 50);
    store.lastUpdated = new Date().toISOString();

    await this.saveStore(store);
    await this.updateProject(entry.projectName, entry.projectRoot, entry.model, entry.messages.length);

    return newEntry;
  }

  /**
   * Load recent sessions
   */
  async getRecentSessions(limit = 10): Promise<MemoryEntry[]> {
    const store = await this.loadStore();
    return store.entries.slice(0, limit);
  }

  /**
   * Load a session by ID
   */
  async getSession(id: string): Promise<MemoryEntry | null> {
    const store = await this.loadStore();
    return store.entries.find(e => e.id === id) ?? null;
  }

  /**
   * Search sessions by project name
   */
  async getSessionsByProject(projectName: string): Promise<MemoryEntry[]> {
    const store = await this.loadStore();
    return store.entries.filter(e =>
      e.projectName.toLowerCase().includes(projectName.toLowerCase()),
    );
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<boolean> {
    const store = await this.loadStore();
    const initialLength = store.entries.length;
    store.entries = store.entries.filter(e => e.id !== id);

    if (store.entries.length < initialLength) {
      await this.saveStore(store);
      return true;
    }
    return false;
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    const emptyStore: MemoryStore = {
      version: '0.1.0',
      entries: [],
      lastUpdated: new Date().toISOString(),
    };
    await this.saveStore(emptyStore);
  }

  /**
   * Get all known projects
   */
  async getProjects(): Promise<ProjectRecord[]> {
    const store = await this.loadProjectsStore();
    return store.projects.sort(
      (a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime(),
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async loadStore(): Promise<MemoryStore> {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        return await fs.readJson(this.memoryPath);
      }
    } catch {
      // Fall through to default
    }
    return { version: '0.1.0', entries: [], lastUpdated: new Date().toISOString() };
  }

  private async saveStore(store: MemoryStore): Promise<void> {
    await fs.ensureDir(path.dirname(this.memoryPath));
    await fs.writeJson(this.memoryPath, store, { spaces: 2 });
  }

  private async loadProjectsStore(): Promise<ProjectsStore> {
    try {
      if (await fs.pathExists(this.projectsPath)) {
        return await fs.readJson(this.projectsPath);
      }
    } catch {
      // Fall through
    }
    return { projects: [] };
  }

  private async saveProjectsStore(store: ProjectsStore): Promise<void> {
    await fs.ensureDir(path.dirname(this.projectsPath));
    await fs.writeJson(this.projectsPath, store, { spaces: 2 });
  }

  private async updateProject(
    name: string,
    projectPath: string,
    model: string | undefined,
    messageCount: number,
  ): Promise<void> {
    const store = await this.loadProjectsStore();
    const existing = store.projects.find(p => p.path === projectPath);

    if (existing) {
      existing.lastVisited = new Date().toISOString();
      existing.messageCount += messageCount;
      if (model) existing.model = model;
    } else {
      store.projects.push({
        name,
        path: projectPath,
        lastVisited: new Date().toISOString(),
        model,
        messageCount,
      });
    }

    await this.saveProjectsStore(store);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _memoryManager: MemoryManager | null = null;

export function getMemoryManager(projectRoot?: string): MemoryManager {
  if (!_memoryManager || projectRoot) {
    _memoryManager = new MemoryManager(projectRoot);
  }
  return _memoryManager;
}
