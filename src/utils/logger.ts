/**
 * Prive — Enhanced logger with live system dashboard
 * Red × Purple theme · CPU · GPU · Memory · Temperature · Network
 * Cross-platform: Windows · Linux · macOS
 */

import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import os from 'os';
import { execSync } from 'child_process';

// ── Types ─────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

// ── Debug toggle ──────────────────────────────────────────────────────────

let _debugEnabled = false;
export function enableDebug(): void { _debugEnabled = true; }

// ── Theme gradients ────────────────────────────────────────────────────────

const priGrad  = gradient(['#7c3aed', '#a21caf', '#dc2626']);
const purpGrad = gradient(['#7c3aed', '#c084fc']);

// ── Safe cross-platform exec ───────────────────────────────────────────────

/**
 * Run a command silently. Returns '' on any failure — never throws, never
 * prints to stderr. Works on Windows, Linux, macOS.
 */
function safeExec(cmd: string, timeoutMs = 800): string {
  try {
    return execSync(cmd, {
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'], // swallow stderr on every platform
      windowsHide: true,                   // no cmd flash on Windows
      shell: os.platform() === 'win32' ? 'cmd.exe' : '/bin/sh',
    }).toString().trim();
  } catch {
    return '';
  }
}

// ── System metrics ─────────────────────────────────────────────────────────

function cpuUsage(): number {
  try {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
      for (const [k, v] of Object.entries(cpu.times)) {
        total += v;
        if (k === 'idle') idle += v;
      }
    }
    return Math.round(100 - (idle / total) * 100);
  } catch { return 0; }
}

function memStats(): { used: number; total: number; pct: number } {
  const total = os.totalmem();
  const free  = os.freemem();
  const used  = total - free;
  return {
    used:  Math.round(used  / 1024 / 1024 / 1024 * 10) / 10,
    total: Math.round(total / 1024 / 1024 / 1024 * 10) / 10,
    pct:   Math.round((used / total) * 100),
  };
}

function cpuTemp(): string {
  const plat = os.platform();

  if (plat === 'linux') {
    const raw = safeExec('cat /sys/class/thermal/thermal_zone0/temp');
    if (raw && /^\d+$/.test(raw)) return Math.round(parseInt(raw) / 1000) + '°C';
  }

  if (plat === 'darwin') {
    // Try powermetrics (may need sudo in some configs)
    const raw = safeExec('powermetrics --samplers smc -n 1 -i 1', 2000);
    const m = raw.match(/CPU die temperature:\s*([\d.]+)/i);
    if (m) return Math.round(parseFloat(m[1])) + '°C';
  }

  if (plat === 'win32') {
    // WMI — built into Windows, no extra tools needed
    const raw = safeExec(
      'wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature /value',
      1500,
    );
    const m = raw.match(/CurrentTemperature=(\d+)/);
    if (m) return Math.round((parseInt(m[1]) - 2732) / 10) + '°C';
  }

  return 'N/A';
}

function gpuInfo(): string {
  // nvidia-smi works on Windows + Linux + macOS with NVIDIA GPU
  const raw = safeExec(
    'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
  );
  if (raw) {
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length >= 3 && parts[0] !== '') {
      return `${parts[0]}% · ${parts[1]}/${parts[2]} MB`;
    }
  }
  return 'N/A';
}

function netStats(): string {
  try {
    const ifaces = os.networkInterfaces();
    const active = Object.entries(ifaces)
      .flatMap(([, addrs]) => addrs ?? [])
      .filter(a => !a.internal && a.family === 'IPv4');
    return active[0]?.address ?? 'offline';
  } catch { return 'N/A'; }
}

function uptimeStr(): string {
  const s = os.uptime();
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function loadAvg(): string {
  try {
    const [l1, l5, l15] = os.loadavg().map(n => n.toFixed(2));
    return `${l1}  ${l5}  ${l15}`;
  } catch { return 'N/A'; }
}

function platformStr(): string {
  const p = os.platform();
  const map: Record<string, string> = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };
  return (map[p] ?? p) + ' ' + os.arch();
}

// ── Bar renderer ──────────────────────────────────────────────────────────

