/**
 * Prive — MCP Server (Phase 6)
 *
 * Exposes Prive's capabilities as a Model Context Protocol server.
 * Compatible with Claude Desktop, Cursor, and any MCP-aware client.
 *
 * Start with: prive --mcp
 * or programmatically: import { startMcpServer } from './src/mcp/server.js'
 */

import http from 'http';
import { readFile } from '../filesystem/read.js';
import { writeFile } from '../filesystem/write.js';
import { findFiles, grepFiles } from '../filesystem/search.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { execute } from '../terminal/execute.js';
import { getStatus, formatStatus } from '../git/status.js';
import { commit } from '../git/commit.js';
import { getSettings } from '../config/settings.js';
import { getOllamaClient } from '../ai/ollama.js';
import { ChatManager } from '../ai/chat.js';
import logger from '../utils/logger.js';

// ── MCP Protocol Types ────────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

// ── Tool Definitions ──────────────────────────────────────────────────────

const TOOLS: McpTool[] = [
  {
    name: 'prive_chat',
    description: 'Send a message to the local AI model via Prive and get a response',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to send to the AI' },
        model:   { type: 'string', description: 'Optional model override (e.g. qwen2.5-coder)' },
      },
      required: ['message'],
    },
  },
  {
    name: 'prive_read_file',
    description: 'Read the contents of a file in the current project',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative or absolute file path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'prive_write_file',
    description: 'Write or overwrite a file in the current project',
    inputSchema: {
      type: 'object',
      properties: {
        path:    { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'prive_search_files',
    description: 'Find files by name pattern or search file contents',
    inputSchema: {
      type: 'object',
      properties: {
        query:  { type: 'string', description: 'Search query' },
        mode:   { type: 'string', description: 'Search mode', enum: ['files', 'content'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'prive_project_tree',
    description: 'Get the project file tree as a string',
    inputSchema: {
      type: 'object',
      properties: {
        depth: { type: 'string', description: 'Max depth (default 3)' },
      },
    },
  },
  {
    name: 'prive_run_command',
    description: 'Execute a shell command in the project directory (sandbox-checked)',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      required: ['command'],
    },
  },
  {
    name: 'prive_git_status',
    description: 'Get the current git repository status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'prive_git_commit',
    description: 'Stage all changes and create a git commit',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
      },
      required: ['message'],
    },
  },
  {
    name: 'prive_list_models',
    description: 'List all locally installed Ollama models',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ── Tool Executor ─────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  cwd: string,
): Promise<unknown> {
  const settings = getSettings();

  switch (name) {

    case 'prive_chat': {
      const message = String(args.message ?? '');
      const model   = String(args.model ?? settings.model);
      const chat    = new ChatManager({ model });
      const response = await chat.send(message);
      return { response, model };
    }

    case 'prive_read_file': {
      const filePath = String(args.path ?? '');
      const content  = await readFile(filePath);
      return { path: filePath, content, lines: content.split('\n').length };
    }

    case 'prive_write_file': {
      const filePath = String(args.path ?? '');
      const content  = String(args.content ?? '');
      await writeFile(filePath, content);
      return { path: filePath, written: true, bytes: Buffer.byteLength(content) };
    }

    case 'prive_search_files': {
      const query = String(args.query ?? '');
      const mode  = String(args.mode ?? 'files');

      if (mode === 'content') {
        const results = await grepFiles(query, { cwd, maxResults: 20 });
        return { query, mode, results };
      } else {
        const files = await findFiles(undefined, { cwd, maxResults: 30 });
        const filtered = files
          .filter(f => f.toLowerCase().includes(query.toLowerCase()))
          .map(f => f.replace(cwd + '/', ''));
        return { query, mode, files: filtered, count: filtered.length };
      }
    }

    case 'prive_project_tree': {
      const depth = parseInt(String(args.depth ?? '3'), 10);
      const tree  = await generateProjectTree(cwd, { maxDepth: depth });
      return { tree };
    }

    case 'prive_run_command': {
      const command = String(args.command ?? '');
      const result  = await execute(command, { cwd });
      return {
        command,
        stdout:   result.stdout,
        stderr:   result.stderr,
        exitCode: result.exitCode,
        success:  result.success,
        duration: result.duration,
      };
    }

    case 'prive_git_status': {
      const status = await getStatus(cwd);
      const formatted = await formatStatus(cwd);
      return { ...status, formatted };
    }

    case 'prive_git_commit': {
      const message = String(args.message ?? 'chore: update');
      const result  = await commit(message, [], { all: true }, cwd);
      return { hash: result.hash, branch: result.branch, message, filesChanged: result.filesChanged };
    }

    case 'prive_list_models': {
      const client = getOllamaClient(settings.ollamaHost);
      const models = await client.listModels();
      return { models: models.map(m => ({ name: m.name, size: m.size })), count: models.length };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Request Handler ───────────────────────────────────────────────────────

function makeError(id: string | number, code: number, message: string): McpResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleRequest(body: string, cwd: string): Promise<McpResponse> {
  let req: McpRequest;

  try {
    req = JSON.parse(body) as McpRequest;
  } catch {
    return { jsonrpc: '2.0', id: 0, error: { code: -32700, message: 'Parse error' } };
  }

  const { id, method, params = {} } = req;

  try {
    switch (method) {

      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'prive-mcp', version: '0.1.0' },
            capabilities: { tools: {} },
          },
        };

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

      case 'tools/call': {
        const toolName = String(params.name ?? '');
        const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

        const result = await executeTool(toolName, toolArgs, cwd);
        return {
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      }

      case 'ping':
        return { jsonrpc: '2.0', id, result: { pong: true } };

      default:
        return makeError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return makeError(id, -32603, err instanceof Error ? err.message : String(err));
  }
}

// ── Server ────────────────────────────────────────────────────────────────

export interface McpServerOptions {
  port?: number;
  host?: string;
  cwd?: string;
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<http.Server> {
  const port = options.port ?? 3747;
  const host = options.host ?? '127.0.0.1';
  const cwd  = options.cwd  ?? process.cwd();

  const server = http.createServer(async (req, res) => {
    // CORS for local MCP clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const response = await handleRequest(body, cwd);
      res.writeHead(200);
      res.end(JSON.stringify(response));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.once('error', reject);
  });

  logger.success(`MCP server running at http://${host}:${port}`);
  logger.info(`Add to Claude Desktop config:`);
  console.log(`
  {
    "mcpServers": {
      "prive": {
        "url": "http://${host}:${port}",
        "type": "http"
      }
    }
  }
  `);

  return server;
}
