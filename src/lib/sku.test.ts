import { describe, expect, it } from "bun:test"

import { matchOdmStockItem, odmCandidates } from "./sku"

const results = [
  { Sku: "KREL-RETATRUTIDE-10MG", StockItemId: "id-reta-10" },
  { Sku: "KREL-RETATRUTIDE-10MG-KIT", StockItemId: "id-reta-kit" },
  { Sku: "LEGACY-SKU", StockItemId: "id-legacy" },
]

describe("matchOdmStockItem", () => {
  it("finds ODM's company-prefixed stock item for a plain Medusa SKU", () => {
    expect(matchOdmStockItem("RETATRUTIDE-10MG", results, "KREL-")).toEqual({ Sku: "KREL-RETATRUTIDE-10MG", StockItemId: "id-reta-10" })
  })

  it("matches exactly, not by the search's contains", () => {
    expect(matchOdmStockItem("RETATRUTIDE-10MG-KIT", results, "KREL-")?.StockItemId).toBe("id-reta-kit")
    expect(matchOdmStockItem("RETATRUTIDE", results, "KREL-")).toBeUndefined()
  })

  it("prefers an exact match and never double-prefixes", () => {
    expect(matchOdmStockItem("LEGACY-SKU", results, "KREL-")?.StockItemId).toBe("id-legacy")
    expect(matchOdmStockItem("krel-retatrutide-10mg", results, "KREL-")?.StockItemId).toBe("id-reta-10")
    expect(odmCandidates("KREL-X", "KREL-")).toEqual(["KREL-X"])
  })

  it("returns nothing without a prefix match or a StockItemId", () => {
    expect(matchOdmStockItem("RETATRUTIDE-10MG", results, "")).toBeUndefined()
    expect(matchOdmStockItem("X", [{ Sku: "X", StockItemId: "" }], "")).toBeUndefined()
  })
})
