import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { cartApi } from '@/services/cartApi'
import type { CartResponse } from '@/types'

type CartContextValue = {
  cart: CartResponse
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clear: () => Promise<void>
}

const emptyCart: CartResponse = { id: null, items: [], itemCount: 0, subtotal: 0, currency: 'THB' }
const CartContext = createContext<CartContextValue | undefined>(undefined)

function messageFor(error: unknown) {
  return typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Unable to update your cart.'
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const [cart, setCart] = useState<CartResponse>(emptyCart)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      setCart(await cartApi.get())
      setError(null)
    } catch (nextError) {
      setError(messageFor(nextError))
      setCart(emptyCart)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'loading') void reload()
  }, [status, user?.id])

  const update = async (work: () => Promise<CartResponse | void>) => {
    try {
      const response = await work()
      if (response) setCart(response)
      else await reload()
      setError(null)
    } catch (nextError) {
      const message = messageFor(nextError)
      setError(message)
      throw new Error(message)
    }
  }

  const value = useMemo<CartContextValue>(() => ({
    cart,
    loading,
    error,
    reload,
    addItem: (productId, quantity = 1) => update(() => cartApi.addItem(productId, quantity)),
    updateItem: (itemId, quantity) => update(() => cartApi.updateItem(itemId, quantity)),
    removeItem: itemId => update(async () => { await cartApi.removeItem(itemId) }),
    clear: () => update(async () => { await cartApi.clear() }),
  }), [cart, loading, error, status, user?.id])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside CartProvider')
  return value
}
