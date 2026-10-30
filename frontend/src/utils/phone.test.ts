import { describe, expect, it } from "vitest"
import { formatPhone, isValidPhone } from "./phone"

describe("phone", () => {
  it("formats and validates Thai mobile numbers", () => {
    expect(formatPhone("0812345678")).toBe("081-234-5678")
    expect(isValidPhone("081-234-5678")).toBe(true)
    expect(isValidPhone("123")).toBe(false)
  })
})
