import { useCallback, useEffect, useRef, useState } from 'react'
import { notificationsApi, type AppNotification } from '@/services/notificationsApi'

const POLL_MS = 30000

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.unreadCount()
      setUnread(count)
    } catch {
      // Stay quiet: the bell must never break the page (e.g. expired session).
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await notificationsApi.list(20))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = setInterval(refreshCount, POLL_MS)
    return () => clearInterval(timer)
  }, [refreshCount])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      loadItems()
      refreshCount()
    }
  }

  const markOne = async (item: AppNotification) => {
    if (item.read) return
    try {
      await notificationsApi.markRead(item.id)
      setItems(list => list.map(n => (n.id === item.id ? { ...n, read: true } : n)))
      setUnread(count => Math.max(0, count - 1))
    } catch {
      // ignore
    }
  }

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems(list => list.map(n => ({ ...n, read: true })))
      setUnread(0)
    } catch {
      // ignore
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button onClick={toggle} aria-label="Notifications"
        className="relative p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
        <svg className="w-5 h-5 text-[#1D1D1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] max-h-96 overflow-y-auto bg-white rounded-2xl border border-[#D2D2D7]/60 shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#D2D2D7]/60">
            <span className="text-sm font-semibold text-[#1D1D1F]">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-[#0071E3] hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {loading && items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#6E6E73] text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#6E6E73] text-center">No notifications yet.</p>
          ) : (
            <ul>
              {items.map(item => (
                <li key={item.id}>
                  <button onClick={() => markOne(item)}
                    className={`w-full text-left px-4 py-3 border-b border-[#D2D2D7]/40 last:border-b-0 hover:bg-[#F5F5F7] transition-colors ${item.read ? '' : 'bg-[#F5F9FF]'}`}>
                    <div className="flex items-start gap-2">
                      {!item.read && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-[#0071E3]" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1D1D1F]">{item.subject ?? 'Notification'}</p>
                        <p className="text-sm text-[#424245]">{item.body}</p>
                        <p className="mt-1 text-xs text-[#6E6E73]">{formatWhen(item.scheduledAt)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
