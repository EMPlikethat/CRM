import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PayInvoice from './PayInvoice.jsx'

// One public route (/pay/:token, for customers - no login) alongside
// the authenticated app. Not worth a router library for a single path:
// this reads the URL once at load and picks a component.
const isPayRoute = window.location.pathname.startsWith('/pay/')

createRoot(document.getElementById('root')).render(
  <StrictMode>{isPayRoute ? <PayInvoice /> : <App />}</StrictMode>,
)
