/**
 * Git commit operations for Prive
 */

import { getGit } from './status.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CommitOptions {
  all?: boolean;        // Stage all changes before committing
  allowEmpty?: boolean;
  author?: string;      // "Name <email>"
}

export interface CommitResult {
  hash: string;
  branch: string;
  message: string;
  filesChanged: number;
  success: boolean;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Stage files and create a commit
 */
export async function commit(
  message: string,
  files: string[] = [],
  options: CommitOptions = {},
  cwd: string = process.cwd(),
): Promise<CommitResult> {
  const git = getGit(cwd);

  // Stage specified files or all changes
  if (options.all || files.length === 0) {
    await git.add('.');
  } else {
    await git.add(files);
  }

  const taskOptions: Record<string, string | null> = {};
  if (options.allowEmpty) taskOptions['--allow-empty'] = null;
  if (options.author) taskOptions['--author'] = options.author;

  const result = await git.commit(message, [], Object.keys(taskOptions).length ? taskOptions : {});

  return {
    hash: result.commit,
    branch: result.branch,
    message,
    filesChanged: result.summary.changes,
    success: true,
  };
}

/**
 * Stage all changed files (equivalent to git add -A)
 */
export async function stageAll(cwd: string = process.cwd()): Promise<string[]> {
  const git = getGit(cwd);
  const status = await git.status();
  await git.add('.');
  return [...status.modified, ...status.not_added, ...status.deleted];
}

/**
 * Stage specific files
 */
export async function stageFiles(files: string[], cwd: string = process.cwd()): Promise<void> {
  const git = getGit(cwd);
  await git.add(files);
}

/**
 * Unstage all files
 */
export async function unstageAll(cwd: string = process.cwd()): Promise<void> {
  const git = getGit(cwd);
  await git.reset(['HEAD']);
}

/**
 * Get the last N commit messages
 */
export async function getRecentCommits(
  count = 10,
  cwd: string = process.cwd(),
): Promise<Array<{ hash: string; date: string; message: string; author: string }>> {
  const git = getGit(cwd);
  const log = await git.log({ maxCount: count });

  return log.all.map(c => ({
    hash: c.hash.slice(0, 8),
    date: c.date,
    message: c.message,
    author: c.author_name,
  }));
}

/**
 * Generate a conventional commit message using a simple template
 */
export function buildCommitMessage(
  type: string,
  scope: string | undefined,
  description: string,
  body?: string,
): string {
  const scopePart = scope ? `(${scope})` : '';
  let message = `${type}${scopePart}: ${description}`;
  if (body) message += `\n\n${body}`;
  return message;
}
