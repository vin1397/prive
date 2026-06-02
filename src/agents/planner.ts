/**
 * Prive — Autonomous Task Planner (Phase 4)
 *
 * Breaks a high-level goal into discrete steps and chains the
 * Coder, Debugger, Architect agents + Terminal + Git automatically.
 */

import { ChatManager } from '../ai/chat.js';
import { CoderAgent } from './coder.js';
import { DebuggerAgent } from './debugger.js';
import { ArchitectAgent } from './architect.js';
import { execute } from '../terminal/execute.js';
import { commit, stageAll } from '../git/commit.js';
import { getStatus } from '../git/status.js';
import { findFiles } from '../filesystem/search.js';
import { buildFileContext, renderContext } from '../ai/context.js';
import { generateProjectTree } from '../filesystem/tree.js';
import { getSettings } from '../config/settings.js';
import { extractCodeBlocks } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

// ── Types ─────────────────────────────────────────────────────────────────

export type StepType =
  | 'analyze'      // architect agent — understand the codebase
  | 'generate'     // coder agent — create/modify files
  | 'refactor'     // coder agent — refactor existing file
  | 'debug'        // debugger agent — fix errors
  | 'run'          // terminal — execute a command
  | 'test'         // terminal — run tests
  | 'git_commit'   // git — stage + commit
  | 'think';       // pure reasoning step (no side effects)

export interface PlanStep {
  id: number;
  type: StepType;
  title: string;
  description: string;
  /** File path(s) relevant to this step */
  files?: string[];
  /** Terminal command (for run/test steps) */
  command?: string;
  /** Commit message (for git_commit steps) */
  commitMessage?: string;
  /** Whether this step is optional — skip on failure */
  optional?: boolean;
}

export interface TaskPlan {
  goal: string;
  steps: PlanStep[];
  estimatedMinutes: number;
  reasoning: string;
}

export interface StepResult {
  step: PlanStep;
  success: boolean;
  output: string;
  skipped: boolean;
  durationMs: number;
}

export interface PlannerResult {
  goal: string;
  plan: TaskPlan;
  results: StepResult[];
  success: boolean;
  summary: string;
  totalDurationMs: number;
}

// ── Planner ───────────────────────────────────────────────────────────────

export class TaskPlanner {
  private planner: ChatManager;

  constructor(model?: string) {
    const settings = getSettings();
    this.planner = new ChatManager({
      model: model ?? settings.model,
      systemPrompt: `You are a task planning engine for an AI coding assistant called Prive.

Given a developer's goal, you produce a structured JSON execution plan.

The plan must be a JSON object with this exact shape:
{
  "goal": "<original goal>",
  "estimatedMinutes": <number>,
  "reasoning": "<why this plan>",
  "steps": [
    {
      "id": 1,
      "type": "<one of: analyze|generate|refactor|debug|run|test|git_commit|think>",
      "title": "<short title>",
      "description": "<what to do in this step>",
      "files": ["<file path>"],          // optional
      "command": "<shell command>",      // only for run/test steps
      "commitMessage": "<msg>",          // only for git_commit steps
      "optional": false
    }
  ]
}

Rules:
- Always start with an "analyze" step to understand the project
- Always include a "test" step if tests exist
- Keep steps atomic — one action per step
- Maximum 12 steps per plan
- Use "think" steps for complex reasoning that informs later steps
- Only include "git_commit" if the user's goal implies shipping/saving
- Output ONLY valid JSON — no markdown, no explanation outside the JSON`,
    });
  }

