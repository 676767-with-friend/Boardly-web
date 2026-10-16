import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from './apiClient'

describe('ApiClient', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    apiClient.setAccessToken(null)
  })

  it('performs GET request successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    const result = await apiClient.get('/test')
    expect(result).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('includes Authorization header when token is set', async () => {
    apiClient.setAccessToken('my-token')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await apiClient.get('/protected')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    )
  })

  it('handles 204 No Content correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    })

    const result = await apiClient.delete('/item/1')
    expect(result).toBeUndefined()
  })

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad Request', code: 'BAD_REQUEST' }),
    })

    await expect(apiClient.get('/error')).rejects.toEqual(
      expect.objectContaining({ message: 'Bad Request' })
    )
  })
})