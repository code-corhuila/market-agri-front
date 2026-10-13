import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startMocks } from './mocks/browser';
import { MOCKED_DOMAINS } from './mocks/config';
import './styles/tokens.css';
import './styles/base.css';
import './styles/utils.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

// The simulated domains answer before the first request of the application (HU-PLAT-009). If
// the worker cannot start (no service worker support, a blocked scope), the application still
// renders: its requests go to the gateway and each view shows its own error.
try {
  await startMocks(MOCKED_DOMAINS);
} catch (error) {
  console.error('The simulated mode could not start; requests go to the gateway', error);
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
