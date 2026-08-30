import apiClient from './apiClient'
import type { CartResponse } from '@/types'

const GUEST_SESSION_KEY = 'boardly.guest-cart-session'

function guestSessionKey() {
  let key = localStorage.getItem(GUEST_SESSION_KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(GUEST_SESSION_KEY, key)
  }
  return key
}

function options(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  return { method, body, headers: { 'X-Guest-Session-Key': guestSessionKey() } }
}

export const cartApi = {
  get: () => apiClient.request<CartResponse>('/cart', options('GET')),
  addItem: (productId: string, quantity: number) => apiClient.request<CartResponse>('/cart/items', options('POST', { productId, quantity })),
  updateItem: (itemId: string, quantity: number) => apiClient.request<CartResponse>(`/cart/items/${itemId}`, options('PATCH', { quantity })),
  removeItem: (itemId: string) => apiClient.request<void>(`/cart/items/${itemId}`, options('DELETE')),
  clear: () => apiClient.request<void>('/cart', options('DELETE')),
}
