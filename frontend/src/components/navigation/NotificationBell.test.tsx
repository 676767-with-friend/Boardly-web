import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from './NotificationBell'
import { notificationsApi, type AppNotification } from '@/services/notificationsApi'

vi.mock('@/services/notificationsApi', () => ({ notificationsApi: { unreadCount: vi.fn(), list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() } }))
const notices: AppNotification[] = [
  { id: 'n-1', type: 'reservation', subject: 'Booking confirmed', body: 'Your booking is confirmed.', reservationId: 'r-1', scheduledAt: '2026-10-14T10:00:00.000Z', read: false },
  { id: 'n-2', type: 'system', subject: 'Welcome', body: 'Welcome to Boardly.', reservationId: null, scheduledAt: '2026-10-14T09:00:00.000Z', read: true },
]
beforeEach(() => {
  vi.mocked(notificationsApi.unreadCount).mockResolvedValue({ count: 1 })
  vi.mocked(notificationsApi.list).mockResolvedValue(notices)
  vi.mocked(notificationsApi.markRead).mockResolvedValue({ ...notices[0], read: true })
  vi.mocked(notificationsApi.markAllRead).mockResolvedValue({ count: 0 })
})

describe('NotificationBell', () => {
  it('shows the unread count badge', async () => {
    render(<NotificationBell />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })
  it('marks a notification as read and decrements the unread count', async () => {
    render(<NotificationBell />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Booking confirmed/ }))
    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith('n-1'))
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })
  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue([])
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue({ count: 0 })
    render(<NotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument()
  })
  it('marks all notifications as read and resets the count', async () => {
    render(<NotificationBell />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(await screen.findByText('Mark all as read'))
    await waitFor(() => expect(notificationsApi.markAllRead).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })
})
