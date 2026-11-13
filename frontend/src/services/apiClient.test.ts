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

  it('falls back to a generic error when an error response is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json') },
    })
    await expect(apiClient.get('/offline')).rejects.toMatchObject({
      status: 503,
      code: 'REQUEST_FAILED',
      message: 'The request could not be completed.',
    })
  })

  it('sends every supported write method with its JSON body', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })
    const body = { name: 'Boardly' }
    await apiClient.post('/items', body)
    await apiClient.put('/items/1', body)
    await apiClient.patch('/items/1', body)
    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/items'), expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }))
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/items/1'), expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }))
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/items/1'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }))
  })
})
