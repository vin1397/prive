/**
 * Terminal command execution for Prive
 */

import { execa, type Options as ExecaOptions } from 'execa';
import path from 'path';
import { checkCommandSafety, formatSafetyWarning } from './sandbox.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  skipSafetyCheck?: boolean;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration: number;
  success: boolean;
}

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Execute a shell command and return the result
 * Performs safety checks before execution
 */
export async function execute(
  command: string,
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const cwd = options.cwd ?? process.cwd();
  const timeout = options.timeout ?? 60_000;
  const start = Date.now();

  // Safety check
  if (!options.skipSafetyCheck) {
    const safety = checkCommandSafety(command);

    if (safety.riskLevel === 'danger') {
      const warning = formatSafetyWarning(safety, command);
      logger.error(warning);
      return {
        stdout: '',
        stderr: warning,
        exitCode: 1,
        command,
        duration: 0,
        success: false,
      };
    }

    if (safety.riskLevel === 'warning') {
      logger.warn(formatSafetyWarning(safety, command));
      // Warning-level commands proceed but are logged
    }
  }

  // Parse command into parts
  const [cmd, ...args] = parseShellCommand(command);

  const execaOptions: ExecaOptions = {
    cwd,
    env: { ...process.env, ...options.env },
    timeout,
    reject: false,
    all: true,
  };

  logger.debug(`Executing: ${command}`);

  try {
    const proc = execa(cmd, args, execaOptions);

    // Stream stdout if handler provided
    if (options.onStdout && proc.stdout) {
      proc.stdout.on('data', (chunk: Buffer) => {
        options.onStdout!(chunk.toString());
      });
    }

    if (options.onStderr && proc.stderr) {
      proc.stderr.on('data', (chunk: Buffer) => {
        options.onStderr!(chunk.toString());
      });
    }

    const result = await proc;
    const duration = Date.now() - start;

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.exitCode ?? 0,
      command,
      duration,
      success: (result.exitCode ?? 0) === 0,
    };
  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return {
      stdout: '',
      stderr: message,
      exitCode: 1,
      command,
      duration,
      success: false,
    };
  }
}

/**
 * Execute a command and stream output to the console in real-time
 */
export async function executeStreaming(
  command: string,
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  return execute(command, {
    ...options,
    onStdout: data => {
      process.stdout.write(data);
      options.onStdout?.(data);
    },
    onStderr: data => {
      process.stderr.write(data);
      options.onStderr?.(data);
    },
  });
}

/**
 * Run multiple commands in sequence, stopping on first failure
 */
export async function executeSequence(
  commands: string[],
  options: ExecuteOptions = {},
): Promise<ExecuteResult[]> {
  const results: ExecuteResult[] = [];

  for (const command of commands) {
    const result = await execute(command, options);
    results.push(result);

    if (!result.success) break;
  }

  return results;
}

// ── Private helpers ───────────────────────────────────────────────────────

/**
 * Parse a shell command string into [cmd, ...args]
 * Handles quoted strings
 */
function parseShellCommand(command: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (const ch of command) {
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === ' ' && !inSingle && !inDouble) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current) parts.push(current);
  return parts.length > 0 ? parts : ['echo', ''];
}
