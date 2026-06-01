/**
 * Sandbox safety layer — detects and warns about dangerous commands
 */

import { DANGEROUS_COMMANDS } from '../config/constants.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  matchedPattern?: string;
  riskLevel: 'safe' | 'warning' | 'danger';
}

export interface DangerousPattern {
  pattern: string | RegExp;
  reason: string;
  riskLevel: 'warning' | 'danger';
}

// ── Dangerous Patterns ────────────────────────────────────────────────────

const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Destructive file operations
  { pattern: /rm\s+-[rf]{1,2}\s+\//, reason: 'Deletes root filesystem', riskLevel: 'danger' },
  { pattern: /rm\s+-rf\s+~/, reason: 'Deletes home directory', riskLevel: 'danger' },
  { pattern: /rm\s+-rf\s+\./, reason: 'Recursively deletes current directory', riskLevel: 'danger' },
  { pattern: /rm\s+-rf/, reason: 'Force recursive deletion', riskLevel: 'warning' },
  { pattern: /del\s+\/[sf]/i, reason: 'Dangerous Windows delete', riskLevel: 'danger' },

  // Disk operations
  { pattern: /mkfs/, reason: 'Formats a filesystem', riskLevel: 'danger' },
  { pattern: /dd\s+if=/, reason: 'Low-level disk write', riskLevel: 'danger' },
  { pattern: />\s*\/dev\/sd/, reason: 'Writes to raw disk device', riskLevel: 'danger' },
  { pattern: />\s*\/dev\/hd/, reason: 'Writes to raw disk device', riskLevel: 'danger' },

  // System operations
  { pattern: /shutdown/, reason: 'Shuts down the system', riskLevel: 'danger' },
  { pattern: /reboot/, reason: 'Reboots the system', riskLevel: 'danger' },
  { pattern: /halt/, reason: 'Halts the system', riskLevel: 'danger' },
  { pattern: /poweroff/, reason: 'Powers off the system', riskLevel: 'danger' },

  // Fork bomb
  { pattern: /:\(\)\{/, reason: 'Fork bomb detected', riskLevel: 'danger' },
  { pattern: /:\(\s*\)\s*\{/, reason: 'Fork bomb detected', riskLevel: 'danger' },

  // Permission escalation
  { pattern: /chmod\s+-R\s+777\s+\//, reason: 'Removes all file permissions on root', riskLevel: 'danger' },
  { pattern: /sudo\s+rm\s+-rf/, reason: 'Superuser force delete', riskLevel: 'danger' },
  { pattern: /sudo\s+chmod\s+-R/, reason: 'Superuser recursive permission change', riskLevel: 'warning' },

  // Windows dangerous
  { pattern: /format\s+[a-z]:/i, reason: 'Formats a Windows drive', riskLevel: 'danger' },
  { pattern: /del\s+\/f\s+\/s\s+\/q\s+[a-z]:\\/i, reason: 'Silent recursive Windows delete', riskLevel: 'danger' },

  // Network exfiltration
  { pattern: /curl.*\|\s*(ba)?sh/, reason: 'Downloads and executes remote code', riskLevel: 'danger' },
  { pattern: /wget.*\|\s*(ba)?sh/, reason: 'Downloads and executes remote code', riskLevel: 'danger' },
  { pattern: /curl.*-o\s*-\s*\|/, reason: 'Pipes download to shell', riskLevel: 'warning' },
];

// ── Functions ─────────────────────────────────────────────────────────────

/**
 * Check if a command is safe to run
 */
export function checkCommandSafety(command: string): SafetyCheckResult {
  const normalized = command.trim();

  // Check against known dangerous literal patterns
  for (const danger of DANGEROUS_COMMANDS) {
    if (normalized.toLowerCase().includes(danger.toLowerCase())) {
      return {
        safe: false,
        reason: `Matches dangerous pattern: "${danger}"`,
        matchedPattern: danger,
        riskLevel: 'danger',
      };
    }
  }

  // Check against regex patterns
  for (const { pattern, reason, riskLevel } of DANGEROUS_PATTERNS) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    if (regex.test(normalized)) {
      return {
        safe: riskLevel !== 'danger',
        reason,
        matchedPattern: String(pattern),
        riskLevel,
      };
    }
  }

  return { safe: true, riskLevel: 'safe' };
}

/**
 * Get a human-readable warning message for a safety check result
 */
export function formatSafetyWarning(result: SafetyCheckResult, command: string): string {
  if (result.riskLevel === 'danger') {
    return [
      `⛔  DANGEROUS COMMAND DETECTED`,
      `    Command: ${command}`,
      `    Reason:  ${result.reason}`,
      `    This command will NOT be executed.`,
    ].join('\n');
  }

  return [
    `⚠️  WARNING: Potentially dangerous command`,
    `    Command: ${command}`,
    `    Reason:  ${result.reason}`,
  ].join('\n');
}

/**
 * Simple check: returns true if the command appears safe
 */
export function isSafeCommand(command: string): boolean {
  return checkCommandSafety(command).riskLevel === 'safe';
}
