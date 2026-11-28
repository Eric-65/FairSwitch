// Single source of truth for chain + addresses. Values that don't exist yet are null
// and the UI labels anything depending on them as "demo".
const env = import.meta.env;

export const CHAIN_ID = 196;

export const ADDR = {
  // Public TapeOut processor we tape out on (OrderGuard, X Layer). Verified live 2026-11-28.
  processor: env.VITE_PROCESSOR || '0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355',
  // Set after the maintainer tapes out (see circuit/scripts/plan-tapeout.js).
  circuitId: env.VITE_CIRCUIT_ID ? BigInt(env.VITE_CIRCUIT_ID) : null,
  // Set after FairSwitchRegistry is deployed.
  registry: env.VITE_REGISTRY || null,
  usdt0: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
  factory: '0x1f09DAeFA827f02CBb40967cc91b259763760761',
};

export const USDT_DECIMALS = 6;

export const oklink = (addr) => `https://www.oklink.com/x-layer/address/${addr}`;
export const oklinkTx = (hash) => `https://www.oklink.com/x-layer/tx/${hash}`;

// Placeholder social links: replace when they exist.
export const LINKS = [
  { label: 'GitHub', href: 'https://github.com/eric-65/fairswitch', placeholder: false },
  { label: 'X', href: '#', placeholder: true },
  { label: 'Telegram', href: '#', placeholder: true },
  { label: 'Docs', href: 'https://github.com/eric-65/fairswitch/tree/main/docs', placeholder: false },
];
