import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiClient } from "./apiClient"
import { reservationsApi, staffReservationsApi } from "./reservationsApi"

describe("reservationsApi", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
    apiClient.setAccessToken(null)
  })

  it("requests authoritative availability for the exact interval and party size", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tables: [], estimatedFee: 280, currency: "THB" }),
    })

    await reservationsApi.availableTables(
      "branch-1",
      "2026-10-28T12:00:00+07:00",
      "2026-10-28T14:00:00+07:00",
      2,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/branches/branch-1/available-tables?startsAt=2026-10-28T12%3A00%3A00%2B07%3A00&endsAt=2026-10-28T14%3A00%3A00%2B07%3A00&players=2",
      ),
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("preserves the backend conflict code and message for reservation feedback", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        status: 409,
        code: "RESERVATION_CONFLICT",
        message: "This table was just reserved for the selected time.",
      }),
    })

    await expect(
      reservationsApi.create({
        branchId: "branch-1",
        tableId: "table-1",
        contactName: "Guest",
        startsAt: "2026-10-28T12:00:00+07:00",
        endsAt: "2026-10-28T14:00:00+07:00",
        playerCount: 2,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "RESERVATION_CONFLICT",
      message: "This table was just reserved for the selected time.",
    })
  })

  it("maps customer and staff reservation operations to their public API contracts", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const request = {
      branchId: "branch-1",
      tableId: "table-1",
      contactName: "Guest",
      startsAt: "2026-10-28T12:00:00+07:00",
      endsAt: "2026-10-28T14:00:00+07:00",
      playerCount: 2,
    }
    await reservationsApi.create(request)
    await reservationsApi.mine()
    await reservationsApi.get("RSV/1001")
    await reservationsApi.cancel("RSV/1001", "Plan changed")
    await staffReservationsApi.liveTables("branch-1", 4)
    await staffReservationsApi.checkIn("reservation-1")
    await staffReservationsApi.reservations(
      "branch-1",
      "2026-10-28",
      "Ada & Bob",
    )
    await staffReservationsApi.walkIn({
      branchId: "branch-1",
      tableId: "table-1",
      guestName: "Guest",
      playerCount: 2,
    })
    await staffReservationsApi.checkoutPreview("session/1")
    await staffReservationsApi.checkout("session/1", true)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/reservations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/reservations/me",
      expect.objectContaining({ method: "GET" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/reservations/RSV%2F1001",
      expect.objectContaining({ method: "GET" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/reservations/RSV%2F1001/cancel",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ reason: "Plan changed" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/staff/branches/branch-1/live-tables?players=4",
      expect.anything(),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/staff/branches/branch-1/reservations?date=2026-10-28&search=Ada%20%26%20Bob",
      expect.anything(),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "/api/staff/play-sessions/session/1/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ paymentReceived: true }),
      }),
    )
  })
})
