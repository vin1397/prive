/**
 * Colored logger utility for Prive
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

let _debugEnabled = false;

export function enableDebug(): void {
  _debugEnabled = true;
}

/**
 * Log an informational message
 */
export function info(message: string, ...args: unknown[]): void {
  console.log(chalk.cyan('ℹ'), chalk.white(message), ...args);
}

/**
 * Log a success message
 */
export function success(message: string, ...args: unknown[]): void {
  console.log(chalk.green('✓'), chalk.green(message), ...args);
}

/**
 * Log a warning message
 */
export function warn(message: string, ...args: unknown[]): void {
  console.log(chalk.yellow('⚠'), chalk.yellow(message), ...args);
}

/**
 * Log an error message
 */
export function error(message: string, err?: unknown): void {
  console.error(chalk.red('✗'), chalk.red(message));
  if (err && _debugEnabled) {
    console.error(chalk.red(String(err)));
  }
}

/**
 * Log a debug message (only when debug mode enabled)
 */
export function debug(message: string, ...args: unknown[]): void {
  if (!_debugEnabled) return;
  console.log(chalk.gray('[debug]'), chalk.gray(message), ...args);
}

/**
 * Log AI response text (streamed or full)
 */
export function ai(text: string): void {
  process.stdout.write(chalk.white(text));
}

/**
 * Print a newline after AI response
 */
export function aiEnd(): void {
  process.stdout.write('\n');
}

/**
 * Print a divider line
 */
export function divider(): void {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Print a section header
 */
export function header(title: string): void {
  console.log('');
  console.log(chalk.bold.cyan(`── ${title} ──`));
  console.log('');
}

/**
 * Print key-value pair
 */
export function kv(key: string, value: string): void {
  console.log(`  ${chalk.gray(key + ':')} ${chalk.white(value)}`);
}

import boxen from "boxen";
import gradient from "gradient-string";

export function banner(
  version: string,
  model: string,
  projectName: string
): void {
  const logo = gradient(["#7c3aed", "#a855f7", "#c084fc"])(`
██████╗ ██████╗ ██╗██╗   ██╗███████╗
██╔══██╗██╔══██╗██║██║   ██║██╔════╝
██████╔╝██████╔╝██║██║   ██║█████╗
██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝
██║     ██║  ██║██║ ╚████╔╝ ███████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
`);

  console.clear();

  console.log(logo);

  console.log(
    boxen(
`${chalk.cyan("🤖 Model")}   : ${chalk.white(model)}
${chalk.yellow("📂 Project")} : ${chalk.white(projectName)}
${chalk.green("🧠 Memory")}  : Enabled
${chalk.magenta("🌐 Ollama")} : Connected

${chalk.gray("Type /help for commands")}`,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "magenta"
      }
    )
  );

  console.log(
    chalk.gray(`Version ${version} • Your Local AI Coding Companion`)
  );

  console.log("");
}

export const logger = { info, success, warn, error, debug, ai, aiEnd, divider, header, kv, banner };
export default logger;
