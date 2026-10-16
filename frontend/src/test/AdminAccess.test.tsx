// src/auth/AdminAccess.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminDashboardPage } from '@/features/AdminPages'
import { adminApi } from '@/services/managementApi'
import { useAuth } from '@/auth/AuthProvider'

// Mock Auth Provider และ Admin API
vi.mock('@/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/services/managementApi', () => ({
  adminApi: {
    dashboard: vi.fn(),
    orders: vi.fn(),
    users: vi.fn(),
    staff: vi.fn(),
    branches: vi.fn(),
    products: vi.fn(),
  },
}))

describe('Admin Access & Dashboard Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders AdminDashboardPage successfully when API returns data', async () => {
    // Mock ข้อมูล Dashboard สำหรับ Admin จาก AdminPages.tsx
    vi.mocked(adminApi.dashboard).mockResolvedValueOnce({
      activeBranches: 3,
      activeStaff: 12,
      reservationsToday: 20,
      salesToday: 45000,
      availableTables: 15,
      totalTables: 20,
      unavailableTables: 5,
      activeSessions: 8,
      orders: 10,
    } as any)

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )

    // ตรวจสอบสถานะกำลังโหลด
    expect(screen.getByText(/loading database-backed information/i)).toBeInTheDocument()

    // รอให้ข้อมูลแสดงผลขึ้นมาครบถ้วน
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })

    // ตรวจสอบหัวข้อหลักในหน้า Dashboard ของ Admin
    expect(screen.getByText('Network Overview')).toBeInTheDocument()
    expect(screen.getByText('Live Operations')).toBeInTheDocument()
  })

  it('displays error notice when AdminDashboardPage API fails', async () => {
    // Mock ให้ API โหลดข้อมูลพัง / ไม่มีสิทธิ์เข้าถึง
    vi.mocked(adminApi.dashboard).mockRejectedValueOnce(new Error('Failed to load admin data.'))

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )

    // ตรวจสอบว่าแสดงข้อความ Error ออกมาทางหน้าจอ
    expect(await screen.findByText('Failed to load admin data.')).toBeInTheDocument()
  })
})