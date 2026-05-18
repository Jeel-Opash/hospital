import React from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './context/AuthContext.jsx'

const App = () => {
  return (
    <BrowserRouter>
    <AuthProvider>
      <Toaster/>
      <AppRoutes/>
    </AuthProvider>
    </BrowserRouter>
  )
}

export default App
