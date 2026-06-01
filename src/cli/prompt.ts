/**
 * Prompt rendering and user input handling for Prive CLI
 */

import readline from 'readline';
import chalk from 'chalk';

// ── Types ─────────────────────────────────────────────────────────────────

export interface PromptOptions {
  model: string;
  projectName: string;
}

// ── Readline interface ────────────────────────────────────────────────────

let _rl: readline.Interface | null = null;

/**
 * Get or create the readline interface
 */
export function getReadline(): readline.Interface {
  if (!_rl) {
    _rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 100,
    });

    _rl.on('close', () => {
      _rl = null;
    });
  }
  return _rl;
}

/**
 * Close the readline interface
 */
export function closeReadline(): void {
  if (_rl) {
    _rl.close();
    _rl = null;
  }
}

/**
 * Render the interactive prompt string
 */
export function renderPrompt(options: PromptOptions): string {
  return chalk.cyan('❯ ');
}

/**
 * Ask the user for a single line of input
 */
export function askLine(promptText: string): Promise<string> {
  return new Promise(resolve => {
    const rl = getReadline();
    rl.question(promptText, answer => {
      resolve(answer);
    });
  });
}

/**
 * Ask the user a yes/no question
 */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await askLine(`${chalk.yellow('?')} ${question} ${chalk.gray(hint)}: `);
  const trimmed = answer.trim().toLowerCase();

  if (!trimmed) return defaultYes;
  return trimmed === 'y' || trimmed === 'yes';
}

/**
 * Read multi-line input until an empty line is submitted
 */
export function askMultiline(promptText: string): Promise<string> {
  return new Promise(resolve => {
    console.log(chalk.gray(promptText));
    console.log(chalk.gray('(Enter an empty line to finish)'));

    const lines: string[] = [];
    const rl = getReadline();

    const onLine = (line: string) => {
      if (line === '') {
        rl.removeListener('line', onLine);
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    };

    rl.on('line', onLine);
  });
}
