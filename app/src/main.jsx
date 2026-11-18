import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('A new NurseLog version is available. Update now?')) {
      updateSW(true);
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
