import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { CHAIN_ID } from '../config.js';
import { short } from '../lib/format.js';
import './WalletButton.css';

export default function WalletButton({ tone = 'light' }) {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const injected = connectors[0];
  const hasWallet = typeof window !== 'undefined' && !!window.ethereum;

  if (!isConnected) {
    return (
      <div className={`wallet wallet--${tone}`}>
        <button className="wallet__btn" disabled={isPending} onClick={() => connect({ connector: injected, chainId: CHAIN_ID })}>
          {isPending ? 'Connecting…' : 'Connect wallet'}
        </button>
        {!hasWallet && <p className="wallet__hint">Install OKX Wallet or MetaMask to connect.</p>}
        {error && <p className="wallet__hint" role="alert">{error.shortMessage || error.message}</p>}
      </div>
    );
  }
  if (chainId !== CHAIN_ID) {
    return (
      <div className={`wallet wallet--${tone}`}>
        <button className="wallet__btn wallet__btn--warn" onClick={() => switchChain({ chainId: CHAIN_ID })}>Switch to X Layer</button>
      </div>
    );
  }
  return (
    <div className={`wallet wallet--${tone}`}>
      <span className="wallet__addr"><span className="live-dot" aria-hidden="true" /> {short(address)}</span>
      <button className="wallet__btn wallet__btn--ghost" onClick={() => disconnect()}>Disconnect</button>
    </div>
  );
}
