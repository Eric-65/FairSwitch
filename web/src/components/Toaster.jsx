import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { oklinkTx } from '../config.js';
import Ring from './Ring.jsx';
import './Toaster.css';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

let seq = 0;
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((t) => {
    const id = ++seq;
    setItems((xs) => [...xs.filter((x) => x.key !== t.key || !t.key), { id, ...t }]);
    if (t.tone !== 'pending') setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.ttl || 6000);
    return id;
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`toast toast--${t.tone || 'info'}`}
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {t.tone === 'pending' ? <span className="toast__spin" aria-hidden="true" /> : <Ring size={0.9} />}
              <div>
                <p className="toast__title">{t.title}</p>
                {t.body && <p className="toast__body">{t.body}</p>}
                {t.hash && <a className="toast__link" href={oklinkTx(t.hash)} target="_blank" rel="noreferrer">view on OKLink</a>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
