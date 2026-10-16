// src/components/ProductCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: '1',
  name: 'Catan',
  category: 'Strategy',
  price: 1500,
  salePrice: 1200,
  rating: 4.8,
  reviewCount: 50,
  players: '3-4',
  playTime: '60-90m',
  stock: 5,
  image: 'catan.jpg',
  isNew: true,
} as Product

describe('ProductCard Component Test Suite', () => {
  it('renders product details and badges correctly[cite: 9]', () => {
    render(<ProductCard product={mockProduct} onView={vi.fn()} onAddToCart={vi.fn()} />)

    expect(screen.getByText('Catan')).toBeInTheDocument()
    expect(screen.getByText('Strategy')).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument() // isNew badge
    expect(screen.getByText('3-4 players')).toBeInTheDocument()
  })

  it('triggers onAddToCart when Add to Cart button is clicked[cite: 9]', async () => {
    const handleAddToCart = vi.fn().mockResolvedValue(undefined)
    render(<ProductCard product={mockProduct} onView={vi.fn()} onAddToCart={handleAddToCart} />)

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(handleAddToCart).toHaveBeenCalledTimes(1)
    })
  })

  it('triggers onView when product image or name is clicked[cite: 9]', () => {
    const handleView = vi.fn()
    render(<ProductCard product={mockProduct} onView={handleView} onAddToCart={vi.fn()} />)

    fireEvent.click(screen.getByText('Catan'))
    expect(handleView).toHaveBeenCalledTimes(1)
  })
})