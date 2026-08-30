import apiClient from "./apiClient"

export interface AvailableTable {
  id: string
  code: string
  zone: string
  minPlayers: number
  maxPlayers: number
}

export interface AvailabilityResponse {
  startsAt: string
  endsAt: string
  players: number
  estimatedFee: number
  currency: string
  tables: AvailableTable[]
}

export interface Reservation {
  id: string
  reservationNumber: string
  branchId: string
  branchName: string
  tableId: string
  tableCode: string
  contactName: string
  startsAt: string
  endsAt: string
  playerCount: number
  status: string
  estimatedFee: number
  currency: string
}

export interface LiveTable {
  id: string
  code: string
  zone: string
  minPlayers: number
  maxPlayers: number
  status: "available" | "reserved" | "occupied" | "unavailable"
  assignable: boolean
  assignmentBlockCode: string | null
  assignmentBlockReason: string | null
  sessionId: string | null
  reservationId: string | null
  reservationNumber: string | null
  client: string | null
  players: number | null
  reservationStartsAt: string | null
  reservationEndsAt: string | null
  checkInAt: string | null
  serverTime: string
  bookedDurationMinutes: number | null
  elapsedSeconds: number
  overtimeSeconds: number
  runningFee: number | null
}

export interface StaffReservation {
  id: string
  reservationNumber: string
  branchId: string
  branchName: string
  tableId: string
  tableCode: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  startsAt: string
  endsAt: string
  playerCount: number
  status: string
  checkInEligible: boolean
  checkInBlockReason: string | null
}

export interface CheckoutPreview {
  id: string
  status: string
  client: string
  tableCode: string
  checkInAt: string
  checkOutAt: string | null
  serverTime: string
  bookedDurationMinutes: number | null
  elapsedSeconds: number
  overtimeSeconds: number
  finalFee: number
  currency: string
}

export const reservationsApi = {
  availableTables: (
    branchId: string,
    startsAt: string,
    endsAt: string,
    players: number,
  ) =>
    apiClient.get<AvailabilityResponse>(
      `/branches/${branchId}/available-tables?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}&players=${players}`,
    ),
  create: (body: {
    branchId: string
    tableId: string
    contactName: string
    contactPhone?: string
    contactEmail?: string
    startsAt: string
    endsAt: string
    playerCount: number
  }) => apiClient.post<Reservation>("/reservations", body),
  mine: () => apiClient.get<Reservation[]>("/reservations/me"),
  get: (reservationNumber: string) =>
    apiClient.get<Reservation>(
      `/reservations/${encodeURIComponent(reservationNumber)}`,
    ),
  cancel: (reservationNumber: string, reason?: string) =>
    apiClient.patch<Reservation>(
      `/reservations/${encodeURIComponent(reservationNumber)}/cancel`,
      { reason },
    ),
}

export const staffReservationsApi = {
  liveTables: (branchId: string, players: number) =>
    apiClient.get<LiveTable[]>(
      `/staff/branches/${branchId}/live-tables?players=${players}`,
    ),
  checkIn: (reservationId: string) =>
    apiClient.post<LiveTable>(
      `/staff/reservations/${reservationId}/check-in`,
      {},
    ),
  reservations: (branchId: string, date: string, search = "") =>
    apiClient.get<StaffReservation[]>(
      `/staff/branches/${branchId}/reservations?date=${encodeURIComponent(date)}&search=${encodeURIComponent(search)}`,
    ),
  walkIn: (body: {
    branchId: string
    tableId: string
    guestName?: string
    guestPhone?: string
    guestEmail?: string
    userId?: string
    playerCount: number
  }) => apiClient.post<LiveTable>("/staff/play-sessions/walk-in", body),
  checkoutPreview: (sessionId: string) =>
    apiClient.get<CheckoutPreview>(
      `/staff/play-sessions/${sessionId}/checkout`,
    ),
  checkout: (sessionId: string, paymentReceived = false) =>
    apiClient.post<CheckoutPreview>(
      `/staff/play-sessions/${sessionId}/checkout`,
      { paymentReceived },
    ),
}
