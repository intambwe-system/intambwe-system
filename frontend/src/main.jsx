import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { EmployeeAuthProvider } from './contexts/EmployeeAuthContext.jsx'
import { StudentAuthProvider } from './contexts/StudentAuthContext.jsx'
import { SocketProvider } from './contexts/SocketContext.tsx'

// Strip /api suffix to get the base server URL for Socket.io
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace(/\/api\/?$/, '');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SocketProvider serverUrl={SOCKET_URL}>
      <EmployeeAuthProvider>
        <StudentAuthProvider>
          <App />
        </StudentAuthProvider>
      </EmployeeAuthProvider>
    </SocketProvider>
  </StrictMode>,
)
