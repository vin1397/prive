
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaClient, OllamaError } from '../src/ai/ollama.js';
import { ChatManager } from '../src/ai/chat.js';
import { estimateTokens } from '../src/utils/helpers.js';
import { resetSettingsCache } from '../src/config/settings.js';

// ── OllamaClient ──────────────────────────────────────────────────────────

describe('OllamaClient', () => {
  it('constructs with default host', () => {
    const client = new OllamaClient();
    expect(client).toBeDefined();
  });

  it('constructs with custom host', () => {
    const client = new OllamaClient('http://localhost:11435');
    expect(client).toBeDefined();
  });

  it('returns false for isAvailable when host is unreachable', async () => {
    const client = new OllamaClient('http://localhost:19999');
    const available = await client.isAvailable();
    expect(available).toBe(false);
  });

  it('throws OllamaError on bad request', () => {
    const err = new OllamaError('test error');
    expect(err.name).toBe('OllamaError');
    expect(err.message).toBe('test error');
  });
});

// ── ChatManager ───────────────────────────────────────────────────────────

describe('ChatManager', () => {
  beforeEach(() => {
    resetSettingsCache();
    vi.resetAllMocks();
  });

  it('creates a session with a unique ID', () => {
    const chat1 = new ChatManager({ model: 'test-model' });
    const chat2 = new ChatManager({ model: 'test-model' });
    expect(chat1.getSession().id).not.toBe(chat2.getSession().id);
  });

  it('tracks message count', () => {
    const chat = new ChatManager({ model: 'test-model' });
    expect(chat.getMessageCount()).toBe(0);

    chat.addMessage('user', 'Hello');
    expect(chat.getMessageCount()).toBe(1);

    chat.addMessage('assistant', 'Hi there');
    expect(chat.getMessageCount()).toBe(2);
  });

  it('clears history', () => {
    const chat = new ChatManager({ model: 'test-model' });
    chat.addMessage('user', 'Hello');
    chat.addMessage('assistant', 'Hi');
    expect(chat.getMessageCount()).toBe(2);

    chat.clearHistory();
    expect(chat.getMessageCount()).toBe(0);
  });

  it('exports messages in correct format', () => {
    const chat = new ChatManager({ model: 'test-model' });
    chat.addMessage('user', 'Hello');
    chat.addMessage('assistant', 'Hi');

    const exported = chat.exportMessages();
    expect(exported).toHaveLength(2);
    expect(exported[0]).toMatchObject({ role: 'user', content: 'Hello' });
    expect(exported[1]).toMatchObject({ role: 'assistant', content: 'Hi' });
    expect(typeof exported[0].timestamp).toBe('string');
  });

  it('updates model', () => {
    const chat = new ChatManager({ model: 'model-a' });
    chat.setModel('model-b');
    expect(chat.getSession().model).toBe('model-b');
  });

  it('returns recent messages', () => {
    const chat = new ChatManager({ model: 'test' });
    for (let i = 0; i < 10; i++) {
      chat.addMessage('user', `Message ${i}`);
    }
    const recent = chat.getRecentMessages(3);
    expect(recent).toHaveLength(3);
    expect(recent[2].content).toBe('Message 9');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens proportional to length', () => {
    const short = estimateTokens('hello');
    const long = estimateTokens('hello'.repeat(10));
    expect(long).toBeGreaterThan(short);
  });

  it('uses ~4 chars per token', () => {
    const text = 'a'.repeat(100);
    expect(estimateTokens(text)).toBe(25);
  });
});