
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { CartProvider, useCart } from './CartProvider'
import { cartApi } from '@/services/cartApi'
import { useAuth } from '@/auth/AuthProvider'
import type { CartResponse } from '@/types'

vi.mock('@/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/services/cartApi', () => ({
  cartApi: {
    get: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}))

const emptyCart: CartResponse = {
  id: 'cart-1',
  items: [],
  itemCount: 0,
  subtotal: 0,
  currency: 'THB',
}

const populatedCart: CartResponse = {
  id: 'cart-1',
  currency: 'THB',
  itemCount: 3,
  subtotal: 350,
  items: [
    {
      id: 'line-1',
      productId: 'p-1',
      name: 'Game A',
      sku: 'A',
      image: null,
      unitPrice: 100,
      quantity: 2,
      lineTotal: 200,
    },
    {
      id: 'line-2',
      productId: 'p-2',
      name: 'Game B',
      sku: 'B',
      image: null,
      unitPrice: 150,
      quantity: 1,
      lineTotal: 150,
    },
  ],
}

function Harness() {
  const cart = useCart()

  return (
    <div>
      <output data-testid="loading">
        {cart.loading ? 'loading' : 'ready'}
      </output>

      <output data-testid="count">{cart.cart.itemCount}</output>
      <output data-testid="subtotal">{cart.cart.subtotal}</output>

      <output data-testid="items">
        {cart.cart.items
          .map(item => `${item.id}:${item.quantity}`)
          .join(',')}
      </output>

      <output data-testid="error">{cart.error ?? ''}</output>

      <button
        onClick={() => {
          void cart.addItem('p-1', 2).catch(() => undefined)
        }}
      >
        add
      </button>

      <button
        onClick={() => {
          void cart.updateItem('line-1', 3).catch(() => undefined)
        }}
      >
        update
      </button>

      <button
        onClick={() => {
          void cart.removeItem('line-1').catch(() => undefined)
        }}
      >
        remove
      </button>

      <button
        onClick={() => {
          void cart.clear().catch(() => undefined)
        }}
      >
        clear
      </button>
    </div>
  )
}

async function waitForCartReady() {
  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('ready')
  })
}

beforeEach(() => {
  vi.resetAllMocks()

  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: { id: 'u-1' },
  } as never)

  vi.mocked(cartApi.get).mockResolvedValue(emptyCart)

  vi.mocked(cartApi.addItem).mockResolvedValue(populatedCart)

  vi.mocked(cartApi.updateItem).mockResolvedValue({
    ...populatedCart,
    itemCount: 4,
    subtotal: 450,
    items: [
      {
        ...populatedCart.items[0],
        quantity: 3,
        lineTotal: 300,
      },
      populatedCart.items[1],
    ],
  })

  vi.mocked(cartApi.removeItem).mockResolvedValue(undefined)
  vi.mocked(cartApi.clear).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe('CartProvider', () => {
  it('adds an item and calculates the correct count and subtotal', async () => {
    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    )

    await waitForCartReady()

    await act(async () => {
      screen.getByRole('button', { name: 'add' }).click()
    })

    expect(cartApi.addItem).toHaveBeenCalledWith('p-1', 2)

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('3')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('350')
    })
  })

  it('updates quantity and recalculates totals', async () => {
    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    )

    await waitForCartReady()

    await act(async () => {
      screen.getByRole('button', { name: 'update' }).click()
    })

    expect(cartApi.updateItem).toHaveBeenCalledWith('line-1', 3)

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('4')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('450')
    })
  })

  it('removes an item and reloads the cart', async () => {
    vi.mocked(cartApi.get)
      .mockResolvedValueOnce(populatedCart)
      .mockResolvedValueOnce({
        ...emptyCart,
        items: [populatedCart.items[1]],
        itemCount: 1,
        subtotal: 150,
      })

    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('3')
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await act(async () => {
      screen.getByRole('button', { name: 'remove' }).click()
    })

    expect(cartApi.removeItem).toHaveBeenCalledWith('line-1')

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('150')
      expect(screen.getByTestId('items')).toHaveTextContent('line-2:1')
    })
  })

  it('clears the cart and displays empty totals', async () => {
    vi.mocked(cartApi.get)
      .mockResolvedValueOnce(populatedCart)
      .mockResolvedValueOnce(emptyCart)

    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('3')
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await act(async () => {
      screen.getByRole('button', { name: 'clear' }).click()
    })

    expect(cartApi.clear).toHaveBeenCalledOnce()

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0')
      expect(screen.getByTestId('subtotal')).toHaveTextContent('0')
    })
  })

  it.each([0, -1, -5])(
    'rejects an invalid quantity (%s) without calling the API',
    async quantity => {
      function InvalidHarness() {
        const cart = useCart()

        return (
          <>
            <output data-testid="loading">
              {cart.loading ? 'loading' : 'ready'}
            </output>

            <output data-testid="error">
              {cart.error ?? ''}
            </output>

            <button
              onClick={() => {
                void cart.addItem('p-1', quantity).catch(() => undefined)
              }}
            >
              invalid
            </button>
          </>
        )
      }

      render(
        <CartProvider>
          <InvalidHarness />
        </CartProvider>,
      )

      await waitForCartReady()

      await act(async () => {
        screen.getByRole('button', { name: 'invalid' }).click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Quantity must be a positive integer.',
        )
      })

      expect(cartApi.addItem).not.toHaveBeenCalled()
    },
  )

  it('displays an out-of-stock error from the API', async () => {
    vi.mocked(cartApi.addItem).mockRejectedValueOnce(
      new Error('Quantity exceeds available stock'),
    )

    render(
      <CartProvider>
        <Harness />
      </CartProvider>,
    )

    await waitForCartReady()

    await act(async () => {
      screen.getByRole('button', { name: 'add' }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Quantity exceeds available stock',
      )
    })
  })
})
