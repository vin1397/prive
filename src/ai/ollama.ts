/**
 * Ollama API client for Prive
 * Handles connection, model management, and chat requests
 */

import { OLLAMA_DEFAULT_HOST, OLLAMA_TIMEOUT_MS } from '../config/constants.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export type StreamChunk = {
  message: { content: string };
  done: boolean;
};

// ── Client ────────────────────────────────────────────────────────────────

export class OllamaClient {
  private host: string;

  constructor(host: string = OLLAMA_DEFAULT_HOST) {
    this.host = host.replace(/\/$/, '');
  }

  /**
   * Check if Ollama is running and reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.host}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all installed models
   */
  async listModels(): Promise<OllamaModel[]> {
    const res = await this.request<OllamaListResponse>('GET', '/api/tags');
    return res.models ?? [];
  }

  /**
   * Check if a specific model is installed
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(m =>
      m.name === modelName ||
      m.name.startsWith(modelName + ':') ||
      modelName.startsWith(m.name.split(':')[0]),
    );
  }

  /**
   * Resolve the best available model name from a list of candidates
   */
  async resolveModel(candidates: string[]): Promise<string | null> {
    const models = await this.listModels();
    const names = models.map(m => m.name);

    for (const candidate of candidates) {
      const match = names.find(
        n => n === candidate || n.startsWith(candidate + ':') || candidate.startsWith(n.split(':')[0]),
      );
      if (match) return match;
    }

    return names[0] ?? null;
  }

  /**
   * Send a chat request (non-streaming)
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return this.request<OllamaChatResponse>('POST', '/api/chat', {
      ...request,
      stream: false,
    });
  }

  /**
   * Send a chat request with streaming responses
   * Calls onChunk for each streamed token
   */
  async chatStream(
    request: OllamaChatRequest,
    onChunk: (text: string) => void,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    let fullResponse = '';

    try {
      const res = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new OllamaError(`HTTP ${res.status}: ${await res.text()}`);
      }

      if (!res.body) {
        throw new OllamaError('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line) as StreamChunk;
            if (chunk.message?.content) {
              onChunk(chunk.message.content);
              fullResponse += chunk.message.content;
            }
            if (chunk.done) break;
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return fullResponse;
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string, onProgress?: (status: string) => void): Promise<void> {
    const res = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!res.ok) {
      throw new OllamaError(`Failed to pull model: HTTP ${res.status}`);
    }

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as { status?: string };
          if (data.status && onProgress) {
            onProgress(data.status);
          }
        } catch {
          // Skip malformed
        }
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.host}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new OllamaError(`HTTP ${res.status}: ${text}`);
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ── Error ─────────────────────────────────────────────────────────────────

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _client: OllamaClient | null = null;

export function getOllamaClient(host?: string): OllamaClient {
  if (!_client || host) {
    _client = new OllamaClient(host);
  }
  return _client;
}
