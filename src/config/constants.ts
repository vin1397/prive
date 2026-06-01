/**
 * Global constants for Prive
 */

export const PRIVE_VERSION = '0.1.0';
export const PRIVE_DIR = '.prive';
export const MEMORY_FILE = `${PRIVE_DIR}/memory.json`;
export const PROJECTS_FILE = `${PRIVE_DIR}/projects.json`;
export const SETTINGS_FILE = `${PRIVE_DIR}/settings.json`;

export const OLLAMA_DEFAULT_HOST = 'http://localhost:11434';
export const OLLAMA_TIMEOUT_MS = 120_000;
export const DEFAULT_MODEL = 'qwen2.5-coder';
export const FALLBACK_MODEL = 'llama3.2';

export const MAX_CONTEXT_TOKENS = 8_000;
export const MAX_FILE_SIZE_BYTES = 500_000; // 500KB
export const MAX_FILES_IN_CONTEXT = 20;

export const DANGEROUS_COMMANDS = [
  'rm -rf',
  'rm -r /',
  'del /f',
  'del /s',
  'format',
  'shutdown',
  'reboot',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'chown -R',
  '> /dev/sda',
];

export const SAFE_COMMAND_WHITELIST = [
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'node',
  'git',
  'ls',
  'dir',
  'cat',
  'echo',
  'pwd',
  'cd',
  'mkdir',
  'touch',
  'cp',
  'mv',
  'find',
  'grep',
  'curl',
  'wget',
];

export const SUPPORTED_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt',
  '.c', '.cpp', '.h', '.hpp',
  '.html', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.toml', '.ini',
  '.md', '.txt', '.sh', '.bash', '.zsh',
  '.sql', '.graphql', '.proto',
  '.env', '.env.example',
  'Dockerfile', 'Makefile',
];

export const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'target',
  '.cargo',
  'vendor',
  '.prive',
];

export const BANNER = `
⚡ Prive v${PRIVE_VERSION}
Your Local AI Coding Companion
`;