function bar(pct: number, width = 16): string {
  const filled = Math.round((pct / 100) * width);
  const empty  = width - filled;
  const color  = pct > 80 ? chalk.red : pct > 50 ? chalk.magenta : chalk.hex('#7c3aed');
  return color('█'.repeat(filled)) + chalk.hex('#2d2d2d')('░'.repeat(empty));
}

// ── Metric row ────────────────────────────────────────────────────────────

function row(icon: string, label: string, value: string, extra = ''): string {
  const lPad = label.padEnd(12);
  const vPad = value.padEnd(18);
  return `  ${icon}  ${chalk.hex('#a78bfa')(lPad)}  ${chalk.white(vPad)}${chalk.hex('#4b4b6b')(extra)}`;
}

// ── Banner ────────────────────────────────────────────────────────────────

export function banner(version: string, model: string, projectName: string): void {
  const logo = priGrad(`
 ██████╗ ██████╗ ██╗██╗   ██╗███████╗
 ██╔══██╗██╔══██╗██║██║   ██║██╔════╝
 ██████╔╝██████╔╝██║██║   ██║█████╗
 ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝██╔══╝
 ██║     ██║  ██║██║ ╚████╔╝ ███████╗
 ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝`);

  console.clear();
  console.log(logo);
  console.log(chalk.hex('#4b4b6b')('  ' + '─'.repeat(42)));
  console.log(
    chalk.hex('#7c3aed')('  ⚡ Your Local AI Coding Companion') +
    chalk.hex('#4b4b6b')(` · v${version}`)
  );
  console.log('');

  // collect metrics — all wrapped so a single failure can't break the banner
  const cpu  = cpuUsage();
  const mem  = memStats();
  const temp = cpuTemp();   // 'N/A' on unsupported platforms — never throws
  const gpu  = gpuInfo();   // 'N/A' without nvidia-smi — never throws
  const net  = netStats();
  const up   = uptimeStr();
  const load = loadAvg();
  const plat = platformStr();
  const cores = String(os.cpus().length);

  const sysBlock =
`${chalk.hex('#dc2626').bold('  ◆ SYSTEM')}${chalk.hex('#4b4b6b')(' ─────────────────────────────────────────')}

${row('⚙', 'CPU', cpu + '%', '  ' + bar(cpu) + '  ' + chalk.hex('#dc2626')(cpu + '%'))}
${row('🧠', 'Memory', `${mem.used}/${mem.total} GB`, '  ' + bar(mem.pct) + '  ' + chalk.hex('#dc2626')(mem.pct + '%'))}
${row('🌡', 'Temp', temp, '')}
${row('🎮', 'GPU', gpu, '')}
${row('🌐', 'Network', net, '')}
${row('⏱', 'Uptime', up, '')}
${row('📊', 'Load avg', load, chalk.hex('#4b4b6b')('  1m · 5m · 15m'))}
${row('💻', 'Platform', plat, '')}
${row('🔢', 'CPU cores', cores, '')}

${chalk.hex('#7c3aed').bold('  ◆ PRIVE')}${chalk.hex('#4b4b6b')(' ──────────────────────────────────────────')}

${row('🤖', 'Model', model, '')}
${row('📂', 'Project', projectName, '')}
${row('🧩', 'Agents', 'Architect · Coder · Debugger', '')}
${row('💾', 'Memory', '.prive/memory.json', '')}
${row('🔌', 'Ollama', 'localhost:11434', '')}
${row('🔒', 'Privacy', '100% local · no telemetry', '')}

${chalk.hex('#dc2626').bold('  ◆ QUICK COMMANDS')}${chalk.hex('#4b4b6b')(' ────────────────────────────────')}

  ${chalk.hex('#7c3aed')('/help')}    ${chalk.hex('#4b4b6b')('Show all commands')}     ${chalk.hex('#7c3aed')('/model')}   ${chalk.hex('#4b4b6b')('Switch model')}
  ${chalk.hex('#7c3aed')('/read')}    ${chalk.hex('#4b4b6b')('Load file to context')}  ${chalk.hex('#7c3aed')('/tree')}    ${chalk.hex('#4b4b6b')('Project tree')}
  ${chalk.hex('#7c3aed')('/run')}     ${chalk.hex('#4b4b6b')('Run a command')}         ${chalk.hex('#7c3aed')('/git')}     ${chalk.hex('#4b4b6b')('Git operations')}
  ${chalk.hex('#7c3aed')('/debug')}   ${chalk.hex('#4b4b6b')('Analyze an error')}      ${chalk.hex('#7c3aed')('/exit')}    ${chalk.hex('#4b4b6b')('Quit')}`;

  const box = boxen(sysBlock, {
    padding: { top: 0, bottom: 1, left: 1, right: 2 },
    borderStyle: 'double',
    borderColor: '#7c3aed',
    title: chalk.hex('#dc2626').bold(' ⚡ PRIVE DASHBOARD '),
    titleAlignment: 'center',
  });

  console.log(box);
  console.log('');
}

