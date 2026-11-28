import './styles/layers.css'; // must be first: fixes cascade-layer order
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';
import './components/motifs.css';
import './components/ui.css';

// Preview builds (VITE_ROUTER=memory) run inside a host page where URL paths aren't ours.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </React.StrictMode>,
);
