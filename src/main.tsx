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

// The simulated domains answer before the first request of the application (HU-PLAT-009).
await startMocks(MOCKED_DOMAINS);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
