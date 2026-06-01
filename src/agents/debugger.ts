/**
 * Debugger Agent — analyzes errors and suggests fixes
 */

import { ChatManager } from '../ai/chat.js';
import { singleFileContext } from '../ai/context.js';
import { writeFile } from '../filesystem/write.js';
import { extractCodeBlocks } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DebugRequest {
  error: string;
  filePath?: string;
  stackTrace?: string;
  context?: string;
}

export interface DebugResult {
  analysis: string;
  rootCause?: string;
  fixes: Array<{ description: string; code?: string }>;
  applied: boolean;
}

// ── DebuggerAgent ─────────────────────────────────────────────────────────

export class DebuggerAgent {
  private chat: ChatManager;

  constructor(model?: string) {
    this.chat = new ChatManager({
      model,
      systemPrompt: `You are an expert debugger. When analyzing errors:
1. Identify the root cause clearly
2. Explain why the error occurs
3. Provide specific, actionable fixes
4. If providing code fixes, include the complete corrected code
5. Mention if there are related issues to watch for

Format your response as:
**Root Cause**: [brief explanation]
**Analysis**: [detailed explanation]
**Fix**: [solution with code if needed]
**Prevention**: [how to avoid this in the future]`,
    });
  }

  /**
   * Analyze an error and suggest fixes
   */
  async analyze(request: DebugRequest): Promise<DebugResult> {
    const parts: string[] = [];

    // Add file context if provided
    if (request.filePath) {
      try {
        const ctx = await singleFileContext(request.filePath);
        parts.push(ctx);
      } catch {
        // Context is optional
      }
    }

    if (request.context) {
      parts.push(`## Context\n${request.context}`);
    }

    parts.push(`## Error\n\`\`\`\n${request.error}\n\`\`\``);

    if (request.stackTrace) {
      parts.push(`## Stack Trace\n\`\`\`\n${request.stackTrace}\n\`\`\``);
    }

    parts.push('Please analyze this error and provide a fix.');

    const prompt = parts.join('\n\n');

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    // Parse structured response
    const fixes = extractCodeBlocks(response).map(block => ({
      description: 'Code fix',
      code: block.code,
    }));

    // Extract root cause from response
    const rootCauseMatch = response.match(/\*\*Root Cause\*\*:?\s*(.+?)(?:\n|$)/i);

    return {
      analysis: response,
      rootCause: rootCauseMatch?.[1]?.trim(),
      fixes: fixes.length > 0 ? fixes : [{ description: response }],
      applied: false,
    };
  }

  /**
   * Apply a fix to a file with AI assistance
   */
  async applyFix(
    filePath: string,
    errorDescription: string,
  ): Promise<{ success: boolean; message: string }> {
    const context = await singleFileContext(filePath);
    const prompt = `${context}\n\nError to fix: ${errorDescription}\n\nProvide the complete fixed file.`;

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    const blocks = extractCodeBlocks(response);
    if (!blocks[0]?.code) {
      return { success: false, message: 'No code fix found in response' };
    }

    try {
      await writeFile(filePath, blocks[0].code, { backup: true });
      return { success: true, message: `Fixed ${filePath} (backup saved as ${filePath}.bak)` };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  /**
   * Analyze test failures
   */
  async analyzeTestFailure(
    testOutput: string,
    testFile?: string,
  ): Promise<string> {
    let prompt = `## Test Output\n\`\`\`\n${testOutput}\n\`\`\``;

    if (testFile) {
      try {
        const ctx = await singleFileContext(testFile);
        prompt = `${ctx}\n\n${prompt}`;
      } catch {
        // Optional
      }
    }

    prompt += '\n\nAnalyze these test failures and suggest what needs to be fixed.';

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    return response;
  }

  /**
   * Continue debugging conversation
   */
  async followUp(message: string): Promise<string> {
    const response = await this.chat.send(message, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();
    return response;
  }
}
