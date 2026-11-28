// Prepare (NEVER broadcast) the mainnet transactions that put the lockout circuit on X Layer.
// Prints each step's target, value and calldata, with fees read live from chain.
// The same flow is rehearsed end-to-end on a mainnet fork by contracts/test/ForkTapeout.t.sol
// (path A) and ForkPathB.t.sol (path B). No private key is read or needed.
//
//   NODE_USE_ENV_PROXY=1 node circuit/scripts/plan-tapeout.js                     # path A: own processor
//   NODE_USE_ENV_PROXY=1 node circuit/scripts/plan-tapeout.js --processor 0x...  # path B: existing processor
import { readFileSync } from 'node:fs';
import { encodeFunctionData, formatEther, formatUnits, maxUint256 } from 'viem';
import { client, FACTORY, BEM, erc20Abi, factoryAbi, processorAbi, transistorAbi } from './xlayer.js';

const art = JSON.parse(readFileSync(new URL('../build/lockout.json', import.meta.url)));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const processor = arg('--processor');
const MINT_PRICE = 1_000_000n; // our processor's transistor price in BEM base units (factory max 1e12)

const c = client();
const read = (address, abi, functionName, args = []) => c.readContract({ address, abi, functionName, args });
try { await c.getChainId(); } catch (e) {
  console.error(`X Layer RPC unreachable (${e.shortMessage || e.message}). Node needs NODE_USE_ENV_PROXY=1 behind a proxy.`);
  process.exit(2);
}

console.log('FairSwitch lockout — tape-out plan (NOTHING IS SENT)');
console.log(`netlist ${art.bytes} bytes, ${art.gateCount} NAND, nIn=${art.nIn}, nOut=${art.nOut}`);
console.log(`netlistHash (pin this): ${art.netlistHash}\n`);

const steps = [];
const okb = (v) => `${formatEther(v)} OKB`;
const bem = (v) => `${formatUnits(v, 8)} BEM`;
let totalOkb = 0n;
let totalBem = 0n;

if (!processor) {
  const deployFee = await read(FACTORY, factoryAbi, 'deployFee');
  const protoFee = await read(FACTORY, factoryAbi, 'protocolFee');
  steps.push({ t: `A1. Approve ${bem(deployFee)} to the factory`, to: BEM, value: 0n,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [FACTORY, deployFee] }) });
  steps.push({ t: 'A2. factory.createCPU (non-payable; pulls deployFee in BEM)', to: FACTORY, value: 0n,
    data: encodeFunctionData({ abi: factoryAbi, functionName: 'createCPU', args: ['FairSwitch', 'FSW',
      'Pay-as-you-go machines that run a public lockout rule you can check offline. Once paid off, they never relock.', 10000n, MINT_PRICE] }),
    n: 'Read CPUCreated / return values: (transistors, circuits). `circuits` is the processor; check factory.isCPU(circuits).' });
  const mintCost = BigInt(art.gateCount) * MINT_PRICE + protoFee;
  steps.push({ t: `A3. Approve ${bem(mintCost)} to <transistors>`, to: BEM, value: 0n,
    data: '(approve(<transistors>, ' + mintCost + ') — address known after A2)' });
  steps.push({ t: `A4. transistors.mint(0, ${art.gateCount}) (paid in BEM)`, to: '<transistors>', value: 0n,
    data: encodeFunctionData({ abi: transistorAbi, functionName: 'mint', args: [0n, BigInt(art.gateCount)] }),
    n: `On the fork this cost ${art.gateCount} × mintPrice + protocolFee (${bem(mintCost)}); the mintPrice part goes to the processor owner (us).` });
  totalBem += deployFee + mintCost;
} else {
  const trans = await read(processor, processorAbi, 'transistors');
  const mintPrice = await read(trans, transistorAbi, 'mintPrice');
  const protoFee = await read(trans, transistorAbi, 'protocolFee');
  const value = BigInt(art.gateCount) * mintPrice + protoFee;
  steps.push({ t: `B1. transistors.mint(0, ${art.gateCount}) — payable in OKB on this processor`, to: trans, value,
    data: encodeFunctionData({ abi: transistorAbi, functionName: 'mint', args: [0n, BigInt(art.gateCount)] }) });
  totalOkb += value;
}

const target = processor || '<circuits from A2>';
const fee = await read(processor || '0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355', processorAbi, 'TAPEOUT_FEE');
steps.push({ t: `${processor ? 'B2' : 'A5'}. processor.tapeout(netlist, ${art.nIn}, ${art.nOut})`, to: target, value: fee,
  data: encodeFunctionData({ abi: processorAbi, functionName: 'tapeout', args: [art.netlist, art.nIn, art.nOut] }),
  n: 'msg.value must EQUAL TAPEOUT_FEE. Then: id = nextId()-1; check keccak256(netlist(id)) == netlistHash; run verify-live.js <processor>:<id>.' });
totalOkb += fee;

for (const s of steps) {
  console.log(`── ${s.t}\n   to:    ${s.to}\n   value: ${okb(s.value)}\n   data:  ${s.data}`);
  if (s.n) console.log(`   note:  ${s.n}`);
  console.log('');
}
console.log(`Total: ${okb(totalOkb)}${totalBem ? ` + ${bem(totalBem)}` : ''} (+ gas)`);
console.log('Nothing was broadcast.');
