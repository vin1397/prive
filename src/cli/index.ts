#!/usr/bin/env node
/**
 * Prive — Your Local AI Coding Companion
 * Main entry point and interactive loop
 */

import chalk from 'chalk';
import path from 'path';
import { loadSettings, updateSetting } from '../config/settings.js';
import { PRIVE_VERSION, BANNER } from '../config/constants.js';
import { getOllamaClient } from '../ai/ollama.js';
import { ChatManager } from '../ai/chat.js';
import { getMemoryManager } from '../ai/memory.js';
import { getProjectName } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import spinner from '../utils/spinner.js';
import { getReadline, closeReadline, renderPrompt } from './prompt.js';
import { dispatch } from './commands.js';

// ── Startup ───────────────────────────────────────────────────────────────

async function startup(): Promise<{ chat: ChatManager; cwd: string }> {
  const cwd = process.cwd();
  const settings = await loadSettings(cwd);
  const projectName = getProjectName(cwd);

  // Print banner
  console.clear();
  logger.banner(PRIVE_VERSION, settings.model, projectName);

  // Verify Ollama connection
  const sp = spinner.start('Connecting to Ollama...');
  const client = getOllamaClient(settings.ollamaHost);
  const available = await client.isAvailable();

  if (!available) {
    spinner.fail('Cannot connect to Ollama');
    console.log('');
    console.log(chalk.yellow('  Make sure Ollama is running:'));
    console.log(chalk.gray('    ollama serve'));
    console.log('');
    process.exit(1);
  }

  // Resolve or verify model
  let resolvedModel = settings.model;
  const hasModel = await client.hasModel(settings.model);

  if (!hasModel) {
    spinner.update(`Model "${settings.model}" not found, checking available models...`);
    const models = await client.listModels();

    if (models.length === 0) {
      spinner.fail('No models installed');
      console.log('');
      console.log(chalk.yellow('  Install a model first:'));
      console.log(chalk.gray('    ollama pull qwen2.5-coder'));
      console.log(chalk.gray('    ollama pull deepseek-coder-v2'));
      console.log('');
      process.exit(1);
    }

    // Use the first available model
    resolvedModel = models[0].name;
    spinner.update(`Using available model: ${resolvedModel}`);
    await updateSetting('model', resolvedModel);
  }

  spinner.succeed(`Connected · model: ${chalk.cyan(resolvedModel)}`);

  // Print tips
  console.log('');
  console.log(chalk.gray('  Type a message to chat, /help for commands, /exit to quit.'));
  console.log('');

  const chat = new ChatManager({ model: resolvedModel });

  return { chat, cwd };
}

// ── Interactive Loop ──────────────────────────────────────────────────────

async function interactiveLoop(chat: ChatManager, cwd: string): Promise<void> {
  const rl = getReadline();
  let running = true;

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('');
    running = false;
    shutdown(chat, cwd);
  });

  const askInput = (): Promise<string> =>
    new Promise(resolve => {
      rl.question(renderPrompt({ model: '', projectName: '' }), input => {
        resolve(input);
      });
    });

  while (running) {
    let input: string;

    try {
      input = await askInput();
    } catch {
      break;
    }

    const shouldContinue = await dispatch(input, { chat, cwd });

    if (!shouldContinue) {
      running = false;
    }
  }

  await shutdown(chat, cwd);
}

// ── Shutdown ──────────────────────────────────────────────────────────────

async function shutdown(chat: ChatManager, cwd: string): Promise<void> {
  const session = chat.getSession();

  // Save session to memory if it has messages
  if (session.messages.length > 0) {
    try {
      const mem = getMemoryManager(cwd);
      await mem.saveSession({
        model: session.model,
        projectName: getProjectName(cwd),
        projectRoot: cwd,
        messages: chat.exportMessages(),
      });
    } catch {
      // Non-fatal
    }
  }

  closeReadline();

  console.log('');
  console.log(chalk.gray('  Goodbye! 👋'));
  console.log('');
  process.exit(0);
}

// ── CLI argument handling ─────────────────────────────────────────────────

async function handleCliArgs(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`prive v${PRIVE_VERSION}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(BANNER);
    console.log('Usage: prive [options]');
    console.log('');
    console.log('Options:');
    console.log('  -v, --version    Print version');
    console.log('  -h, --help       Show help');
    console.log('  --model <name>   Use a specific model');
    console.log('');
    process.exit(0);
  }

  // Handle --model flag
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    await updateSetting('model', args[modelIdx + 1]);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await handleCliArgs();

  try {
    const { chat, cwd } = await startup();
    await interactiveLoop(chat, cwd);
  } catch (err) {
    logger.error('Fatal error', err);
    if (process.env.DEBUG) {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
