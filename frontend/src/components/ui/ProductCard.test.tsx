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

  it('toggles the like state and handles cards without a sale price or new badge', async () => {
    const product = { ...mockProduct, salePrice: null, isNew: false }
    const { container } = render(
      <ProductCard product={product} onView={vi.fn()} onAddToCart={vi.fn()} />,
    )
    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.getByText('฿1,500')).toBeInTheDocument()
    const like = container.querySelector('button')!
    fireEvent.click(like)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('fill-red-500')
    fireEvent.click(like)
    expect(container.querySelector('svg')?.getAttribute('class')).not.toContain('fill-red-500')
  })

  it('shows a fallback message for non-Error add failures and prevents adding out-of-stock items', async () => {
    const onAddToCart = vi.fn().mockRejectedValue('offline')
    render(
      <ProductCard
        product={{ ...mockProduct, stock: 0 }}
        onView={vi.fn()}
        onAddToCart={onAddToCart}
      />,
    )
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()
    // Invoke through the callback path with stock available to cover error handling.
    const { unmount } = render(
      <ProductCard
        product={mockProduct}
        onView={vi.fn()}
        onAddToCart={onAddToCart}
      />,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[1])
    expect(await screen.findByText('Unable to add this game to your cart.')).toBeInTheDocument()
    unmount()
  })
})
