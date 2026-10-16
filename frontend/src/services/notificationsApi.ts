import apiClient from "./apiClient"

export interface AppNotification {
  id: string
  type: string
  subject: string | null
  body: string
  reservationId: string | null
  scheduledAt: string
  read: boolean
}

export const notificationsApi = {
  list: (limit = 20) =>
    apiClient.get<AppNotification[]>(`/notifications?limit=${limit}`),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) =>
    apiClient.patch<AppNotification>(`/notifications/${id}/read`, undefined),
  markAllRead: () =>
    apiClient.patch<{ count: number }>("/notifications/read-all", undefined),
}
