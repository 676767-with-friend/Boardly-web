import { describe, expect, it } from "vitest"
import { branchAddress, branchMapUrl } from "./branchLocation"

describe("branch location", () => {
  it("keeps each branch address distinct and safely encoded", () => {
    const central = {
      address: "1 Rama I Road",
      district: "Pathum Wan",
      province: "Bangkok",
      postalCode: "10330",
    }
    const silom = {
      address: "2 Silom Road",
      district: "Bang Rak",
      province: "Bangkok",
      postalCode: "10500",
    }

    expect(branchAddress(central)).toBe(
      "1 Rama I Road, Pathum Wan, Bangkok, 10330",
    )
    expect(branchAddress(silom)).toBe("2 Silom Road, Bang Rak, Bangkok, 10500")
    expect(branchMapUrl(central)).toContain(
      encodeURIComponent(branchAddress(central)),
    )
  })

  it("omits missing optional components without failing", () => {
    expect(
      branchAddress({
        address: "1 Main Road",
        district: "Bang Rak",
        province: null,
        postalCode: null,
      }),
    ).toBe("1 Main Road, Bang Rak")
  })
})
