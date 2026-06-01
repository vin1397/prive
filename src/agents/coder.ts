/**
 * Coder Agent — generates, modifies, and explains code
 */

import { ChatManager } from '../ai/chat.js';
import { singleFileContext, buildFileContext, renderContext } from '../ai/context.js';
import { writeFile } from '../filesystem/write.js';
import { extractCodeBlocks } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CodeGenRequest {
  task: string;
  language?: string;
  contextFiles?: string[];
  outputFile?: string;
}

export interface CodeGenResult {
  code: string;
  language: string;
  explanation: string;
  written: boolean;
  outputPath?: string;
}

export interface RefactorRequest {
  filePath: string;
  instruction: string;
  dryRun?: boolean;
}

// ── CoderAgent ────────────────────────────────────────────────────────────

export class CoderAgent {
  private chat: ChatManager;

  constructor(model?: string) {
    this.chat = new ChatManager({
      model,
      systemPrompt: `You are an expert software engineer. When asked to generate or modify code:
- Always provide complete, working code — no placeholders or TODOs unless explicitly asked
- Use the language and framework from the context unless instructed otherwise
- Include brief JSDoc or docstring comments for public functions
- Follow the existing code style when modifying files
- When outputting a file, wrap the code in a markdown code block with the language tag
- After the code, provide a short explanation of what you did`,
    });
  }

  /**
   * Generate code for a task, optionally writing to a file
   */
  async generate(request: CodeGenRequest): Promise<CodeGenResult> {
    let prompt = request.task;

    // Add file context if provided
    if (request.contextFiles && request.contextFiles.length > 0) {
      try {
        const ctx = await buildFileContext(request.contextFiles);
        const rendered = renderContext(ctx);
        prompt = `${rendered}\n\n---\n\nTask: ${request.task}`;
      } catch {
        // Context loading is best-effort
      }
    }

    if (request.language) {
      prompt += `\n\nLanguage/framework: ${request.language}`;
    }

    if (request.outputFile) {
      prompt += `\n\nOutput file path: ${request.outputFile}`;
    }

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    // Extract code blocks from response
    const blocks = extractCodeBlocks(response);
    const primaryBlock = blocks[0] ?? { lang: request.language ?? 'text', code: response };

    let written = false;
    let outputPath: string | undefined;

    // Write to file if requested
    if (request.outputFile && primaryBlock.code) {
      try {
        await writeFile(request.outputFile, primaryBlock.code);
        written = true;
        outputPath = request.outputFile;
      } catch (err) {
        logger.error(`Failed to write file: ${request.outputFile}`, err);
      }
    }

    // Extract explanation (text after last code block)
    const explanation = response
      .replace(/```[\s\S]*?```/g, '')
      .trim()
      .split('\n')
      .filter(l => l.trim())
      .join('\n');

    return {
      code: primaryBlock.code,
      language: primaryBlock.lang,
      explanation,
      written,
      outputPath,
    };
  }

  /**
   * Refactor an existing file based on instructions
   */
  async refactor(request: RefactorRequest): Promise<string> {
    const context = await singleFileContext(request.filePath);
    const prompt = `${context}\n\nInstruction: ${request.instruction}\n\nProvide the complete refactored file.`;

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    if (!request.dryRun) {
      const blocks = extractCodeBlocks(response);
      if (blocks[0]?.code) {
        await writeFile(request.filePath, blocks[0].code, { backup: true });
        logger.success(`Refactored ${request.filePath} (backup saved)`);
      }
    }

    return response;
  }

  /**
   * Explain what a file or code snippet does
   */
  async explain(filePath: string, question?: string): Promise<string> {
    const context = await singleFileContext(filePath);
    const q = question ?? 'Explain what this code does in detail.';
    const prompt = `${context}\n\n${q}`;

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    return response;
  }

  /**
   * Add the result to chat history without generating
   */
  addContext(context: string): void {
    this.chat.addContext(context);
  }

  /**
   * Ask a follow-up question (continues the conversation)
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
