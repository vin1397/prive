/**
 * Git push operations for Prive
 */

import { getGit } from './status.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface PushOptions {
  remote?: string;
  branch?: string;
  setUpstream?: boolean;
  force?: boolean;
  tags?: boolean;
}

export interface PushResult {
  remote: string;
  branch: string;
  success: boolean;
  message: string;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Push commits to the remote
 */
export async function push(
  options: PushOptions = {},
  cwd: string = process.cwd(),
): Promise<PushResult> {
  const git = getGit(cwd);
  const remote = options.remote ?? 'origin';

  // Get current branch if not specified
  let branch = options.branch;
  if (!branch) {
    const status = await git.status();
    branch = status.current ?? 'main';
  }

  const pushOptions: string[] = [];
  if (options.setUpstream) pushOptions.push('--set-upstream');
  if (options.force) pushOptions.push('--force');
  if (options.tags) pushOptions.push('--tags');

  try {
    await git.push(remote, branch, pushOptions);
    return {
      remote,
      branch,
      success: true,
      message: `Pushed to ${remote}/${branch}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      remote,
      branch,
      success: false,
      message,
    };
  }
}

/**
 * Push and set upstream in one call (for new branches)
 */
export async function pushUpstream(
  remote = 'origin',
  cwd: string = process.cwd(),
): Promise<PushResult> {
  return push({ remote, setUpstream: true }, cwd);
}

/**
 * List configured remotes
 */
export async function listRemotes(
  cwd: string = process.cwd(),
): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>> {
  const git = getGit(cwd);
  return git.getRemotes(true);
}

/**
 * Fetch from all remotes
 */
export async function fetchAll(cwd: string = process.cwd()): Promise<void> {
  const git = getGit(cwd);
  await git.fetch('--all');
}

/**
 * Pull latest changes from remote
 */
export async function pull(
  remote = 'origin',
  branch?: string,
  cwd: string = process.cwd(),
): Promise<{ success: boolean; message: string }> {
  const git = getGit(cwd);

  try {
    const result = await git.pull(remote, branch);
    return {
      success: true,
      message: `Pulled ${result.summary.changes} changes from ${remote}`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
