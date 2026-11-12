import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { captureKeyFromUrl } from './lib/api'

// קישור פרטי (#k=...) נקלט לפני שהאפליקציה עולה
captureKeyFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
