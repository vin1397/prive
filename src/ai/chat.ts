/**
 * Chat management, message history, and conversation state for Prive
 */

import { type OllamaMessage, type OllamaChatRequest, getOllamaClient } from './ollama.js';
import { getSettings } from '../config/settings.js';
import { estimateTokens } from '../utils/helpers.js';
import { MAX_CONTEXT_TOKENS } from '../config/constants.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChatMessage extends OllamaMessage {
  id: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface ChatSession {
  id: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  totalTokens: number;
}

export interface ChatOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  stream?: boolean;
  onChunk?: (text: string) => void;
}

// ── System Prompt ─────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `You are Prive, an expert AI coding assistant running locally on the user's machine.

You help with:
- Writing, reviewing, and refactoring code
- Debugging and fixing bugs
- Explaining code and concepts
- Architecture and design decisions
- Project structure and best practices

Guidelines:
- Be concise and precise
- Use code blocks with language tags for all code examples
- Prefer practical solutions over theoretical ones
- Ask for clarification when the request is ambiguous
- When modifying files, show the complete updated file or clearly marked diffs`;

// ── Chat Manager ─────────────────────────────────────────────────────────

export class ChatManager {
  private session: ChatSession;

  constructor(options: ChatOptions = {}) {
    const settings = getSettings();
    this.session = {
      id: crypto.randomUUID(),
      model: options.model ?? settings.model,
      messages: [],
      systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTokens: 0,
    };
  }

  /**
   * Send a user message and get a response
   */
  async send(userMessage: string, options: ChatOptions = {}): Promise<string> {
    const settings = getSettings();
    const stream = options.stream ?? settings.streamResponses;
    const onChunk = options.onChunk;

    // Add user message to history
    this.addMessage('user', userMessage);

    // Trim history to stay within token budget
    this.trimHistory();

    // Build request
    const messages: OllamaMessage[] = [
      ...(this.session.systemPrompt
        ? [{ role: 'system' as const, content: this.session.systemPrompt }]
        : []),
      ...this.session.messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const request: OllamaChatRequest = {
      model: options.model ?? this.session.model,
      messages,
      options: {
        temperature: options.temperature ?? settings.temperature,
      },
    };

    const client = getOllamaClient(settings.ollamaHost);
    let response = '';

    try {
      if (stream && onChunk) {
        response = await client.chatStream(request, onChunk);
      } else {
        const result = await client.chat(request);
        response = result.message.content;
      }
    } catch (err) {
      throw new Error(`Chat failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Add assistant response to history
    this.addMessage('assistant', response);
    this.session.updatedAt = new Date();

    return response;
  }

  /**
   * Add a message to the session history
   */
  addMessage(role: OllamaMessage['role'], content: string): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      tokenCount: estimateTokens(content),
    };
    this.session.messages.push(msg);
    this.session.totalTokens += msg.tokenCount ?? 0;
    return msg;
  }

  /**
   * Add context to the conversation (file contents, etc.)
   */
  addContext(context: string): void {
    const contextMsg = `<context>\n${context}\n</context>`;
    this.addMessage('user', contextMsg);
    this.addMessage('assistant', 'I have read the provided context and am ready to help.');
  }

  /**
   * Clear conversation history (keeps system prompt)
   */
  clearHistory(): void {
    this.session.messages = [];
    this.session.totalTokens = 0;
  }

  /**
   * Get the current session
   */
  getSession(): ChatSession {
    return { ...this.session };
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.session.messages.length;
  }

  /**
   * Get last N messages
   */
  getRecentMessages(n: number): ChatMessage[] {
    return this.session.messages.slice(-n);
  }

  /**
   * Update the model for this session
   */
  setModel(model: string): void {
    this.session.model = model;
  }

  /**
   * Update the system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.session.systemPrompt = prompt;
  }

  /**
   * Export session messages as serializable plain objects
   */
  exportMessages(): Array<{ role: string; content: string; timestamp: string }> {
    return this.session.messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Trim message history to stay within token budget
   * Keeps the most recent messages, always preserving the first user message
   */
  private trimHistory(): void {
    const budget = MAX_CONTEXT_TOKENS;
    const systemTokens = estimateTokens(this.session.systemPrompt ?? '');
    let available = budget - systemTokens;

    // Walk from newest to oldest, keeping messages within budget
    const kept: ChatMessage[] = [];
    for (let i = this.session.messages.length - 1; i >= 0; i--) {
      const msg = this.session.messages[i];
      const tokens = msg.tokenCount ?? estimateTokens(msg.content);
      if (available - tokens >= 0) {
        kept.unshift(msg);
        available -= tokens;
      } else {
        logger.debug(`Trimmed ${this.session.messages.length - kept.length} messages from context`);
        break;
      }
    }

    this.session.messages = kept;
    this.session.totalTokens = kept.reduce((sum, m) => sum + (m.tokenCount ?? 0), 0);
  }
}
