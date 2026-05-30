/**
 * Command registry and handlers for Prive CLI
 */

import path from 'path';
import chalk from 'chalk';
import { ChatManager } from '../ai/chat.js';
import { buildFileContext, renderContext, singleFileContext } from '../ai/context.js';
import { getMemoryManager } from '../ai/memory.js';
import { getOllamaClient } from '../ai/ollama.js';
import { readFile, readFileInfo } from '../filesystem/read.js';
import { writeFile } from '../filesystem/write.js';
import { searchFiles, findFiles, grepFiles } from '../filesystem/search.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { execute, executeStreaming } from '../terminal/execute.js';
import { getStatus, formatStatus } from '../git/status.js';
import { commit, getRecentCommits } from '../git/commit.js';
import { push } from '../git/push.js';
import { listBranches, createBranch, checkoutBranch } from '../git/branch.js';
import { CoderAgent } from '../agents/coder.js';
import { DebuggerAgent } from '../agents/debugger.js';
import { ArchitectAgent } from '../agents/architect.js';
import { loadSettings, updateSetting } from '../config/settings.js';
import { getProjectName, formatBytes, truncate } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { confirm } from './prompt.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CommandContext {
  chat: ChatManager;
  cwd: string;
  args: string[];
  rawInput: string;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;

export interface CommandDefinition {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  handler: CommandHandler;
}

// ── Command Registry ──────────────────────────────────────────────────────

export const COMMANDS: CommandDefinition[] = [
  {
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show available commands',
    usage: '/help [command]',
    handler: handleHelp,
  },
  {
    name: 'chat',
    aliases: ['c'],
    description: 'Send a message to the AI (default, no slash needed)',
    usage: '/chat <message>',
    handler: handleChat,
  },
  {
    name: 'read',
    aliases: ['r', 'open'],
    description: 'Read a file and add it to context',
    usage: '/read <file>',
    handler: handleRead,
  },
  {
    name: 'write',
    aliases: ['w', 'save'],
    description: 'Write AI-generated content to a file',
    usage: '/write <file> <instruction>',
    handler: handleWrite,
  },
  {
    name: 'list',
    aliases: ['ls'],
    description: 'List files in the current directory',
    usage: '/list [pattern]',
    handler: handleList,
  },
  {
    name: 'tree',
    aliases: ['t'],
    description: 'Show the project file tree',
    usage: '/tree [depth]',
    handler: handleTree,
  },
  {
    name: 'run',
    aliases: ['exec', 'x'],
    description: 'Run a terminal command',
    usage: '/run <command>',
    handler: handleRun,
  },
  {
    name: 'git',
    aliases: ['g'],
    description: 'Git operations: status, commit, push, branch',
    usage: '/git <status|commit|push|branch|log>',
    handler: handleGit,
  },
  {
    name: 'model',
    aliases: ['m'],
    description: 'Show or change the active model',
    usage: '/model [model-name]',
    handler: handleModel,
  },
  {
    name: 'context',
    aliases: ['ctx'],
    description: 'Show current context / clear it',
    usage: '/context [clear]',
    handler: handleContext,
  },
  {
    name: 'grep',
    aliases: ['search', 'find'],
    description: 'Search file contents for a pattern',
    usage: '/grep <pattern>',
    handler: handleGrep,
  },
  {
    name: 'history',
    aliases: ['hist'],
    description: 'Show chat history for this session',
    usage: '/history',
    handler: handleHistory,
  },
  {
    name: 'memory',
    aliases: ['mem'],
    description: 'Show or clear saved sessions',
    usage: '/memory [clear]',
    handler: handleMemory,
  },
  {
    name: 'architect',
    aliases: ['arch'],
    description: 'Analyze project architecture',
    usage: '/architect',
    handler: handleArchitect,
  },
  {
    name: 'debug',
    aliases: ['fix'],
    description: 'Debug an error message',
    usage: '/debug <error> [file]',
    handler: handleDebug,
  },
  {
    name: 'clear',
    aliases: ['cls'],
    description: 'Clear the terminal screen',
    usage: '/clear',
    handler: handleClear,
  },
  {
    name: 'exit',
    aliases: ['quit', 'q', 'bye'],
    description: 'Exit Prive',
    usage: '/exit',
    handler: handleExit,
  },
];

