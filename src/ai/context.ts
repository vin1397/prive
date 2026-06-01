/**
 * Context builder — assembles file content into AI-ready context blocks
 */

import path from 'path';
import { readFile, readFiles } from '../filesystem/read.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { estimateTokens, truncate } from '../utils/helpers.js';
import { MAX_CONTEXT_TOKENS, MAX_FILES_IN_CONTEXT, SUPPORTED_FILE_EXTENSIONS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ContextFile {
  path: string;
  content: string;
  tokens: number;
  truncated: boolean;
}

export interface ProjectContext {
  projectRoot: string;
  projectName: string;
  files: ContextFile[];
  tree?: string;
  totalTokens: number;
  truncated: boolean;
}

export interface ContextBuilderOptions {
  maxTokens?: number;
  includeTree?: boolean;
  maxFiles?: number;
}

// ── Context Builder ───────────────────────────────────────────────────────

/**
 * Build context from a list of file paths
 */
export async function buildFileContext(
  filePaths: string[],
  options: ContextBuilderOptions = {},
): Promise<ProjectContext> {
  const maxTokens = options.maxTokens ?? MAX_CONTEXT_TOKENS;
  const maxFiles = options.maxFiles ?? MAX_FILES_IN_CONTEXT;
  const cwd = process.cwd();

  const contextFiles: ContextFile[] = [];
  let totalTokens = 0;

  const limited = filePaths.slice(0, maxFiles);

  for (const filePath of limited) {
    try {
      const content = await readFile(filePath);
      let tokens = estimateTokens(content);
      let truncated = false;
      let finalContent = content;

      // Truncate if single file is too large
      const fileTokenBudget = Math.floor(maxTokens / 3);
      if (tokens > fileTokenBudget) {
        const charLimit = fileTokenBudget * 4;
        finalContent = content.slice(0, charLimit) + '\n\n[... file truncated ...]';
        tokens = estimateTokens(finalContent);
        truncated = true;
      }

      if (totalTokens + tokens > maxTokens) break;

      contextFiles.push({
        path: path.relative(cwd, path.resolve(filePath)),
        content: finalContent,
        tokens,
        truncated,
      });
      totalTokens += tokens;
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    projectRoot: cwd,
    projectName: path.basename(cwd),
    files: contextFiles,
    totalTokens,
    truncated: limited.length < filePaths.length,
  };
}

/**
 * Build project context with optional tree
 */
export async function buildProjectContext(
  filePaths: string[],
  options: ContextBuilderOptions = {},
): Promise<ProjectContext> {
  const ctx = await buildFileContext(filePaths, options);

  if (options.includeTree) {
    try {
      ctx.tree = await generateProjectTree(ctx.projectRoot, { maxDepth: 3 });
      ctx.totalTokens += estimateTokens(ctx.tree);
    } catch {
      // Tree generation is optional
    }
  }

  return ctx;
}

/**
 * Render a ProjectContext into a formatted string for the AI prompt
 */
export function renderContext(ctx: ProjectContext): string {
  const parts: string[] = [];

  if (ctx.tree) {
    parts.push(`## Project Structure\n\`\`\`\n${ctx.tree}\n\`\`\``);
  }

  for (const file of ctx.files) {
    const ext = path.extname(file.path).slice(1) || 'text';
    const header = `## File: ${file.path}${file.truncated ? ' (truncated)' : ''}`;
    parts.push(`${header}\n\`\`\`${ext}\n${file.content}\n\`\`\``);
  }

  if (ctx.truncated) {
    parts.push('*Note: Some files were excluded due to context limits.*');
  }

  return parts.join('\n\n');
}

/**
 * Build a summary of what's in the context
 */
export function summarizeContext(ctx: ProjectContext): string {
  const fileList = ctx.files.map(f => `  - ${f.path}${f.truncated ? ' (truncated)' : ''}`).join('\n');
  return [
    `Project: ${ctx.projectName}`,
    `Files: ${ctx.files.length}`,
    `Tokens: ~${ctx.totalTokens}`,
    fileList,
  ].join('\n');
}

/**
 * Quick single-file context string
 */
export async function singleFileContext(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const ext = path.extname(filePath).slice(1) || 'text';
  const rel = path.relative(process.cwd(), path.resolve(filePath));
  return `## File: ${rel}\n\`\`\`${ext}\n${content}\n\`\`\``;
}

/**
 * Check whether a file extension is supported
 */
export function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  return (
    SUPPORTED_FILE_EXTENSIONS.includes(ext) ||
    SUPPORTED_FILE_EXTENSIONS.includes(base)
  );
}
