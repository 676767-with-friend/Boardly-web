// src/layouts/ManagerLayout.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ManagerLayout from '../layouts/ManagerLayout'
import { useAuth } from '@/auth/AuthProvider'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/navigation/ManagerSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="manager-sidebar">
      Manager Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

describe('ManagerLayout Test Suite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders manager sidebar and handles logout flow[cite: 3]', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({ logout: mockLogout, user: { roles: ['manager'] } } as any)

    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route element={<ManagerLayout />}>
            <Route path="/manager" element={<div>Manager Content</div>} />
          </Route>
          <Route path="/" element={<div>Home Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('manager-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Manager Content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(screen.getByText('Home Landing Page')).toBeInTheDocument()
    })
  })
})