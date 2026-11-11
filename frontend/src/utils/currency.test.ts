import { expect, it } from "vitest"
import { formatCurrency } from "./currency"

it("formats and rounds Thai baht amounts for management and reservations", () => {
  expect(formatCurrency(1234.5)).toContain("1,235")
  expect(formatCurrency(0)).toContain("0")
})
