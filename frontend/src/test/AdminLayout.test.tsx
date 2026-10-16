// src/layouts/AdminLayout.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLayout from '../layouts/AdminLayout'
import { useAuth } from '@/auth/AuthProvider'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/navigation/AdminSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="admin-sidebar">
      Admin Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

describe('AdminLayout Test Suite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders admin sidebar and handles logout flow[cite: 5]', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({ logout: mockLogout, user: { roles: ['admin'] } } as any)

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/" element={<div>Home Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Admin Content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(screen.getByText('Home Landing Page')).toBeInTheDocument()
    })
  })
})