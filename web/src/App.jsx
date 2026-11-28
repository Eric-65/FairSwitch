import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './lib/wagmi.js';
import { ToastProvider } from './components/Toaster.jsx';
import Landing from './pages/Landing.jsx';

// Landing is eager (LCP); every other route is code-split.
const VirtualDevice = lazy(() => import('./pages/VirtualDevice.jsx'));
const DeviceStatus = lazy(() => import('./pages/DeviceStatus.jsx'));
const Operator = lazy(() => import('./pages/Operator.jsx'));
const CircuitPage = lazy(() => import('./pages/CircuitPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Loading() {
  return (
    <div className="route-loading" role="status">
      <span className="route-loading__ring" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <a className="skip-link" href="#main">Skip to content</a>
          <ScrollToTop />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/device/:deviceId" element={<VirtualDevice />} />
              <Route path="/d/:deviceId" element={<DeviceStatus />} />
              <Route path="/operator" element={<Operator />} />
              <Route path="/circuit" element={<CircuitPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
