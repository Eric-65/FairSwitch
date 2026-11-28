import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import Header from '../components/Header.jsx';
import WalletButton from '../components/WalletButton.jsx';
import Ring from '../components/Ring.jsx';
import TextLink from '../components/TextLink.jsx';
import Footer from '../components/Footer.jsx';
import { PixelChevron } from '../components/Pixel.jsx';
import { useToast } from '../components/Toaster.jsx';
import { registryLive, circuitLive } from '../hooks/useChain.js';
import { ADDR, CHAIN_ID, oklinkTx } from '../config.js';
import { registryAbi } from '../lib/abi.js';
import { PINNED_HASH } from '../lib/circuit.js';
import { toDeviceId } from '../lib/device.js';
import { toUsdtUnits, usdt, short } from '../lib/format.js';
import './Operator.css';

const FROM_BLOCK = import.meta.env.VITE_REGISTRY_BLOCK ? BigInt(import.meta.env.VITE_REGISTRY_BLOCK) : 0n;
const evRegistered = parseAbiItem('event DeviceRegistered(bytes32 indexed deviceId, address indexed operator, uint256 price, uint256 dailyRate, uint32 graceDays, address processor, uint256 circuitId, bytes32 netlistHash)');
const evPaid = parseAbiItem('event Paid(bytes32 indexed deviceId, address indexed payer, uint256 amount, uint256 totalPaid, uint64 paidUntil, bool owned)');

export default function Operator() {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', price: '120', rate: '1', grace: '3' });
  const [devices, setDevices] = useState(null);
  const [payments, setPayments] = useState(null);
  const ready = registryLive && circuitLive;
  const connected = address && chainId === CHAIN_ID;

  async function load() {
    if (!registryLive || !address) return;
    try {
      const regs = await client.getLogs({ address: ADDR.registry, event: evRegistered, args: { operator: address }, fromBlock: FROM_BLOCK });
      setDevices(regs.map((l) => ({ ...l.args, name: null })));
      const ids = regs.map((l) => l.args.deviceId);
      const pays = ids.length ? await client.getLogs({ address: ADDR.registry, event: evPaid, args: { deviceId: ids }, fromBlock: FROM_BLOCK }) : [];
      setPayments(pays.reverse().map((l) => ({ ...l.args, tx: l.transactionHash })));
    } catch (e) {
      toast({ tone: 'error', title: 'Could not read history', body: e.shortMessage || e.message });
      setDevices([]); setPayments([]);
    }
  }
  useEffect(() => { load(); }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  async function register(e) {
    e.preventDefault();
    try {
      const price = toUsdtUnits(form.price); const rate = toUsdtUnits(form.rate); const grace = Number(form.grace);
      if (!form.name.trim()) throw new Error('Give the device an id, e.g. solar-kit-0001');
      if (rate <= 0n || price < rate) throw new Error('Daily rate must be above 0 and not more than the price');
      if (!Number.isInteger(grace) || grace < 0 || grace > 365) throw new Error('Grace days must be 0–365');
      const id = toDeviceId(form.name.trim());
      toast({ key: 'reg', tone: 'pending', title: 'Confirm registration in your wallet…' });
      const h = await writeContractAsync({ chainId: CHAIN_ID, address: ADDR.registry, abi: registryAbi, functionName: 'registerDevice',
        args: [id, price, rate, grace, ADDR.processor, ADDR.circuitId, PINNED_HASH] });
      toast({ key: 'reg', tone: 'pending', title: 'Registering…', hash: h });
      await client.waitForTransactionReceipt({ hash: h });
      toast({ key: 'reg', title: 'Device registered', body: `Share /d/${form.name.trim()} with the customer.`, hash: h });
      load();
    } catch (err) {
      toast({ key: 'reg', tone: 'error', title: 'Not registered', body: err.shortMessage || err.message });
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <Header />
      <main id="main" className="op">
        <section className="op__head on-orange">
          <div className="wrap">
            <p className="op__kicker">operators</p>
            <h1 className="op__title">Operator Dashboard</h1>
            <p className="op__sub">Register devices, set fair rules, get paid in USDT.</p>
            <WalletButton tone="dark" />
          </div>
        </section>

        <div className="wrap op__body">
          {!ready && (
            <p className="banner op__banner"><Ring /> <span>
              {!circuitLive ? 'The lockout circuit is not taped out yet' : 'The registry is not deployed yet'} — registration opens once it is.
              Meanwhile, try the <TextLink to="/device/demo">virtual device</TextLink>.
            </span></p>
          )}

          <section className="op__section" aria-labelledby="reg-title">
            <h2 id="reg-title" className="op__h2"><Ring /> Register a device</h2>
            <form className="op__form" onSubmit={register}>
              <div className="field"><label htmlFor="f-name">Device id</label>
                <input id="f-name" placeholder="solar-kit-0001" value={form.name} onChange={set('name')} autoComplete="off" />
                <small>Printed on the machine. Stored on-chain as keccak256(id).</small></div>
              <div className="field"><label htmlFor="f-price">Full price (USDT)</label>
                <input id="f-price" inputMode="decimal" value={form.price} onChange={set('price')} /></div>
              <div className="field"><label htmlFor="f-rate">Daily rate (USDT)</label>
                <input id="f-rate" inputMode="decimal" value={form.rate} onChange={set('rate')} /></div>
              <div className="field"><label htmlFor="f-grace">Grace days</label>
                <input id="f-grace" inputMode="numeric" value={form.grace} onChange={set('grace')} /></div>
              <p className="op__fixed">These terms are <strong>fixed forever</strong> once registered — there is no edit function. That’s the point.</p>
              <button className="btn btn--signal" type="submit" disabled={!ready || !connected}>
                {!connected ? 'Connect wallet to register' : 'Register device'}
              </button>
            </form>
          </section>

          <section className="op__section" aria-labelledby="dev-title">
            <h2 id="dev-title" className="op__h2"><Ring /> Your devices</h2>
            {!registryLive || !address ? <p className="empty">{!address ? 'Connect your wallet to see your devices.' : 'No registry yet.'}</p>
              : devices === null ? <p className="empty">Loading…</p>
              : devices.length === 0 ? <p className="empty">No devices yet. Register your first one above.</p>
              : (
                <ul role="list" className="op__rows">
                  {devices.map((d) => (
                    <li key={d.deviceId}>
                      <Link className="op__row" to={`/d/${d.deviceId}`}>
                        <span className="op__row-main"><span className="mono">{short(d.deviceId)}</span>
                          <span className="op__row-terms">{usdt(d.price, 0)} USDT · {usdt(d.dailyRate)}/day · {d.graceDays}d grace</span></span>
                        <PixelChevron />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </section>

          <section className="op__section" aria-labelledby="pay-title">
            <h2 id="pay-title" className="op__h2"><Ring /> Payments</h2>
            {!payments || payments.length === 0 ? <p className="empty">No payments yet.</p> : (
              <table className="op__table">
                <thead><tr><th scope="col">Device</th><th scope="col">Payer</th><th scope="col">Amount</th><th scope="col">Tx</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.tx + p.deviceId}>
                      <td className="mono">{short(p.deviceId)}</td><td className="mono">{short(p.payer)}</td>
                      <td className="num">{usdt(p.amount)} {p.owned && <span className="tag">owned</span>}</td>
                      <td><a href={oklinkTx(p.tx)} target="_blank" rel="noreferrer" className="mono">{short(p.tx)}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
