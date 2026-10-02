import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './shared/context/ThemeContext';
import { ScrollProvider } from './shared/context/ScrollContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ScrollProvider>
          <App />
        </ScrollProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
