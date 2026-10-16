import apiClient from './apiClient'
import type { CheckoutOptions, OrderResponse } from '@/types'

export type CheckoutRequest = {
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone?: string
  fulfillmentMethodId: string
  pickupBranchId?: string
  paymentMethodId: string
}

export const checkoutApi = {
  options: () => apiClient.get<CheckoutOptions>('/checkout/options'),
  checkout: (request: CheckoutRequest) => apiClient.post<OrderResponse>('/checkout', request),
}

export const ordersApi = {
  get: (orderNumber: string) => apiClient.get<OrderResponse>(`/orders/${orderNumber}`),
  mine: () => apiClient.get<OrderResponse[]>('/orders/me'),
}