// ── Live ticker ───────────────────────────────────────────────────────────

let _dashInterval: NodeJS.Timeout | null = null;

export function startLiveTicker(): void {
  const render = () => {
    const cpu  = cpuUsage();
    const mem  = memStats();
    const temp = cpuTemp();
    process.stdout.write(
      '\r' +
      chalk.hex('#4b4b6b')('  [') +
      chalk.hex('#dc2626')(`CPU ${cpu}%`) +
      chalk.hex('#4b4b6b')(' · ') +
      chalk.hex('#a21caf')(`MEM ${mem.pct}%`) +
      chalk.hex('#4b4b6b')(' · ') +
      chalk.hex('#7c3aed')(`TEMP ${temp}`) +
      chalk.hex('#4b4b6b')(']  ')
    );
  };
  render();
  _dashInterval = setInterval(render, 2000);
}

export function stopLiveTicker(): void {
  if (_dashInterval) {
    clearInterval(_dashInterval);
    _dashInterval = null;
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }
}

export function sysSnapshot(): string {
  const cpu  = cpuUsage();
  const mem  = memStats();
  const temp = cpuTemp();
  return (
    chalk.hex('#4b4b6b')('[') +
    chalk.hex('#dc2626')(`CPU ${cpu}%`) +
    chalk.hex('#4b4b6b')('·') +
    chalk.hex('#a21caf')(`RAM ${mem.pct}%`) +
    chalk.hex('#4b4b6b')('·') +
    chalk.hex('#7c3aed')(temp) +
    chalk.hex('#4b4b6b')(']')
  );
}

// ── Standard log functions ────────────────────────────────────────────────

export function info(message: string, ...args: unknown[]): void {
  console.log(chalk.hex('#818cf8')('ℹ'), chalk.white(message), ...args);
}

export function success(message: string, ...args: unknown[]): void {
  console.log(chalk.hex('#4ade80')('✓'), chalk.hex('#4ade80')(message), ...args);
}

export function warn(message: string, ...args: unknown[]): void {
  console.log(chalk.yellow('⚠'), chalk.yellow(message), ...args);
}

export function error(message: string, err?: unknown): void {
  console.error(chalk.red('✗'), chalk.red(message));
  if (err && _debugEnabled) console.error(chalk.red(String(err)));
}

export function debug(message: string, ...args: unknown[]): void {
  if (!_debugEnabled) return;
  console.log(chalk.hex('#4b4b6b')('[debug]'), chalk.hex('#4b4b6b')(message), ...args);
}

export function ai(text: string): void {
  process.stdout.write(chalk.white(text));
}

export function aiEnd(): void {
  process.stdout.write('\n');
}

export function divider(): void {
  console.log(priGrad('─'.repeat(52)));
}

export function header(title: string): void {
  console.log('');
  console.log(
    chalk.hex('#dc2626')('◆') + ' ' +
    purpGrad(title) +
    ' ' + chalk.hex('#4b4b6b')('─'.repeat(Math.max(0, 40 - title.length)))
  );
  console.log('');
}

export function kv(key: string, value: string): void {
  console.log(`  ${chalk.hex('#7c3aed')(key + ':')} ${chalk.white(value)}`);
}

export const logger = {
  info, success, warn, error, debug,
  ai, aiEnd, divider, header, kv, banner,
  startLiveTicker, stopLiveTicker, sysSnapshot,
};
export default logger;
