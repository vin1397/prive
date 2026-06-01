/**
 * File search and discovery utilities for Prive
 */

import { glob } from 'glob';
import fs from 'fs-extra';
import path from 'path';
import { IGNORE_DIRS, SUPPORTED_FILE_EXTENSIONS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SearchOptions {
  cwd?: string;
  extensions?: string[];
  excludeDirs?: string[];
  maxResults?: number;
  caseSensitive?: boolean;
  includeHidden?: boolean;
}

export interface SearchResult {
  path: string;
  relativePath: string;
  line?: number;
  match?: string;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Find files by glob pattern
 */
export async function searchFiles(
  pattern: string,
  options: SearchOptions = {},
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const excludeDirs = options.excludeDirs ?? IGNORE_DIRS;

  const results = await glob(pattern, {
    cwd,
    ignore: excludeDirs.map(d => `**/${d}/**`),
    dot: options.includeHidden ?? false,
    absolute: true,
  });

  const limited = options.maxResults ? results.slice(0, options.maxResults) : results;
  return limited.sort();
}

/**
 * Find files by extension(s)
 */
export async function findFiles(
  extensions?: string[],
  options: SearchOptions = {},
): Promise<string[]> {
  const exts = extensions ?? SUPPORTED_FILE_EXTENSIONS;
  const extList = exts.map(e => (e.startsWith('.') ? e.slice(1) : e));
  const pattern = `**/*.{${extList.join(',')}}`;
  return searchFiles(pattern, options);
}

/**
 * Find files whose names match a query string (fuzzy)
 */
export async function findFilesByName(
  query: string,
  options: SearchOptions = {},
): Promise<string[]> {
  const allFiles = await findFiles(options.extensions, options);
  const q = options.caseSensitive ? query : query.toLowerCase();

  return allFiles.filter(f => {
    const base = path.basename(f);
    const check = options.caseSensitive ? base : base.toLowerCase();
    return check.includes(q);
  });
}

/**
 * Search file contents for a string or regex pattern
 */
export async function grepFiles(
  query: string,
  options: SearchOptions & { regex?: boolean } = {},
): Promise<SearchResult[]> {
  const files = await findFiles(options.extensions, options);
  const results: SearchResult[] = [];
  const maxResults = options.maxResults ?? 100;

  const pattern = options.regex
    ? new RegExp(query, options.caseSensitive ? '' : 'i')
    : options.caseSensitive
      ? query
      : query.toLowerCase();

  for (const filePath of files) {
    if (results.length >= maxResults) break;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const check = options.caseSensitive || options.regex ? line : line.toLowerCase();

        const matched =
          typeof pattern === 'string' ? check.includes(pattern) : pattern.test(check);

        if (matched) {
          results.push({
            path: filePath,
            relativePath: path.relative(options.cwd ?? process.cwd(), filePath),
            line: i + 1,
            match: line.trim(),
          });

          if (results.length >= maxResults) break;
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return results;
}

/**
 * Check if a path exists and is a directory
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.resolve(dirPath));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the most recently modified files
 */
export async function getRecentFiles(
  count = 10,
  options: SearchOptions = {},
): Promise<string[]> {
  const files = await findFiles(options.extensions, options);

  const withStats = await Promise.all(
    files.map(async f => {
      try {
        const stat = await fs.stat(f);
        return { path: f, mtime: stat.mtime.getTime() };
      } catch {
        return null;
      }
    }),
  );

  return withStats
    .filter((f): f is { path: string; mtime: number } => f !== null)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, count)
    .map(f => f.path);
}
