import apiClient from './apiClient'
import type { Product, ProductCategory, ProductPage } from '@/types'

type ProductQuery = {
  search?: string
  category?: string | null
  difficulty?: string | null
  maxPrice?: number
  sort?: string
  page?: number
  size?: number
}

function queryString(query: ProductQuery) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

export const productsApi = {
  categories: () => apiClient.get<ProductCategory[]>('/product-categories'),
  list: (query: ProductQuery = {}) => apiClient.get<ProductPage>(`/products${queryString(query)}`),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
}
