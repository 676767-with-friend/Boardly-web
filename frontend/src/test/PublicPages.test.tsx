import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PublicHomePage, PublicShopPage, PublicProductPage } from '../features/PublicReadPages'

// Mock API และ Cart Provider
vi.mock('@/services/productsApi', () => ({
  productsApi: {
    categories: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Strategy' }]),
    list: vi.fn().mockResolvedValue({
      content: [
        { id: 'p1', name: 'Catan', category: 'Strategy', price: 1500, rating: 4.8, reviewCount: 10, stock: 5, image: 'test.jpg', players: '3-4', playTime: '90m', age: '10+', difficulty: 'Medium' }
      ]
    }),
    get: vi.fn().mockResolvedValue({
      id: 'p1', name: 'Catan', category: 'Strategy', price: 1500, rating: 4.8, reviewCount: 10, stock: 5, image: 'test.jpg', players: '3-4', playTime: '90m', age: '10+', difficulty: 'Medium', description: 'Great game'
    }),
  },
}))

vi.mock('@/commerce/CartProvider', () => ({
  useCart: () => ({
    addItem: vi.fn().mockResolvedValue(undefined),
    cart: { items: [], itemCount: 0, subtotal: 0 },
  }),
}))

describe('Public Pages Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders PublicHomePage hero and sections correctly', async () => {
    render(
      <MemoryRouter>
        <PublicHomePage />
      </MemoryRouter>
    )

    // ใช้ฟังก์ชัน matcher เพื่อรองรับข้อความที่ถูกคั่นด้วย <br />
    expect(await screen.findByText((content) => content.includes('Find your next'))).toBeInTheDocument()
    expect(screen.getByText('Popular right now')).toBeInTheDocument()
  })

  it('renders PublicShopPage and loads products', async () => {
    render(
      <MemoryRouter>
        <PublicShopPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Board Games')).toBeInTheDocument()
  })

  it('renders PublicProductPage details correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/products/p1']}>
        <Routes>
          <Route path="/products/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    )

    // ใช้ getAllByText และเลือกตัวที่เป็นหัวข้อหลัก (Heading)
    const catanElements = await screen.findAllByText('Catan')
    expect(catanElements.length).toBeGreaterThan(0)
    expect(screen.getByText('Great game')).toBeInTheDocument()
  })
})