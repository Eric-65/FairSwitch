import { createConfig, http, fallback } from 'wagmi';
import { injected } from '@wagmi/core';
import { defineChain } from 'viem';

export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech', 'https://xlayerrpc.okx.com'] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/x-layer' } },
});

export const wagmiConfig = createConfig({
  chains: [xLayer],
  connectors: [injected()], // OKX Wallet, MetaMask and other injected wallets
  transports: {
    [xLayer.id]: fallback([http('https://rpc.xlayer.tech'), http('https://xlayerrpc.okx.com')]),
  },
});
