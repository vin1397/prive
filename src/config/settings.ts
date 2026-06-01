/**
 * Settings loader and manager for Prive
 */

import fs from 'fs-extra';
import path from 'path';
import { SETTINGS_FILE, DEFAULT_MODEL, OLLAMA_DEFAULT_HOST } from './constants.js';

export interface PriveSettings {
  model: string;
  ollamaHost: string;
  temperature: number;
  contextFiles: string[];
  autoSaveMemory: boolean;
  streamResponses: boolean;
  showThinking: boolean;
  maxHistoryLength: number;
  theme: 'dark' | 'light';
  workingDirectory: string;
}

const DEFAULT_SETTINGS: PriveSettings = {
  model: DEFAULT_MODEL,
  ollamaHost: OLLAMA_DEFAULT_HOST,
  temperature: 0.7,
  contextFiles: [],
  autoSaveMemory: true,
  streamResponses: true,
  showThinking: false,
  maxHistoryLength: 50,
  theme: 'dark',
  workingDirectory: process.cwd(),
};

let _settings: PriveSettings | null = null;

/**
 * Load settings from disk, merging with defaults
 */
export async function loadSettings(projectRoot?: string): Promise<PriveSettings> {
  if (_settings) return _settings;

  const settingsPath = path.join(projectRoot ?? process.cwd(), SETTINGS_FILE);

  try {
    if (await fs.pathExists(settingsPath)) {
      const raw = await fs.readJson(settingsPath);
      _settings = { ...DEFAULT_SETTINGS, ...raw };
    } else {
      _settings = { ...DEFAULT_SETTINGS };
      await saveSettings(_settings, projectRoot);
    }
  } catch {
    _settings = { ...DEFAULT_SETTINGS };
  }

  return _settings!;
}

/**
 * Save settings to disk
 */
export async function saveSettings(settings: PriveSettings, projectRoot?: string): Promise<void> {
  const settingsPath = path.join(projectRoot ?? process.cwd(), SETTINGS_FILE);
  await fs.ensureDir(path.dirname(settingsPath));
  await fs.writeJson(settingsPath, settings, { spaces: 2 });
  _settings = settings;
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof PriveSettings>(
  key: K,
  value: PriveSettings[K],
  projectRoot?: string,
): Promise<void> {
  const settings = await loadSettings(projectRoot);
  settings[key] = value;
  await saveSettings(settings, projectRoot);
}

/**
 * Get current settings (requires loadSettings to be called first)
 */
export function getSettings(): PriveSettings {
  return _settings ?? { ...DEFAULT_SETTINGS };
}

/**
 * Reset settings cache (useful for testing)
 */
export function resetSettingsCache(): void {
  _settings = null;
}
