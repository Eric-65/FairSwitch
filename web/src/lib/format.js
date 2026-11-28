import { formatUnits, parseUnits } from 'viem';
import { USDT_DECIMALS } from '../config.js';

export const usdt = (v, dp = 2) => Number(formatUnits(BigInt(v ?? 0), USDT_DECIMALS)).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const toUsdtUnits = (s) => parseUnits(String(s || '0'), USDT_DECIMALS);
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const pad2 = (n) => String(n).padStart(2, '0');

export function countdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return { d, h, m, s: s % 60, text: `${d}d ${pad2(h)}h ${pad2(m)}m` };
}
