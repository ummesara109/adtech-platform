import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AdvertiserProvider } from './context/AdvertiserContext'
import { AdvertiserWorkspaceProvider } from './context/AdvertiserWorkspaceContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdvertiserProvider>
        <AdvertiserWorkspaceProvider>
          <App />
        </AdvertiserWorkspaceProvider>
      </AdvertiserProvider>
    </BrowserRouter>
  </StrictMode>,
)
