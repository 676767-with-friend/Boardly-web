import { describe, expect, it } from "vitest"
import { addCalendarDays, bangkokDateString } from "./bangkokDate"

describe("Bangkok calendar dates", () => {
  it("uses the Bangkok date when UTC is still on the previous day", () => {
    expect(bangkokDateString(new Date("2026-10-27T17:00:00Z"))).toBe(
      "2026-10-28",
    )
    expect(bangkokDateString(new Date("2026-10-27T23:59:59Z"))).toBe(
      "2026-10-28",
    )
  })

  it("handles Bangkok midnight and month boundaries deterministically", () => {
    expect(bangkokDateString(new Date("2026-01-31T17:00:00Z"))).toBe(
      "2026-02-01",
    )
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01")
  })
})
