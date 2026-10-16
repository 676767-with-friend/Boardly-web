// src/layouts/StaffLayout.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StaffLayout from '../layouts/StaffLayout'
import { useAuth } from '@/auth/AuthProvider'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/navigation/StaffSidebar', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="staff-sidebar">
      Staff Sidebar <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

describe('StaffLayout Test Suite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders staff sidebar and handles logout flow[cite: 4]', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({ logout: mockLogout, user: { roles: ['staff'] } } as any)

    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<StaffLayout />}>
            <Route path="/staff" element={<div>Staff Content</div>} />
          </Route>
          <Route path="/" element={<div>Home Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('staff-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Staff Content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(screen.getByText('Home Landing Page')).toBeInTheDocument()
    })
  })
})