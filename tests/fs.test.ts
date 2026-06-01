/**
 * Filesystem layer tests for Prive
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { readFile, readFiles, readFileInfo, fileExists, readJsonFile } from '../src/filesystem/read.js';
import { writeFile, createFile, appendFile, deleteFile, writeJsonFile } from '../src/filesystem/write.js';
import { generateProjectTree, getAllFilePaths } from '../src/filesystem/tree.js';
import { findFilesByName, grepFiles } from '../src/filesystem/search.js';

// ── Test fixtures ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prive-test-'));

  // Create test file structure
  await fs.ensureDir(path.join(tmpDir, 'src'));
  await fs.ensureDir(path.join(tmpDir, 'src', 'utils'));
  await fs.ensureDir(path.join(tmpDir, 'node_modules', 'some-pkg'));

  await fs.writeFile(path.join(tmpDir, 'README.md'), '# Test Project\n\nHello world.');
  await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2));
  await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'export const hello = () => "hello";\n');
  await fs.writeFile(path.join(tmpDir, 'src', 'utils', 'helpers.ts'), 'export function add(a: number, b: number) { return a + b; }\n');
  await fs.writeFile(path.join(tmpDir, 'node_modules', 'some-pkg', 'index.js'), 'module.exports = {};\n');
});

afterAll(async () => {
  await fs.remove(tmpDir);
});

// ── readFile ──────────────────────────────────────────────────────────────

describe('readFile', () => {
  it('reads an existing file', async () => {
    const content = await readFile(path.join(tmpDir, 'README.md'));
    expect(content).toContain('# Test Project');
  });

  it('throws for missing files', async () => {
    await expect(readFile(path.join(tmpDir, 'nonexistent.txt'))).rejects.toThrow('File not found');
  });

  it('throws for files exceeding maxBytes', async () => {
    await expect(
      readFile(path.join(tmpDir, 'README.md'), { maxBytes: 5 })
    ).rejects.toThrow('too large');
  });
});

// ── readFiles ─────────────────────────────────────────────────────────────

describe('readFiles', () => {
  it('reads multiple files, returning a Map', async () => {
    const paths = [
      path.join(tmpDir, 'README.md'),
      path.join(tmpDir, 'package.json'),
    ];
    const map = await readFiles(paths);
    expect(map.size).toBe(2);
    expect(map.get(paths[0])).toContain('# Test Project');
  });

  it('silently skips unreadable files', async () => {
    const paths = [
      path.join(tmpDir, 'README.md'),
      path.join(tmpDir, 'does-not-exist.txt'),
    ];
    const map = await readFiles(paths);
    expect(map.size).toBe(1);
  });
});

// ── readFileInfo ──────────────────────────────────────────────────────────

describe('readFileInfo', () => {
  it('returns metadata including line count', async () => {
    const info = await readFileInfo(path.join(tmpDir, 'README.md'));
    expect(info.name).toBe('README.md');
    expect(info.extension).toBe('.md');
    expect(info.lines).toBeGreaterThan(0);
    expect(info.size).toBeGreaterThan(0);
  });
});

// ── fileExists ────────────────────────────────────────────────────────────

describe('fileExists', () => {
  it('returns true for existing files', async () => {
    expect(await fileExists(path.join(tmpDir, 'README.md'))).toBe(true);
  });

  it('returns false for missing files', async () => {
    expect(await fileExists(path.join(tmpDir, 'ghost.txt'))).toBe(false);
  });
});

// ── readJsonFile ──────────────────────────────────────────────────────────

describe('readJsonFile', () => {
  it('parses JSON correctly', async () => {
    const data = await readJsonFile<{ name: string }>(path.join(tmpDir, 'package.json'));
    expect(data.name).toBe('test');
  });
});

// ── writeFile ─────────────────────────────────────────────────────────────

describe('writeFile', () => {
  it('creates a file with content', async () => {
    const filePath = path.join(tmpDir, 'write-test.txt');
    const result = await writeFile(filePath, 'hello world');
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('hello world');
  });

  it('creates parent directories when needed', async () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'file.txt');
    await writeFile(filePath, 'nested content');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('creates a backup when requested', async () => {
    const filePath = path.join(tmpDir, 'backup-test.txt');
    await writeFile(filePath, 'original');
    await writeFile(filePath, 'updated', { backup: true });

    expect(await fs.readFile(filePath, 'utf-8')).toBe('updated');
    expect(await fileExists(`${filePath}.bak`)).toBe(true);
  });
});

// ── createFile ────────────────────────────────────────────────────────────

describe('createFile', () => {
  it('creates a new file', async () => {
    const filePath = path.join(tmpDir, 'new-file.ts');
    await createFile(filePath, 'export {};\n');
    expect(await fs.readFile(filePath, 'utf-8')).toBe('export {};\n');
  });

  it('throws if file already exists', async () => {
    const filePath = path.join(tmpDir, 'README.md');
    await expect(createFile(filePath, '')).rejects.toThrow('already exists');
  });
});

// ── appendFile ────────────────────────────────────────────────────────────

describe('appendFile', () => {
  it('appends content to an existing file', async () => {
    const filePath = path.join(tmpDir, 'append-test.txt');
    await writeFile(filePath, 'line1\n');
    await appendFile(filePath, 'line2\n');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2\n');
  });
});

// ── writeJsonFile ─────────────────────────────────────────────────────────

describe('writeJsonFile', () => {
  it('writes valid JSON', async () => {
    const filePath = path.join(tmpDir, 'output.json');
    await writeJsonFile(filePath, { key: 'value', num: 42 });
    const data = await readJsonFile<{ key: string; num: number }>(filePath);
    expect(data.key).toBe('value');
    expect(data.num).toBe(42);
  });
});

// ── deleteFile ────────────────────────────────────────────────────────────

describe('deleteFile', () => {
  it('removes a file', async () => {
    const filePath = path.join(tmpDir, 'to-delete.txt');
    await writeFile(filePath, 'bye');
    expect(await fileExists(filePath)).toBe(true);
    await deleteFile(filePath);
    expect(await fileExists(filePath)).toBe(false);
  });
});

// ── generateProjectTree ───────────────────────────────────────────────────

describe('generateProjectTree', () => {
  it('generates a tree string', async () => {
    const tree = await generateProjectTree(tmpDir, { maxDepth: 2 });
    expect(tree).toContain('src');
    expect(tree).toContain('README.md');
  });

  it('excludes node_modules by default', async () => {
    const tree = await generateProjectTree(tmpDir, { maxDepth: 3 });
    expect(tree).not.toContain('node_modules');
  });
});

// ── getAllFilePaths ────────────────────────────────────────────────────────

describe('getAllFilePaths', () => {
  it('returns file paths excluding ignored dirs', async () => {
    const files = await getAllFilePaths(tmpDir);
    expect(files.some(f => f.includes('node_modules'))).toBe(false);
    expect(files.some(f => f.endsWith('index.ts'))).toBe(true);
  });
});

// ── findFilesByName ───────────────────────────────────────────────────────

describe('findFilesByName', () => {
  it('finds files matching a query', async () => {
    const results = await findFilesByName('helpers', { cwd: tmpDir });
    expect(results.some(f => f.includes('helpers.ts'))).toBe(true);
  });

  it('returns empty array for no matches', async () => {
    const results = await findFilesByName('zzznomatch', { cwd: tmpDir });
    expect(results).toHaveLength(0);
  });
});

// ── grepFiles ─────────────────────────────────────────────────────────────

describe('grepFiles', () => {
  it('finds files containing a pattern', async () => {
    const results = await grepFiles('hello', { cwd: tmpDir });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].match).toBeDefined();
  });

  it('returns line numbers', async () => {
    const results = await grepFiles('hello', { cwd: tmpDir });
    results.forEach(r => expect(typeof r.line).toBe('number'));
  });
});
