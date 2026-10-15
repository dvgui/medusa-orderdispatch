import { describe, expect, it } from "bun:test"

import { odmSkuFor, resolveOdmSkus } from "./sku"

describe("resolveOdmSkus", () => {
  const stock = ["KREL-RETATRUTIDE-10MG", "KREL-Bacteriostatic-Water-10ML", "LEGACY-SKU"]

  it("finds ODM's company-prefixed stock item for a plain Medusa SKU", () => {
    const { resolved, missing } = resolveOdmSkus(["RETATRUTIDE-10MG", "BACTERIOSTATIC-WATER-10ML"], stock, "KREL-")
    expect(Object.fromEntries(resolved)).toEqual({
      "RETATRUTIDE-10MG": "KREL-RETATRUTIDE-10MG",
      "BACTERIOSTATIC-WATER-10ML": "KREL-Bacteriostatic-Water-10ML",
    })
    expect(missing).toEqual([])
  })

  it("prefers an exact match and never double-prefixes", () => {
    expect(resolveOdmSkus(["LEGACY-SKU", "KREL-RETATRUTIDE-10MG"], stock, "KREL-").resolved).toEqual(
      new Map([
        ["LEGACY-SKU", "LEGACY-SKU"],
        ["KREL-RETATRUTIDE-10MG", "KREL-RETATRUTIDE-10MG"],
      ])
    )
  })

  it("reports SKUs ODM doesn't stock under either form", () => {
    expect(resolveOdmSkus(["TIRZEPATIDE-10MG"], stock, "KREL-").missing).toEqual(["TIRZEPATIDE-10MG"])
    expect(resolveOdmSkus(["RETATRUTIDE-10MG"], stock, "").missing).toEqual(["RETATRUTIDE-10MG"])
  })

  it("prefixes when the stock list isn't consulted", () => {
    expect(odmSkuFor("RETATRUTIDE-10MG", "KREL-")).toBe("KREL-RETATRUTIDE-10MG")
    expect(odmSkuFor("KREL-RETATRUTIDE-10MG", "KREL-")).toBe("KREL-RETATRUTIDE-10MG")
    expect(odmSkuFor("RETATRUTIDE-10MG", "")).toBe("RETATRUTIDE-10MG")
  })
})
