
import readline from 'readline';
import chalk from 'chalk';

// ── Types ─────────────────────────────────────────────────────────────────

export interface PromptOptions {
  model: string;
  projectName: string;
}

// ── Readline interface ────────────────────────────────────────────────────

let _rl: readline.Interface | null = null;


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


export function closeReadline(): void {
  if (_rl) {
    _rl.close();
    _rl = null;
  }
}

export function renderPrompt(options: PromptOptions): string {
  return chalk.cyan('❯ ');
}

export function askLine(promptText: string): Promise<string> {
  return new Promise(resolve => {
    const rl = getReadline();
    rl.question(promptText, answer => {
      resolve(answer);
    });
  });
}


export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await askLine(`${chalk.yellow('?')} ${question} ${chalk.gray(hint)}: `);
  const trimmed = answer.trim().toLowerCase();

  if (!trimmed) return defaultYes;
  return trimmed === 'y' || trimmed === 'yes';
}


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