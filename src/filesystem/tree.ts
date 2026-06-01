/**
 * Project tree generation for Prive
 */

import fs from 'fs-extra';
import path from 'path';
import { IGNORE_DIRS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface TreeOptions {
  maxDepth?: number;
  showHidden?: boolean;
  excludeDirs?: string[];
  maxFiles?: number;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Generate a visual project tree string
 */
export async function generateProjectTree(
  rootDir: string = process.cwd(),
  options: TreeOptions = {},
): Promise<string> {
  const maxDepth = options.maxDepth ?? 4;
  const excludeDirs = new Set(options.excludeDirs ?? IGNORE_DIRS);
  const lines: string[] = [];

  const name = path.basename(rootDir);
  lines.push(name + '/');

  await walkDir(rootDir, rootDir, '', 0, maxDepth, excludeDirs, lines, options);

  return lines.join('\n');
}

/**
 * Return an array of all file paths in a directory tree
 */
export async function getAllFilePaths(
  rootDir: string,
  options: TreeOptions = {},
): Promise<string[]> {
  const excludeDirs = new Set(options.excludeDirs ?? IGNORE_DIRS);
  const maxDepth = options.maxDepth ?? 10;
  const paths: string[] = [];

  await collectPaths(rootDir, 0, maxDepth, excludeDirs, paths);
  return paths;
}

// ── Private helpers ───────────────────────────────────────────────────────

async function walkDir(
  currentDir: string,
  rootDir: string,
  prefix: string,
  depth: number,
  maxDepth: number,
  excludeDirs: Set<string>,
  lines: string[],
  options: TreeOptions,
): Promise<void> {
  if (depth >= maxDepth) {
    lines.push(`${prefix}...`);
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  // Filter and sort: dirs first, then files
  const filtered = entries.filter(e => {
    if (!options.showHidden && e.name.startsWith('.')) return false;
    if (e.isDirectory() && excludeDirs.has(e.name)) return false;
    return true;
  });

  const dirs = filtered.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = filtered.filter(e => e.isFile()).sort((a, b) => a.name.localeCompare(b.name));

  const all = [...dirs, ...files];

  for (let i = 0; i < all.length; i++) {
    const entry = all[i];
    const isLast = i === all.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? prefix + '    ' : prefix + '│   ';

    if (entry.isDirectory()) {
      lines.push(`${prefix}${connector}${entry.name}/`);
      await walkDir(
        path.join(currentDir, entry.name),
        rootDir,
        childPrefix,
        depth + 1,
        maxDepth,
        excludeDirs,
        lines,
        options,
      );
    } else {
      lines.push(`${prefix}${connector}${entry.name}`);
    }
  }
}

async function collectPaths(
  dir: string,
  depth: number,
  maxDepth: number,
  excludeDirs: Set<string>,
  paths: string[],
): Promise<void> {
  if (depth > maxDepth) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.has(entry.name) && !entry.name.startsWith('.')) {
        await collectPaths(fullPath, depth + 1, maxDepth, excludeDirs, paths);
      }
    } else if (entry.isFile()) {
      paths.push(fullPath);
    }
  }
}
