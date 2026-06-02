/**
 * Prive — Plugin System (Phase 6)
 *
 * Loads JavaScript/TypeScript plugins from .prive/plugins/
 * Each plugin exports a manifest and registers custom commands.
 */

import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Unique plugin identifier, e.g. "prive-plugin-prettier" */
  name: string;
  /** Display name shown in /plugin list */
  displayName: string;
  /** Short description */
  description: string;
  /** Plugin version */
  version: string;
  /** Author name or contact */
  author?: string;
  /** Commands this plugin registers */
  commands: PluginCommandDef[];
}

export interface PluginCommandDef {
  /** Command name used after /plugin <name> */
  name: string;
  /** One-line description */
  description: string;
  /** Usage hint */
  usage: string;
}

export interface PluginContext {
  /** Current working directory */
  cwd: string;
  /** Arguments passed to the command */
  args: string[];
  /** Logger instance */
  logger: typeof logger;
  /** Execute a shell command safely */
  exec: (cmd: string) => Promise<{ stdout: string; stderr: string; success: boolean }>;
  /** Read a file */
  readFile: (filePath: string) => Promise<string>;
  /** Write a file */
  writeFile: (filePath: string, content: string) => Promise<void>;
}

export interface PrivePlugin {
  manifest: PluginManifest;
  /** Called once when the plugin is loaded */
  activate?(ctx: PluginContext): Promise<void>;
  /** Handle a command invocation */
  handleCommand(commandName: string, ctx: PluginContext): Promise<void>;
  /** Called when Prive exits */
  deactivate?(): Promise<void>;
}

export interface LoadedPlugin {
  plugin: PrivePlugin;
  manifest: PluginManifest;
  filePath: string;
}

// ── Plugin Registry ────────────────────────────────────────────────────────

export class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.pluginsDir = path.join(projectRoot, '.prive', 'plugins');
  }

  /**
   * Scan and load all plugins from .prive/plugins/
   */
  async loadAll(): Promise<void> {
    if (!(await fs.pathExists(this.pluginsDir))) {
      await fs.ensureDir(this.pluginsDir);
      return;
    }

    const entries = await fs.readdir(this.pluginsDir);
    const pluginFiles = entries.filter(
      e => e.endsWith('.js') || e.endsWith('.mjs') || e.endsWith('.cjs'),
    );

    for (const file of pluginFiles) {
      await this.load(path.join(this.pluginsDir, file));
    }

    if (this.plugins.size > 0) {
      logger.debug(`Loaded ${this.plugins.size} plugin(s): ${[...this.plugins.keys()].join(', ')}`);
    }
  }

  /**
   * Load a single plugin file
   */
  async load(filePath: string): Promise<boolean> {
    try {
      const url = pathToFileURL(path.resolve(filePath)).href;
      const mod = await import(url) as { default?: PrivePlugin } & Partial<PrivePlugin>;
      const plugin: PrivePlugin = mod.default ?? (mod as unknown as PrivePlugin);

      if (!plugin?.manifest?.name) {
        logger.warn(`Plugin at ${filePath} has no manifest.name — skipping`);
        return false;
      }

      this.plugins.set(plugin.manifest.name, {
        plugin,
        manifest: plugin.manifest,
        filePath,
      });

      // Call activate if defined
      if (plugin.activate) {
        await plugin.activate(this.makeContext([], process.cwd()));
      }

      logger.success(`Plugin loaded: ${plugin.manifest.displayName} v${plugin.manifest.version}`);
      return true;
    } catch (err) {
      logger.error(`Failed to load plugin: ${filePath}`, err);
      return false;
    }
  }

  /**
   * Unload and deactivate a plugin by name
   */
  async unload(name: string): Promise<boolean> {
    const loaded = this.plugins.get(name);
    if (!loaded) return false;

    if (loaded.plugin.deactivate) {
      await loaded.plugin.deactivate();
    }

    this.plugins.delete(name);
    return true;
  }

  /**
   * Execute a plugin command: /plugin <pluginName> <commandName> [args...]
   */
  async executeCommand(
    pluginName: string,
    commandName: string,
    args: string[],
    cwd: string,
  ): Promise<boolean> {
    const loaded = this.plugins.get(pluginName);
    if (!loaded) {
      logger.warn(`Plugin not found: ${pluginName}`);
      return false;
    }

    const cmdDef = loaded.manifest.commands.find(c => c.name === commandName);
    if (!cmdDef) {
      logger.warn(`Command "${commandName}" not found in plugin "${pluginName}"`);
      return false;
    }

    try {
      await loaded.plugin.handleCommand(commandName, this.makeContext(args, cwd));
      return true;
    } catch (err) {
      logger.error(`Plugin "${pluginName}" command "${commandName}" failed`, err);
      return false;
    }
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Get all registered commands across all plugins
   */
  getAllCommands(): Array<{ plugin: string; command: PluginCommandDef }> {
    const out: Array<{ plugin: string; command: PluginCommandDef }> = [];
    for (const { manifest } of this.plugins.values()) {
      for (const cmd of manifest.commands) {
        out.push({ plugin: manifest.name, command: cmd });
      }
    }
    return out;
  }

  get size(): number { return this.plugins.size; }

  // ── Private ──────────────────────────────────────────────────────────────

  private makeContext(args: string[], cwd: string): PluginContext {
    return {
      cwd,
      args,
      logger,
      exec: async (cmd: string) => {
        const { execute } = await import('../terminal/execute.js');
        const r = await execute(cmd, { cwd });
        return { stdout: r.stdout, stderr: r.stderr, success: r.success };
      },
      readFile: async (filePath: string) => {
        const { readFile } = await import('../filesystem/read.js');
        return readFile(filePath);
      },
      writeFile: async (filePath: string, content: string) => {
        const { writeFile } = await import('../filesystem/write.js');
        await writeFile(filePath, content);
      },
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _registry: PluginRegistry | null = null;

export function getPluginRegistry(projectRoot?: string): PluginRegistry {
  if (!_registry || projectRoot) {
    _registry = new PluginRegistry(projectRoot);
  }
  return _registry;
}

// ── Example plugin template (written to disk on first run) ─────────────────

export const EXAMPLE_PLUGIN_TEMPLATE = `/**
 * Example Prive Plugin
 * Place this file in .prive/plugins/ to activate it.
 */

/** @type {import('../src/plugins/loader.js').PrivePlugin} */
const plugin = {
  manifest: {
    name: 'prive-plugin-example',
    displayName: 'Example Plugin',
    description: 'A starter template for Prive plugins',
    version: '0.1.0',
    author: 'Your Name',
    commands: [
      {
        name: 'hello',
        description: 'Print a greeting',
        usage: '/plugin prive-plugin-example hello [name]',
      },
    ],
  },

  async activate(ctx) {
    ctx.logger.info('Example plugin activated!');
  },

  async handleCommand(commandName, ctx) {
    if (commandName === 'hello') {
      const name = ctx.args[0] ?? 'world';
      ctx.logger.success(\`Hello, \${name}! From your Prive plugin.\`);
    }
  },

  async deactivate() {},
};

export default plugin;
`;

export async function writeExamplePlugin(projectRoot: string = process.cwd()): Promise<void> {
  const dir = path.join(projectRoot, '.prive', 'plugins');
  const file = path.join(dir, 'example-plugin.mjs');
  await fs.ensureDir(dir);
  if (!(await fs.pathExists(file))) {
    await fs.writeFile(file, EXAMPLE_PLUGIN_TEMPLATE, 'utf-8');
    logger.success(`Example plugin written to .prive/plugins/example-plugin.mjs`);
  }
}
