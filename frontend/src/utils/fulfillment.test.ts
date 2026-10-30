import { describe, expect, it } from "vitest"
import type { FulfillmentOption } from "@/types"
import { fulfillmentLabel, sortFulfillmentMethods } from "./fulfillment"

const method = (
  id: string,
  code: string,
  name: string,
  available = false,
): FulfillmentOption => ({
  id,
  code,
  name,
  baseFee: 0,
  etaMinDays: null,
  etaMaxDays: null,
  storePickup: code === "pickup",
  checkoutAvailable: available,
  unavailableReason: available ? null : "Unavailable",
})

describe("fulfillment display", () => {
  it("uses deterministic Standard, Express, Pick Up order without changing IDs or availability", () => {
    const result = sortFulfillmentMethods([
      method("pickup-id", "pickup", "Pickup", true),
      method("express-id", "express", "Express"),
      method("standard-id", "standard", "Standard"),
    ])

    expect(result.map(({ id }) => id)).toEqual([
      "standard-id",
      "express-id",
      "pickup-id",
    ])
    expect(result.map(({ checkoutAvailable }) => checkoutAvailable)).toEqual([
      false,
      false,
      true,
    ])
    expect(result.map(fulfillmentLabel)).toEqual([
      "Standard",
      "Express",
      "Pick Up",
    ])
  })
})