  /**
   * Create a plan for a given goal without executing it
   */
  async plan(goal: string, cwd: string = process.cwd()): Promise<TaskPlan> {
    logger.info('Analyzing project for task planning...');

    // Give the planner project context
    let tree = '';
    try { tree = await generateProjectTree(cwd, { maxDepth: 3 }); } catch { /**/ }

    const files = await findFiles(undefined, { cwd, maxResults: 30 });
    let fileCtx = '';
    if (files.length > 0) {
      const ctx = await buildFileContext(files.slice(0, 8));
      fileCtx = renderContext(ctx);
    }

    const prompt = [
      tree ? `## Project structure\n\`\`\`\n${tree}\n\`\`\`` : '',
      fileCtx,
      `## Goal\n${goal}`,
      'Produce the JSON execution plan now.',
    ].filter(Boolean).join('\n\n');

    const raw = await this.planner.send(prompt);

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as TaskPlan;
      parsed.goal = goal;
      return parsed;
    } catch {
      // Fallback: return a simple single-step plan
      return {
        goal,
        estimatedMinutes: 5,
        reasoning: 'Could not parse structured plan; falling back to single analysis step.',
        steps: [
          {
            id: 1,
            type: 'analyze',
            title: 'Analyze project',
            description: goal,
          },
        ],
      };
    }
  }

  /**
   * Plan and execute a goal end-to-end
   */
  async execute(goal: string, cwd: string = process.cwd()): Promise<PlannerResult> {
    const totalStart = Date.now();

    // ── 1. Plan ──────────────────────────────────────────────────────────
    logger.header('Task Planner');
    console.log(chalk.hex('#a78bfa')(`  Goal: `) + chalk.white(goal));
    console.log('');

    const plan = await this.plan(goal, cwd);

    // Print plan
    console.log(chalk.hex('#dc2626')('  ◆ Execution Plan'));
    console.log(chalk.hex('#4b4b6b')(`  ${plan.reasoning}`));
    console.log('');
    plan.steps.forEach(s => {
      const typeColor = typeColors[s.type] ?? '#aaa';
      console.log(
        `  ${chalk.hex('#4b4b6b')(String(s.id).padStart(2, '0') + '.')} ` +
        chalk.hex(typeColor)(`[${s.type.toUpperCase()}]`) + ' ' +
        chalk.white(s.title)
      );
      console.log(`      ${chalk.hex('#4b4b6b')(s.description)}`);
    });
    console.log('');

    // ── 2. Execute each step ─────────────────────────────────────────────
    const results: StepResult[] = [];
    let allSuccess = true;

    for (const step of plan.steps) {
      const stepStart = Date.now();
      logger.divider();
      console.log('');
      console.log(
        chalk.hex('#7c3aed')(`  Step ${step.id}/${plan.steps.length}: `) +
        chalk.white(step.title)
      );
      console.log('');

      let success = false;
      let output = '';
      let skipped = false;

      try {
        const res = await this.runStep(step, cwd);
        success = res.success;
        output = res.output;
        skipped = res.skipped;
      } catch (err) {
        output = err instanceof Error ? err.message : String(err);
        success = false;
      }

      const durationMs = Date.now() - stepStart;
      results.push({ step, success, output, skipped, durationMs });

      if (!success && !step.optional) {
        allSuccess = false;
        logger.warn(`Step ${step.id} failed — stopping plan execution.`);
        break;
      }

      console.log('');
      if (success) {
        logger.success(`Step ${step.id} complete (${(durationMs / 1000).toFixed(1)}s)`);
      } else if (skipped) {
        logger.warn(`Step ${step.id} skipped`);
      } else {
        logger.warn(`Step ${step.id} failed but is optional — continuing`);
      }
    }

    // ── 3. Summary ───────────────────────────────────────────────────────
    const totalMs = Date.now() - totalStart;
    const done = results.filter(r => r.success).length;
    const summary = [
      `Completed ${done}/${plan.steps.length} steps in ${(totalMs / 1000).toFixed(1)}s.`,
      allSuccess ? 'All tasks completed successfully.' : 'Some steps failed.',
    ].join(' ');

    logger.divider();
    console.log('');
    if (allSuccess) {
      logger.success(summary);
    } else {
      logger.warn(summary);
    }
    console.log('');

    return { goal, plan, results, success: allSuccess, summary, totalDurationMs: totalMs };
  }

  // ── Step executor ─────────────────────────────────────────────────────

  private async runStep(
    step: PlanStep,
    cwd: string,
  ): Promise<{ success: boolean; output: string; skipped: boolean }> {
    switch (step.type) {

      case 'think': {
        // Pure reasoning — ask AI and print result, no side effects
        const thinkChat = new ChatManager({ model: getSettings().model });
        const response = await thinkChat.send(step.description, {
          stream: true,
          onChunk: c => logger.ai(c),
        });
        logger.aiEnd();
        return { success: true, output: response, skipped: false };
      }

      case 'analyze': {
        const agent = new ArchitectAgent();
        const analysis = await agent.analyzeProject(cwd);
        return { success: true, output: analysis.rawResponse, skipped: false };
      }

      case 'generate': {
        const agent = new CoderAgent();
        const result = await agent.generate({
          task: step.description,
          contextFiles: step.files,
          outputFile: step.files?.[0],
        });
        return { success: true, output: result.code, skipped: false };
      }

      case 'refactor': {
        if (!step.files?.[0]) {
          return { success: false, output: 'No file specified for refactor', skipped: false };
        }
        const agent = new CoderAgent();
        const out = await agent.refactor({
          filePath: step.files[0],
          instruction: step.description,
          dryRun: false,
        });
        return { success: true, output: out, skipped: false };
      }

      case 'debug': {
        const agent = new DebuggerAgent();
        const result = await agent.analyze({
          error: step.description,
          filePath: step.files?.[0],
        });
        return { success: true, output: result.analysis, skipped: false };
      }

      case 'run': {
        if (!step.command) {
          return { success: false, output: 'No command specified', skipped: false };
        }
        const result = await execute(step.command, { cwd });
        console.log(chalk.hex('#4b4b6b')(result.stdout.slice(0, 800)));
        if (!result.success && result.stderr) {
          console.log(chalk.red(result.stderr.slice(0, 400)));
        }
        return { success: result.success, output: result.stdout, skipped: false };
      }

      case 'test': {
        const cmd = step.command ?? 'npm test';
        const result = await execute(cmd, { cwd });
        console.log(chalk.hex('#4b4b6b')(result.stdout.slice(0, 1000)));
        return { success: result.success, output: result.stdout, skipped: false };
      }

      case 'git_commit': {
        const status = await getStatus(cwd);
        if (status.isClean) {
          logger.info('Nothing to commit — working tree clean');
          return { success: true, output: 'Nothing to commit', skipped: true };
        }
        const msg = step.commitMessage ?? step.description;
        await stageAll(cwd);
        const { commit: commitFn } = await import('../git/commit.js');
        const result = await commitFn(msg, [], { all: false }, cwd);
        logger.success(`Committed: ${result.hash} "${msg}"`);
        return { success: true, output: result.hash, skipped: false };
      }

      default:
        return { success: false, output: `Unknown step type: ${step.type}`, skipped: true };
    }
  }
}

// ── Colour map per step type ──────────────────────────────────────────────

const typeColors: Record<StepType, string> = {
  analyze:    '#7c3aed',
  generate:   '#a21caf',
  refactor:   '#9333ea',
  debug:      '#dc2626',
  run:        '#0ea5e9',
  test:       '#16a34a',
  git_commit: '#ca8a04',
  think:      '#6b7280',
};

// ── Singleton factory ─────────────────────────────────────────────────────

export function createPlanner(model?: string): TaskPlanner {
  return new TaskPlanner(model);
}
