/**
 * File system write operations for Prive
 */

import fs from 'fs-extra';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────

export interface WriteOptions {
  encoding?: BufferEncoding;
  createDirectories?: boolean;
  backup?: boolean;
}

export interface WriteResult {
  path: string;
  bytesWritten: number;
  backupPath?: string;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Write content to a file, creating directories if needed
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: WriteOptions = {},
): Promise<WriteResult> {
  const resolved = path.resolve(filePath);
  const createDirs = options.createDirectories ?? true;
  let backupPath: string | undefined;

  if (createDirs) {
    await fs.ensureDir(path.dirname(resolved));
  }

  // Create backup if requested and file exists
  if (options.backup && (await fs.pathExists(resolved))) {
    backupPath = `${resolved}.bak`;
    await fs.copy(resolved, backupPath);
  }

  await fs.writeFile(resolved, content, { encoding: options.encoding ?? 'utf-8' });

  return {
    path: resolved,
    bytesWritten: Buffer.byteLength(content, options.encoding ?? 'utf-8'),
    backupPath,
  };
}

/**
 * Create a new file — fails if it already exists
 */
export async function createFile(
  filePath: string,
  content: string = '',
  options: WriteOptions = {},
): Promise<WriteResult> {
  const resolved = path.resolve(filePath);

  if (await fs.pathExists(resolved)) {
    throw new Error(`File already exists: ${filePath}`);
  }

  return writeFile(filePath, content, options);
}

/**
 * Append content to an existing file (creates if it doesn't exist)
 */
export async function appendFile(
  filePath: string,
  content: string,
  options: WriteOptions = {},
): Promise<WriteResult> {
  const resolved = path.resolve(filePath);

  if (options.createDirectories ?? true) {
    await fs.ensureDir(path.dirname(resolved));
  }

  await fs.appendFile(resolved, content, { encoding: options.encoding ?? 'utf-8' });

  const stat = await fs.stat(resolved);
  return { path: resolved, bytesWritten: stat.size };
}

/**
 * Write multiple files at once
 */
export async function writeFiles(
  files: Array<{ path: string; content: string }>,
  options: WriteOptions = {},
): Promise<WriteResult[]> {
  return Promise.all(files.map(f => writeFile(f.path, f.content, options)));
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  await fs.remove(resolved);
}

/**
 * Rename or move a file
 */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  await fs.move(path.resolve(fromPath), path.resolve(toPath), { overwrite: false });
}

/**
 * Copy a file
 */
export async function copyFile(fromPath: string, toPath: string, overwrite = false): Promise<void> {
  await fs.copy(path.resolve(fromPath), path.resolve(toPath), { overwrite });
}

/**
 * Write JSON to a file with pretty formatting
 */
export async function writeJsonFile(
  filePath: string,
  data: unknown,
  options: WriteOptions = {},
): Promise<WriteResult> {
  const content = JSON.stringify(data, null, 2) + '\n';
  return writeFile(filePath, content, options);
}
