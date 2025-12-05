import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { EmployeeAuthProvider } from './contexts/EmployeeAuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EmployeeAuthProvider>
    <App />
    </EmployeeAuthProvider>
  </StrictMode>,
)
