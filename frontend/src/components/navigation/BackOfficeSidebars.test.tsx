// src/components/navigation/BackOfficeSidebars.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import BackOfficeSidebar, { type BackOfficeLink } from './BackOfficeSidebar'
import AdminSidebar from './AdminSidebar'
import ManagerSidebar from './ManagerSidebar'
import StaffSidebar from './StaffSidebar'

describe('BackOffice Sidebars Comprehensive Test Suite', () => {
  it('renders BackOfficeSidebar correctly and handles logout[cite: 2]', () => {
    const handleLogout = vi.fn()
    const links: BackOfficeLink[] = [{ icon: 'dashboard', label: 'Dashboard', path: '/admin' }]
    
    render(
      <MemoryRouter>
        <BackOfficeSidebar title="Admin Panel" sections={[{ links }]} onLogout={handleLogout} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Admin Panel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)

    const logoutButtons = screen.getAllByRole('button', { name: /logout/i })
    fireEvent.click(logoutButtons[0])
    expect(handleLogout).toHaveBeenCalledTimes(1)
  })

  it('renders AdminSidebar with operations and management sections[cite: 7]', () => {
    render(
      <MemoryRouter>
        <AdminSidebar onLogout={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Admin Panel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Operations').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Management').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Branches').length).toBeGreaterThan(0)
  })

  it('renders ManagerSidebar with operations and management[cite: 2, 4]', () => {
    render(
      <MemoryRouter>
        <ManagerSidebar onLogout={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Manager Portal').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Live Tables').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Physical Tables').length).toBeGreaterThan(0)
  })

  it('renders StaffSidebar with navigation links[cite: 2, 6]', () => {
    render(
      <MemoryRouter>
        <StaffSidebar onLogout={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Staff Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Check-In').length).toBeGreaterThan(0)
  })
})