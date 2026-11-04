import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { preloadPage } from './lib/lazyPage'
import './index.css' // <-- É essa linha que puxa todo o Tailwind

// A prerendered page stays on screen while its code loads; React then swaps
// it for the same page in one step, without a loading screen in between.
void preloadPage(window.location.pathname)
  .catch(() => {})
  .then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
