/**
 * Git status operations for Prive
 */

import simpleGit, { type SimpleGit, type StatusResult } from 'simple-git';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────

export interface GitStatusSummary {
  branch: string;
  tracking?: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
  isClean: boolean;
  isRepo: boolean;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Get a summary of the current git status
 */
export async function getStatus(cwd: string = process.cwd()): Promise<GitStatusSummary> {
  const git = getGit(cwd);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return emptyStatus();
    }

    const status: StatusResult = await git.status();

    return {
      branch: status.current ?? 'HEAD',
      tracking: status.tracking ?? undefined,
      ahead: status.ahead,
      behind: status.behind,
      staged: [
        ...status.staged,
        ...status.created,
        ...status.deleted.filter(f => status.staged.includes(f)),
      ],
      unstaged: [
        ...status.modified,
        ...status.deleted.filter(f => !status.staged.includes(f)),
      ],
      untracked: status.not_added,
      conflicted: status.conflicted,
      isClean: status.isClean(),
      isRepo: true,
    };
  } catch {
    return emptyStatus();
  }
}

/**
 * Format git status as a human-readable string
 */
export async function formatStatus(cwd: string = process.cwd()): Promise<string> {
  const status = await getStatus(cwd);

  if (!status.isRepo) {
    return '  Not a git repository';
  }

  const lines: string[] = [];
  lines.push(`  Branch: ${status.branch}${status.tracking ? ` → ${status.tracking}` : ''}`);

  if (status.ahead > 0 || status.behind > 0) {
    lines.push(`  Sync:   ↑${status.ahead} ahead, ↓${status.behind} behind`);
  }

  if (status.isClean) {
    lines.push('  Status: ✓ working tree clean');
    return lines.join('\n');
  }

  if (status.staged.length > 0) {
    lines.push(`  Staged (${status.staged.length}):`);
    status.staged.slice(0, 10).forEach(f => lines.push(`    + ${f}`));
    if (status.staged.length > 10) lines.push(`    ... and ${status.staged.length - 10} more`);
  }

  if (status.unstaged.length > 0) {
    lines.push(`  Modified (${status.unstaged.length}):`);
    status.unstaged.slice(0, 10).forEach(f => lines.push(`    ~ ${f}`));
    if (status.unstaged.length > 10) lines.push(`    ... and ${status.unstaged.length - 10} more`);
  }

  if (status.untracked.length > 0) {
    lines.push(`  Untracked (${status.untracked.length}):`);
    status.untracked.slice(0, 5).forEach(f => lines.push(`    ? ${f}`));
    if (status.untracked.length > 5) lines.push(`    ... and ${status.untracked.length - 5} more`);
  }

  if (status.conflicted.length > 0) {
    lines.push(`  Conflicts (${status.conflicted.length}):`);
    status.conflicted.forEach(f => lines.push(`    ✗ ${f}`));
  }

  return lines.join('\n');
}

/**
 * Check if the current directory is inside a git repo
 */
export async function isGitRepo(cwd: string = process.cwd()): Promise<boolean> {
  try {
    const git = getGit(cwd);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getGit(cwd: string): SimpleGit {
  return simpleGit({ baseDir: cwd, binary: 'git', maxConcurrentProcesses: 4 });
}

function emptyStatus(): GitStatusSummary {
  return {
    branch: '',
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
    isClean: true,
    isRepo: false,
  };
}

export { getGit };
