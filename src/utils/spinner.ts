/**
 * Spinner / loading indicator utilities for Prive
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

let _activeSpinner: Ora | null = null;

/**
 * Start a spinner with a message
 */
export function start(message: string): Ora {
  if (_activeSpinner) {
    _activeSpinner.stop();
  }
  _activeSpinner = ora({
    text: chalk.gray(message),
    spinner: 'dots',
    color: 'cyan',
  }).start();
  return _activeSpinner;
}

/**
 * Update the active spinner text
 */
export function update(message: string): void {
  if (_activeSpinner) {
    _activeSpinner.text = chalk.gray(message);
  }
}

/**
 * Stop the spinner with a success message
 */
export function succeed(message?: string): void {
  if (_activeSpinner) {
    _activeSpinner.succeed(message ? chalk.green(message) : undefined);
    _activeSpinner = null;
  }
}

/**
 * Stop the spinner with a failure message
 */
export function fail(message?: string): void {
  if (_activeSpinner) {
    _activeSpinner.fail(message ? chalk.red(message) : undefined);
    _activeSpinner = null;
  }
}

/**
 * Stop the spinner silently
 */
export function stop(): void {
  if (_activeSpinner) {
    _activeSpinner.stop();
    _activeSpinner = null;
  }
}

/**
 * Wrap an async operation with a spinner
 */
export async function withSpinner<T>(
  message: string,
  operation: () => Promise<T>,
  successMessage?: string,
  failMessage?: string,
): Promise<T> {
  start(message);
  try {
    const result = await operation();
    succeed(successMessage);
    return result;
  } catch (err) {
    fail(failMessage ?? 'Failed');
    throw err;
  }
}

export const spinner = { start, update, succeed, fail, stop, withSpinner };
export default spinner;
