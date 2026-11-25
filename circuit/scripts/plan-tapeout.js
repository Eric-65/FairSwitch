// Prepare (NEVER broadcast) the mainnet transactions to put the lockout circuit on X Layer.
// Prints, for each step: target, value, calldata, and a cost estimate. Reads fees from
// chain when an RPC is reachable; otherwise prints the figures other builders measured,
// labelled as unverified. No private key is read or needed.
//
//   node circuit/scripts/plan-tapeout.js                          # path A: create our own processor
//   node circuit/scripts/plan-tapeout.js --processor 0xABC...     # path B: tape out on an existing processor
//   options: --from 0xYourAddress (enables eth_call simulation / gas estimates)
import { readFileSync } from 'node:fs';
import { encodeFunctionData, formatEther, parseEther } from 'viem';
import { client, FACTORY, factoryAbi, processorAbi, transistorAbi } from './xlayer.js';

const art = JSON.parse(readFileSync(new URL('../build/lockout.json', import.meta.url)));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const processor = arg('--processor');
const from = arg('--from');

// Third-party measurements (xm1319/tapemkt, 2026-10). Used only if the chain can't be read.
const MEASURED = { deployFee: parseEther('0.0066'), tapeoutFee: parseEther('0.0013'), mintPrice: parseEther('0.0001'), protocolFee: parseEther('0.00066') };

const c = client();
let online = true;
try { await c.getChainId(); } catch { online = false; }
const tryRead = async (address, abi, functionName, args = []) => {
  if (!online || !address) return undefined;
  try { return await c.readContract({ address, abi, functionName, args }); } catch { return undefined; }
};
const fee = (v, k) => (v === undefined ? { v: MEASURED[k], src: 'measured by others, UNVERIFIED' } : { v, src: 'read from chain' });

console.log('FairSwitch lockout — tape-out plan (nothing is sent)');
console.log(`RPC reachable: ${online}`);
console.log(`netlist: ${art.bytes} bytes, ${art.gateCount} NAND, nIn=${art.nIn}, nOut=${art.nOut}`);
console.log(`netlistHash (pin this): ${art.netlistHash}\n`);

const steps = [];
let total = 0n;

if (!processor) {
  const deployFee = fee(await tryRead(FACTORY, factoryAbi, 'deployFee'), 'deployFee');
  const params = ['FairSwitch', 'FSW', 'Pay-as-you-go machines that run a public lockout rule you can check offline. Once paid off, they never relock.', 10000n, MEASURED.mintPrice];
  steps.push({
    title: 'A1. Create our processor (factory.createCPU)',
    to: FACTORY, value: deployFee,
    data: encodeFunctionData({ abi: factoryAbi, functionName: 'createCPU', args: params }),
    notes: ['Args: name, symbol, story, transistorSupply=10000 (reported minimum on X Layer), mintPrice=0.0001 OKB. TODO: verify ABI.',
      'After it mines: read the CPUCreated event, then confirm factory.isCPU(<circuits address>) == true before the next steps.'],
  });
  total += deployFee.v;
}

const proc = processor || '<PROCESSOR from step A1>';
const trans = processor ? await tryRead(processor, processorAbi, 'transistors') : undefined;
const mintPrice = fee(trans ? await tryRead(trans, transistorAbi, 'mintPrice') : undefined, 'mintPrice');
const protoFee = fee(trans ? await tryRead(trans, transistorAbi, 'protocolFee') : undefined, 'protocolFee');
const mintValue = BigInt(art.gateCount) * mintPrice.v + protoFee.v;
steps.push({
  title: `${processor ? 'B1' : 'A2'}. Mint ${art.gateCount} NAND transistors (transistors.mint(0, ${art.gateCount}))`,
  to: trans || '<processor.transistors()>', value: { v: mintValue, src: `${art.gateCount} × mintPrice (${mintPrice.src}) + protocolFee (${protoFee.src})` },
  data: encodeFunctionData({ abi: transistorAbi, functionName: 'mint', args: [0n, BigInt(art.gateCount)] }),
  notes: ['Token id 0 = NAND (reported by xm1319/tapemkt). TODO: verify. tapeout burns exactly gateCount NAND (TAP-02 §6).'],
});
total += mintValue;

const tapeFee = fee(processor ? await tryRead(processor, processorAbi, 'TAPEOUT_FEE') : undefined, 'tapeoutFee');
const tapeData = encodeFunctionData({ abi: processorAbi, functionName: 'tapeout', args: [art.netlist, art.nIn, art.nOut] });
steps.push({
  title: `${processor ? 'B2' : 'A3'}. Tape out (processor.tapeout(netlist, ${art.nIn}, ${art.nOut}))`,
  to: proc, value: tapeFee, data: tapeData,
  notes: ['msg.value must EQUAL TAPEOUT_FEE exactly (TAP-02 §6).',
    'Afterwards: nextId()-1 is the circuit id; confirm keccak256(netlist(id)) == netlistHash above, then run verify-live.js <processor>:<id>.'],
});
total += tapeFee.v;

if (processor && from && online) {
  try {
    await c.call({ account: from, to: processor, data: tapeData, value: tapeFee.v });
    console.log('Simulated tapeout: would succeed (you already hold the transistors).\n');
  } catch (e) {
    console.log(`Simulated tapeout reverts (expected if you have no transistors yet): ${e.shortMessage || e.message}\n`);
  }
}

for (const s of steps) {
  console.log(`── ${s.title}`);
  console.log(`   to:    ${s.to}`);
  console.log(`   value: ${formatEther(s.value.v)} OKB  (${s.value.src})`);
  console.log(`   data:  ${s.data}`);
  for (const n of s.notes) console.log(`   note:  ${n}`);
  console.log('');
}
console.log(`Total OKB (excl. gas, ~0.02 gwei on X Layer): ${formatEther(total)} OKB`);
console.log('Nothing was broadcast. Review, then send from your own wallet.');
