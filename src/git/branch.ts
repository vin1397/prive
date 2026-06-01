/**
 * Git branch operations for Prive
 */

import { getGit } from './status.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  current: boolean;
  remote?: string;
  commit: string;
  label?: string;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * List all local branches
 */
export async function listBranches(cwd: string = process.cwd()): Promise<BranchInfo[]> {
  const git = getGit(cwd);
  const summary = await git.branchLocal();

  return Object.entries(summary.branches).map(([name, info]) => ({
    name,
    current: summary.current === name,
    commit: info.commit,
    label: info.label,
  }));
}

/**
 * List all branches (local + remote)
 */
export async function listAllBranches(cwd: string = process.cwd()): Promise<BranchInfo[]> {
  const git = getGit(cwd);
  const summary = await git.branch(['-a']);

  return Object.entries(summary.branches).map(([name, info]) => ({
    name,
    current: summary.current === name,
    remote: name.startsWith('remotes/') ? name.split('/').slice(0, 2).join('/') : undefined,
    commit: info.commit,
    label: info.label,
  }));
}

/**
 * Get the current branch name
 */
export async function currentBranch(cwd: string = process.cwd()): Promise<string> {
  const git = getGit(cwd);
  const summary = await git.branchLocal();
  return summary.current;
}

/**
 * Create and optionally checkout a new branch
 */
export async function createBranch(
  name: string,
  checkout = true,
  startPoint?: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const git = getGit(cwd);

  if (checkout) {
    const args = startPoint ? ['-b', name, startPoint] : ['-b', name];
    await git.checkout(args);
  } else {
    const args = startPoint ? [name, startPoint] : [name];
    await git.branch(args);
  }
}

/**
 * Switch to an existing branch
 */
export async function checkoutBranch(
  name: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const git = getGit(cwd);
  await git.checkout(name);
}

/**
 * Delete a branch
 */
export async function deleteBranch(
  name: string,
  force = false,
  cwd: string = process.cwd(),
): Promise<void> {
  const git = getGit(cwd);
  await git.deleteLocalBranch(name, force);
}

/**
 * Rename the current branch
 */
export async function renameBranch(
  newName: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const git = getGit(cwd);
  await git.branch(['-m', newName]);
}

/**
 * Merge a branch into the current branch
 */
export async function mergeBranch(
  name: string,
  noFastForward = false,
  cwd: string = process.cwd(),
): Promise<{ success: boolean; message: string }> {
  const git = getGit(cwd);

  try {
    const args = noFastForward ? [name, '--no-ff'] : [name];
    await git.merge(args);
    return { success: true, message: `Merged ${name}` };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
