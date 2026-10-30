import { describe, expect, it } from "vitest"
import { normalizeThaiPhone, thaiPhoneError } from "./phone"

describe("Thai phone validation", () => {
  it.each([
    "0812345678",
    "+66812345678",
    "02-123-4567",
    "053 123 456",
    " 081-234-5678 ",
    "",
    "   ",
  ])("accepts supported optional value %j", (value) => {
    expect(thaiPhoneError(value)).toBeNull()
  })

  it.each([
    "phone",
    "081234",
    "081234567890",
    "0712345678",
    "+67812345678",
    "00166812345678",
  ])("rejects unsupported value %j", (value) => {
    expect(thaiPhoneError(value)).not.toBeNull()
  })

  it("normalizes separators and +66 to domestic digits", () => {
    expect(normalizeThaiPhone(" +66 81-234-5678 ")).toBe("0812345678")
    expect(normalizeThaiPhone("02-123-4567")).toBe("021234567")
  })
})
