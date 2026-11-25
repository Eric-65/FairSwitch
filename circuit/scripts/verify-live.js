// Verify the FairSwitch decoder/evaluator against REAL circuits on X Layer mainnet.
// Read-only (eth_call). For each circuit: netlist() -> keccak -> decode -> local eval
// for every input (or 64 random ones if nIn > 6) -> compare with on-chain eval().
// Writes docs/verification/live-<timestamp>.json.
//
//   node circuit/scripts/verify-live.js                       # default targets
//   node circuit/scripts/verify-live.js 0xProcessor:3 0xP2:1  # custom
import { writeFileSync, mkdirSync } from 'node:fs';
import { load, evalPacked, bytesToHex, hexToBytes, netlistHash, pack } from '@fairswitch/evaluator';
import { client, processorAbi } from './xlayer.js';

// Default targets: circuits other builders report on X Layer (see docs/VERIFICATION.md).
const DEFAULT = [
  '0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355:3', // OrderGuard MAJ3 (xm1319/tapemkt)
  '0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355:4', // OrderGuard half adder
  '0x839bdD6fa7A66416A609A735e11DE5411B98574e:1', // recorded by Tajudeeen/netlist
];

const targets = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT).map((t) => {
  const [address, id] = t.split(':');
  return { address, id: BigInt(id) };
});

const c = client();
let block;
try { block = await c.getBlockNumber(); } catch (e) {
  console.error(`Cannot reach X Layer RPC (${e.shortMessage || e.message}). Set XLAYER_RPC or run where rpc.xlayer.tech is reachable.`);
  process.exit(2);
}
console.log(`X Layer block ${block}`);
const report = { chainId: await c.getChainId(), block: block.toString(), at: new Date().toISOString(), circuits: [] };
let allOk = true;

for (const t of targets) {
  const read = (functionName, args) => c.readContract({ address: t.address, abi: processorAbi, functionName, args, blockNumber: block });
  const entry = { processor: t.address, id: t.id.toString() };
  try {
    const [nIn, nOut, nState, gateCount] = await read('circuitInfo', [t.id]);
    const nl = await read('netlist', [t.id]);
    const circ = load(hexToBytes(nl), nIn, nOut);
    Object.assign(entry, { nIn, nOut, nState, gateCount, netlistHash: netlistHash(nl), bytes: (nl.length - 2) / 2 });
    entry.gateCountMatches = circ.nGates === gateCount && circ.nState === nState;
    if (nState > 0) {
      entry.note = 'has state: eval() reverts by design; skipped';
    } else {
      const space = nIn <= 6 ? Array.from({ length: 1 << nIn }, (_, n) => n) : Array.from({ length: 64 }, () => Math.floor(Math.random() * 2 ** Math.min(nIn, 30)));
      let match = 0;
      const mismatches = [];
      for (const n of space) {
        const bits = Array.from({ length: nIn }, (_, i) => (i < 31 ? (n >> i) & 1 : 0));
        const inBytes = pack(bits);
        const local = bytesToHex(evalPacked(circ, inBytes));
        const chain = await read('eval', [t.id, bytesToHex(inBytes)]);
        if (local === chain.toLowerCase()) match++;
        else mismatches.push({ in: bytesToHex(inBytes), local, chain });
      }
      Object.assign(entry, { tested: space.length, match, mismatches });
      if (match !== space.length) allOk = false;
    }
    if (!entry.gateCountMatches) allOk = false;
    console.log(`${t.address} #${t.id}: nIn=${nIn} nOut=${nOut} gates=${gateCount} hash=${entry.netlistHash} eval ${entry.match ?? '-'}/${entry.tested ?? '-'}`);
  } catch (e) {
    entry.error = e.shortMessage || e.message;
    allOk = false;
    console.log(`${t.address} #${t.id}: ERROR ${entry.error}`);
  }
  report.circuits.push(entry);
}

const dir = new URL('../../docs/verification/', import.meta.url);
mkdirSync(dir, { recursive: true });
const file = new URL(`live-${report.at.replace(/[:.]/g, '-')}.json`, dir);
writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
console.log(`${allOk ? 'ALL MATCH' : 'SEE FAILURES'} — report: ${file.pathname}`);
process.exit(allOk ? 0 : 1);
