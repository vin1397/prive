/**
 * Architect Agent — analyzes project structure and suggests improvements
 */

import { ChatManager } from '../ai/chat.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { findFiles } from '../filesystem/search.js';
import { buildFileContext, renderContext } from '../ai/context.js';
import logger from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ArchitectureAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  suggestions: string[];
  rawResponse: string;
}

// ── ArchitectAgent ────────────────────────────────────────────────────────

export class ArchitectAgent {
  private chat: ChatManager;

  constructor(model?: string) {
    this.chat = new ChatManager({
      model,
      systemPrompt: `You are a senior software architect with 15+ years of experience.
When analyzing projects:
- Identify architectural patterns in use
- Highlight what's done well
- Point out potential scalability, maintainability, or security concerns
- Suggest concrete, actionable improvements with reasoning
- Consider the apparent scale and purpose of the project before suggesting enterprise patterns
- Be pragmatic: suggest improvements appropriate to the project's evident complexity`,
    });
  }

  /**
   * Analyze the overall project structure
   */
  async analyzeProject(projectRoot: string = process.cwd()): Promise<ArchitectureAnalysis> {
    // Build project tree
    let tree = '';
    try {
      tree = await generateProjectTree(projectRoot, { maxDepth: 4 });
    } catch {
      tree = 'Unable to generate project tree';
    }

    // Find key config files to read
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'README.md',
    ];

    const keyFiles: string[] = [];
    for (const file of configPatterns) {
      const found = await findFiles(undefined, {
        cwd: projectRoot,
        maxResults: 1,
      }).then(files => files.find(f => f.endsWith(file)));
      if (found) keyFiles.push(found);
    }

    // Build context from key files
    let fileContext = '';
    if (keyFiles.length > 0) {
      try {
        const ctx = await buildFileContext(keyFiles.slice(0, 5));
        fileContext = renderContext(ctx);
      } catch {
        // Optional
      }
    }

    const prompt = [
      `## Project Tree\n\`\`\`\n${tree}\n\`\`\``,
      fileContext,
      'Please analyze this project architecture. Identify patterns, strengths, concerns, and provide actionable improvement suggestions.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    return this.parseAnalysis(response);
  }

  /**
   * Suggest architecture for a new feature
   */
  async suggestFeatureArchitecture(
    featureDescription: string,
    projectRoot: string = process.cwd(),
  ): Promise<string> {
    let tree = '';
    try {
      tree = await generateProjectTree(projectRoot, { maxDepth: 3 });
    } catch {
      // Optional
    }

    const prompt = tree
      ? `## Existing Project Structure\n\`\`\`\n${tree}\n\`\`\`\n\nNew feature to implement: ${featureDescription}\n\nSuggest how to architect and integrate this feature.`
      : `New feature to implement: ${featureDescription}\n\nSuggest how to architect this feature.`;

    const response = await this.chat.send(prompt, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    return response;
  }

  /**
   * Review a specific module or directory
   */
  async reviewModule(dirPath: string): Promise<string> {
    let tree = '';
    try {
      tree = await generateProjectTree(dirPath, { maxDepth: 2 });
    } catch {
      // Optional
    }

    const files = await findFiles(undefined, { cwd: dirPath, maxResults: 15 });
    let ctx = '';
    if (files.length > 0) {
      const fileCtx = await buildFileContext(files.slice(0, 10));
      ctx = renderContext(fileCtx);
    }

    const parts = [
      tree ? `## Module Structure\n\`\`\`\n${tree}\n\`\`\`` : '',
      ctx,
      'Review this module. What is it doing? What could be improved?',
    ].filter(Boolean);

    const response = await this.chat.send(parts.join('\n\n'), {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();

    return response;
  }

  /**
   * Continue architecture conversation
   */
  async followUp(message: string): Promise<string> {
    const response = await this.chat.send(message, {
      stream: true,
      onChunk: chunk => logger.ai(chunk),
    });
    logger.aiEnd();
    return response;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private parseAnalysis(response: string): ArchitectureAnalysis {
    // Attempt to extract structured sections
    const extractSection = (header: string): string[] => {
      const regex = new RegExp(`##?\\s*${header}[:\\s]*([\\s\\S]*?)(?=##|$)`, 'i');
      const match = response.match(regex);
      if (!match) return [];
      return match[1]
        .split('\n')
        .map(l => l.replace(/^[-*•]\s*/, '').trim())
        .filter(l => l.length > 0);
    };

    const strengths = extractSection('strengths?');
    const concerns = extractSection('concerns?|issues?|problems?');
    const suggestions = extractSection('suggestions?|improvements?|recommendations?');

    // Summary: first non-empty paragraph
    const summary =
      response
        .split('\n\n')
        .find(p => p.trim() && !p.startsWith('#'))
        ?.trim() ?? response.slice(0, 300);

    return {
      summary,
      strengths: strengths.slice(0, 5),
      concerns: concerns.slice(0, 5),
      suggestions: suggestions.slice(0, 5),
      rawResponse: response,
    };
  }
}
