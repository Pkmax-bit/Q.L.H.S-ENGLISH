import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeProvider'
import { ToastProvider } from './context/ToastContext'
import { SocketProvider } from './context/SocketContext'
import { MessengerProvider } from './context/MessengerContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <SocketProvider>
                <MessengerProvider>
                  <AppRouter />
                </MessengerProvider>
              </SocketProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
