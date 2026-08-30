import { AppRouter } from './app/router'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './commerce/CartProvider'

export default function App() {
  return <AuthProvider><CartProvider><AppRouter /></CartProvider></AuthProvider>
}
