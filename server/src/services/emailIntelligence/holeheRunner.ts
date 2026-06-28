import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getHolehePython,
  getHoleheScriptPath,
  getHoleheTimeoutMs,
  isHolehePasswordRecoveryEnabled,
} from '../../lib/intelligenceConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface HoleheRawResult {
  name?: string;
  domain?: string;
  rateLimit?: boolean;
  exists?: boolean;
  emailrecovery?: string | null;
  phoneNumber?: string | null;
  others?: Record<string, unknown> | string | null;
  error?: boolean;
}

export interface HoleheScanPayload {
  email: string;
  results: HoleheRawResult[];
  stats: {
    totalChecked: number;
    totalFound: number;
    rateLimited: number;
    errors: number;
  };
}

let availabilityCache: { checkedAt: number; available: boolean } | null = null;
const AVAILABILITY_TTL_MS = 60_000;

export async function isHoleheRuntimeAvailable(): Promise<boolean> {
  if (process.env.HOLEHE_ENABLED === 'false') return false;

  if (availabilityCache && Date.now() - availabilityCache.checkedAt < AVAILABILITY_TTL_MS) {
    return availabilityCache.available;
  }

  const python = getHolehePython();
  const scriptPath = await resolveHoleheScriptPath();

  try {
    await access(scriptPath);
  } catch {
    availabilityCache = { checkedAt: Date.now(), available: false };
    return false;
  }

  const available = await new Promise<boolean>((resolve) => {
    const proc = spawn(python, ['-c', 'import holehe, httpx, trio'], { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });

  availabilityCache = { checkedAt: Date.now(), available };
  return available;
}

async function resolveHoleheScriptPath(): Promise<string> {
  const configured = getHoleheScriptPath();
  if (configured) return configured;
  return path.resolve(__dirname, '../../../scripts/holehe_scan.py');
}

export async function runHoleheScan(email: string): Promise<HoleheScanPayload> {
  const python = getHolehePython();
  const scriptPath = await resolveHoleheScriptPath();
  const timeoutMs = getHoleheTimeoutMs();
  const args = [scriptPath, email, `--timeout=${Math.max(5, Math.floor(timeoutMs / 12_000))}`];

  if (isHolehePasswordRecoveryEnabled()) {
    args.push('--password-recovery');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Holehe scan timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Holehe exited with code ${code}`));
        return;
      }

      try {
        const jsonLine = stdout
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('{'))
          .pop();

        if (!jsonLine) {
          throw new Error('No JSON payload in Holehe output');
        }

        const payload = JSON.parse(jsonLine) as HoleheScanPayload;
        resolve(payload);
      } catch {
        reject(new Error(`Failed to parse Holehe output: ${stdout.slice(0, 200)}`));
      }
    });
  });
}
