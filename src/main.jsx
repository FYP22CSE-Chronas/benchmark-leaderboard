import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { UnitProvider } from './lib/units.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UnitProvider>
      <App />
    </UnitProvider>
  </StrictMode>,
);