// ── Router ────────────────────────────────────────────────────────────────

export function resolveCommand(name: string): CommandDefinition | undefined {
  const lower = name.toLowerCase();
  return COMMANDS.find(
    cmd => cmd.name === lower || cmd.aliases.includes(lower),
  );
}

export async function dispatch(input: string, ctx: Omit<CommandContext, 'args' | 'rawInput'>): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return true;

  // Check for exit
  if (['/exit', '/quit', '/q', 'exit', 'quit'].includes(trimmed.toLowerCase())) {
    return false;
  }

  let commandName: string;
  let args: string[];

  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(/\s+/);
    commandName = parts[0].toLowerCase();
    args = parts.slice(1);
  } else {
    // Treat bare input as a chat message
    commandName = 'chat';
    args = [trimmed];
  }

  const command = resolveCommand(commandName);

  if (!command) {
    logger.warn(`Unknown command: /${commandName}  (type /help for commands)`);
    return true;
  }

  try {
    await command.handler({ ...ctx, args, rawInput: trimmed });
  } catch (err) {
    logger.error(`Command failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return true;
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleHelp(ctx: CommandContext): Promise<void> {
  if (ctx.args[0]) {
    const cmd = resolveCommand(ctx.args[0]);
    if (cmd) {
      logger.header(`/${cmd.name}`);
      console.log(`  ${chalk.gray('Description:')} ${cmd.description}`);
      console.log(`  ${chalk.gray('Usage:')}       ${chalk.cyan(cmd.usage)}`);
      if (cmd.aliases.length > 0) {
        console.log(`  ${chalk.gray('Aliases:')}     ${cmd.aliases.map(a => `/${a}`).join(', ')}`);
      }
      return;
    }
  }

  logger.header('Available Commands');
  const maxLen = Math.max(...COMMANDS.map(c => c.name.length));

  for (const cmd of COMMANDS) {
    const padded = cmd.name.padEnd(maxLen);
    console.log(`  ${chalk.cyan('/' + padded)}  ${chalk.gray(cmd.description)}`);
  }

  console.log('');
  console.log(chalk.gray('  Tip: Just type a message to chat with the AI.'));
  console.log('');
}

async function handleChat(ctx: CommandContext): Promise<void> {
  const message = ctx.args.join(' ');
  if (!message) {
    logger.warn('Usage: /chat <message>');
    return;
  }

  console.log('');
  try {
    await ctx.chat.send(message, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();
  } catch (err) {
    logger.error('Chat error', err);
  }
  console.log('');
}

async function handleRead(ctx: CommandContext): Promise<void> {
  const filePath = ctx.args[0];
  if (!filePath) {
    logger.warn('Usage: /read <file>');
    return;
  }

  try {
    const info = await readFileInfo(filePath);
    const ctxString = await singleFileContext(filePath);

    ctx.chat.addContext(ctxString);

    logger.success(`Read ${info.name}`);
    logger.kv('Size', formatBytes(info.size));
    logger.kv('Lines', String(info.lines));
    logger.kv('Added to context', 'yes');
  } catch (err) {
    logger.error(`Cannot read ${filePath}`, err);
  }
}

async function handleWrite(ctx: CommandContext): Promise<void> {
  const [filePath, ...rest] = ctx.args;
  if (!filePath || rest.length === 0) {
    logger.warn('Usage: /write <file> <instruction>');
    return;
  }

  const instruction = rest.join(' ');
  console.log('');

  const agent = new CoderAgent();
  await agent.generate({
    task: instruction,
    outputFile: filePath,
  });
}

async function handleList(ctx: CommandContext): Promise<void> {
  const pattern = ctx.args[0] ?? '**/*';

  try {
    const files = await findFiles(undefined, {
      cwd: ctx.cwd,
      maxResults: 50,
    });

    logger.header(`Files (${files.length})`);
    files.forEach(f => {
      console.log(`  ${chalk.gray('•')} ${path.relative(ctx.cwd, f)}`);
    });
    console.log('');
  } catch (err) {
    logger.error('Failed to list files', err);
  }
}

async function handleTree(ctx: CommandContext): Promise<void> {
  const maxDepth = parseInt(ctx.args[0] ?? '3', 10);

  try {
    const tree = await generateProjectTree(ctx.cwd, { maxDepth });
    console.log('');
    console.log(chalk.cyan(tree));
    console.log('');
  } catch (err) {
    logger.error('Failed to generate tree', err);
  }
}

async function handleRun(ctx: CommandContext): Promise<void> {
  const command = ctx.args.join(' ');
  if (!command) {
    logger.warn('Usage: /run <command>');
    return;
  }

  console.log(chalk.gray(`$ ${command}`));
  console.log('');

  const result = await executeStreaming(command, { cwd: ctx.cwd });

  console.log('');
  if (result.success) {
    logger.success(`Exited ${result.exitCode} in ${result.duration}ms`);
  } else {
    logger.error(`Exited ${result.exitCode} in ${result.duration}ms`);
  }
}

async function handleGit(ctx: CommandContext): Promise<void> {
  const subcommand = ctx.args[0]?.toLowerCase();

  switch (subcommand) {
    case 'status':
    case undefined: {
      const status = await formatStatus(ctx.cwd);
      logger.header('Git Status');
      console.log(status);
      console.log('');
      break;
    }

    case 'commit': {
      const message = ctx.args.slice(1).join(' ');
      if (!message) {
        logger.warn('Usage: /git commit <message>');
        return;
      }
      try {
        const result = await commit(message, [], { all: true }, ctx.cwd);
        logger.success(`Committed: ${result.hash} "${message}" (${result.filesChanged} files)`);
      } catch (err) {
        logger.error('Commit failed', err);
      }
      break;
    }

    case 'push': {
      logger.info('Pushing...');
      const result = await push({}, ctx.cwd);
      if (result.success) {
        logger.success(result.message);
      } else {
        logger.error(result.message);
      }
      break;
    }

    case 'branch': {
      if (ctx.args[1]) {
        // Create / checkout branch
        const branchName = ctx.args[1];
        try {
          await createBranch(branchName, true, undefined, ctx.cwd);
          logger.success(`Switched to new branch: ${branchName}`);
        } catch {
          try {
            await checkoutBranch(branchName, ctx.cwd);
            logger.success(`Switched to: ${branchName}`);
          } catch (err) {
            logger.error('Branch operation failed', err);
          }
        }
      } else {
        // List branches
        const branches = await listBranches(ctx.cwd);
        logger.header('Branches');
        branches.forEach(b => {
          const marker = b.current ? chalk.green('* ') : '  ';
          console.log(`${marker}${b.current ? chalk.green(b.name) : chalk.white(b.name)}`);
        });
        console.log('');
      }
      break;
    }

    case 'log': {
      const count = parseInt(ctx.args[1] ?? '10', 10);
      const commits = await getRecentCommits(count, ctx.cwd);
      logger.header(`Recent Commits (${commits.length})`);
      commits.forEach(c => {
        console.log(
          `  ${chalk.yellow(c.hash)} ${chalk.gray(c.date.slice(0, 10))} ${chalk.white(c.message)} ${chalk.gray('<' + c.author + '>')}`,
        );
      });
      console.log('');
      break;
    }

    default:
      logger.warn(`Unknown git subcommand: ${subcommand}`);
      logger.info('Available: status, commit, push, branch, log');
  }
}

async function handleModel(ctx: CommandContext): Promise<void> {
  const settings = await loadSettings();
  const newModel = ctx.args[0];

  if (!newModel) {
    // Show available models
    const client = getOllamaClient(settings.ollamaHost);
    try {
      const models = await client.listModels();
      logger.header('Available Models');
      models.forEach(m => {
        const active = m.name === settings.model || m.name.startsWith(settings.model);
        const marker = active ? chalk.green('● ') : '  ';
        console.log(`${marker}${active ? chalk.green(m.name) : chalk.white(m.name)}`);
      });
      console.log('');
      logger.kv('Active', settings.model);
    } catch {
      logger.error('Cannot connect to Ollama');
    }
    return;
  }

  await updateSetting('model', newModel);
  ctx.chat.setModel(newModel);
  logger.success(`Model changed to: ${newModel}`);
}

async function handleContext(ctx: CommandContext): Promise<void> {
  if (ctx.args[0] === 'clear') {
    ctx.chat.clearHistory();
    logger.success('Conversation history cleared');
    return;
  }

  const session = ctx.chat.getSession();
  logger.header('Current Session');
  logger.kv('Model', session.model);
  logger.kv('Messages', String(session.messages.length));
  logger.kv('Tokens (est.)', String(session.totalTokens));
  console.log('');
}

async function handleGrep(ctx: CommandContext): Promise<void> {
  const query = ctx.args.join(' ');
  if (!query) {
    logger.warn('Usage: /grep <pattern>');
    return;
  }

  try {
    const results = await grepFiles(query, { cwd: ctx.cwd, maxResults: 30 });

    if (results.length === 0) {
      logger.info('No results found');
      return;
    }

    logger.header(`Search: "${query}" (${results.length} results)`);
    results.forEach(r => {
      console.log(`  ${chalk.cyan(r.relativePath)}${chalk.gray(':' + r.line)}  ${truncate(r.match ?? '', 80)}`);
    });
    console.log('');
  } catch (err) {
    logger.error('Search failed', err);
  }
}

async function handleHistory(ctx: CommandContext): Promise<void> {
  const messages = ctx.chat.getRecentMessages(20);

  if (messages.length === 0) {
    logger.info('No messages in this session yet');
    return;
  }

  logger.header('Session History');
  messages.forEach(msg => {
    const roleColor = msg.role === 'user' ? chalk.cyan : chalk.green;
    const roleLabel = msg.role === 'user' ? 'You' : 'AI';
    console.log(`  ${roleColor(roleLabel + ':')} ${truncate(msg.content, 120)}`);
  });
  console.log('');
}

async function handleMemory(ctx: CommandContext): Promise<void> {
  const mem = getMemoryManager(ctx.cwd);

  if (ctx.args[0] === 'clear') {
    const ok = await confirm('Clear all saved sessions?', false);
    if (ok) {
      await mem.clearAll();
      logger.success('Memory cleared');
    }
    return;
  }

  const sessions = await mem.getRecentSessions(10);
  if (sessions.length === 0) {
    logger.info('No saved sessions');
    return;
  }

  logger.header('Saved Sessions');
  sessions.forEach((s, i) => {
    const date = new Date(s.timestamp).toLocaleString();
    console.log(`  ${chalk.gray((i + 1) + '.')} ${chalk.cyan(s.projectName)} ${chalk.gray('·')} ${s.model} ${chalk.gray('·')} ${date}`);
    console.log(`     ${s.messages.length} messages`);
  });
  console.log('');
}

async function handleArchitect(ctx: CommandContext): Promise<void> {
  logger.info('Analyzing project architecture...');
  console.log('');

  const agent = new ArchitectAgent();
  await agent.analyzeProject(ctx.cwd);
}

async function handleDebug(ctx: CommandContext): Promise<void> {
  const errorMsg = ctx.args.join(' ');
  if (!errorMsg) {
    logger.warn('Usage: /debug <error message or description>');
    return;
  }

  console.log('');
  const agent = new DebuggerAgent();
  await agent.analyze({ error: errorMsg });
}

async function handleClear(): Promise<void> {
  console.clear();
}

async function handleExit(): Promise<void> {

}