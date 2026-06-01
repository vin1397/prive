/**
 * File system read operations for Prive
 */

import fs from 'fs-extra';
import path from 'path';
import { MAX_FILE_SIZE_BYTES } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ReadOptions {
  encoding?: BufferEncoding;
  maxBytes?: number;
}

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  content: string;
  lines: number;
  lastModified: Date;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Read a single file and return its content
 */
export async function readFile(
  filePath: string,
  options: ReadOptions = {},
): Promise<string> {
  const resolved = path.resolve(filePath);
  const encoding = options.encoding ?? 'utf-8';
  const maxBytes = options.maxBytes ?? MAX_FILE_SIZE_BYTES;

  try {
    const stat = await fs.stat(resolved);

    if (stat.size > maxBytes) {
      throw new Error(
        `File ${filePath} is too large (${stat.size} bytes, max ${maxBytes} bytes)`,
      );
    }

    return await fs.readFile(resolved, { encoding });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw err;
  }
}

/**
 * Read multiple files and return their contents
 * Silently skips files that cannot be read
 */
export async function readFiles(
  filePaths: string[],
  options: ReadOptions = {},
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(
    filePaths.map(async filePath => {
      try {
        const content = await readFile(filePath, options);
        results.set(filePath, content);
      } catch {
        // Skip unreadable files
      }
    }),
  );

  return results;
}

/**
 * Read a file and return detailed metadata + content
 */
export async function readFileInfo(filePath: string): Promise<FileInfo> {
  const resolved = path.resolve(filePath);
  const stat = await fs.stat(resolved);
  const content = await readFile(filePath);

  return {
    path: resolved,
    name: path.basename(resolved),
    extension: path.extname(resolved),
    size: stat.size,
    content,
    lines: content.split('\n').length,
    lastModified: stat.mtime,
  };
}

/**
 * Check if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(path.resolve(filePath), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON file and parse it
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Failed to parse JSON from ${filePath}`);
  }
}

/**
 * List all files in a directory (non-recursive)
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
  const resolved = path.resolve(dirPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  return entries
    .filter(e => e.isFile())
    .map(e => path.join(resolved, e.name));
}
