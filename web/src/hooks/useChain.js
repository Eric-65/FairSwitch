import { useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { ADDR, CHAIN_ID } from '../config.js';
import { registryAbi, processorAbi } from '../lib/abi.js';
import { hashOf, loadCircuit, PINNED_HASH, artifact } from '../lib/circuit.js';
import { evalPacked, pack, bytesToHex, hexToBytes } from '@fairswitch/evaluator';

export const registryLive = !!ADDR.registry;
export const circuitLive = ADDR.circuitId != null;

export function useRegistryStats() {
  return useReadContracts({
    contracts: [
      { address: ADDR.registry, abi: registryAbi, functionName: 'deviceCount', chainId: CHAIN_ID },
      { address: ADDR.registry, abi: registryAbi, functionName: 'totalVolume', chainId: CHAIN_ID },
    ],
    query: { enabled: registryLive, refetchInterval: 30_000 },
  });
}

export function useRegistryDevice(deviceId) {
  const enabled = registryLive && !!deviceId;
  const base = { address: ADDR.registry, abi: registryAbi, chainId: CHAIN_ID, args: [deviceId] };
  const device = useReadContract({ ...base, functionName: 'getDevice', query: { enabled, refetchInterval: 20_000 } });
  const status = useReadContract({ ...base, functionName: 'status', query: { enabled: enabled && device.isSuccess, refetchInterval: 20_000 } });
  const bits = useReadContract({ ...base, functionName: 'inputBits', query: { enabled: enabled && device.isSuccess, refetchInterval: 20_000 } });
  return { device, status, bits };
}

/**
 * "Verify the rule": fetch the netlist (from X Layer when the circuit is taped out, else the local
 * build), hash it, evaluate locally, and compare with the processor's eval() for the same inputs.
 * Returns a step log the UI animates.
 */
export function useVerify() {
  const client = usePublicClient({ chainId: CHAIN_ID });
  return async (bits, onStep) => {
    const steps = [];
    const step = (s) => { steps.push(s); onStep?.([...steps]); };
    let netlistHex = artifact.netlist;
    if (circuitLive) {
      step({ k: 'fetch', ok: null, text: `Reading netlist(${ADDR.circuitId}) from X Layer…` });
      netlistHex = await client.readContract({ address: ADDR.processor, abi: processorAbi, functionName: 'netlist', args: [ADDR.circuitId] });
      steps.pop();
      step({ k: 'fetch', ok: true, text: `Fetched ${(netlistHex.length - 2) / 2} bytes from processor ${ADDR.processor.slice(0, 8)}…` });
    } else {
      step({ k: 'fetch', ok: true, demo: true, text: 'Loaded the local build (circuit not taped out yet — demo).' });
    }
    const h = hashOf(netlistHex);
    step({ k: 'hash', ok: h === PINNED_HASH, text: `keccak256 = ${h.slice(0, 12)}…${h.slice(-6)} ${h === PINNED_HASH ? 'matches the pinned hash' : 'DOES NOT match the pinned hash'}` });
    const local = bytesToHex(evalPacked(loadCircuit(netlistHex), pack(bits)));
    step({ k: 'local', ok: true, text: `Evaluated ${artifact.gateCount} gates locally → outputs ${local}` });
    if (circuitLive) {
      const chain = await client.readContract({ address: ADDR.processor, abi: processorAbi, functionName: 'eval', args: [ADDR.circuitId, bytesToHex(pack(bits))] });
      step({ k: 'chain', ok: chain.toLowerCase() === local, text: `On-chain eval() → ${chain} ${chain.toLowerCase() === local ? '— match' : '— MISMATCH'}` });
    } else {
      step({ k: 'chain', ok: null, demo: true, text: 'On-chain eval() comparison runs once the circuit is taped out.' });
    }
    return steps.every((s) => s.ok !== false);
  };
}

export { hexToBytes };
