import { describe, expect, it } from "bun:test"

import { findAdoptableOrder } from "./adopt-order"

const expected = {
  reference: "5784",
  source: "WebApp",
  subSource: "peppys_uk",
  lines: [
    { Sku: "KREL-BA10", Quantity: 1 },
    { Sku: "KREL-RT20", Quantity: 1 },
  ],
}

const open = {
  NumOrderId: "3242804",
  ReferenceNum: "5784",
  Source: "WebApp",
  SubSource: "peppys_uk",
  IsCancelled: false,
  Items: [
    { SKU: "KREL-RT20", Quantity: 1 },
    { SKU: "KREL-BA10", Quantity: 1 },
  ],
}

describe("findAdoptableOrder", () => {
  it("adopts the open order ODM saved for this push", () => {
    expect(findAdoptableOrder([{ ...open, ReferenceNum: "5785" }, open], expected)?.NumOrderId).toBe("3242804")
  })

  it("sums a SKU sent on several lines, ignoring case", () => {
    const lines = [
      { Sku: "KREL-BA10", Quantity: 1 },
      { Sku: "krel-ba10", Quantity: 2 },
    ]
    const order = { ...open, Items: [{ SKU: "KREL-BA10", Quantity: 3 }] }
    expect(findAdoptableOrder([order], { ...expected, lines })).toBe(order)
  })

  it("refuses an order that differs in lines, quantities, tags or state", () => {
    const variants = [
      { ...open, ReferenceNum: "5784-R-abc" },
      { ...open, Source: "Shopify" },
      { ...open, SubSource: "peppys_uk-express" },
      { ...open, IsCancelled: true },
      { ...open, Items: [{ SKU: "KREL-BA10", Quantity: 1 }] },
      { ...open, Items: [...open.Items, { SKU: "KREL-CU100", Quantity: 1 }] },
      { ...open, Items: [{ SKU: "KREL-BA10", Quantity: 2 }, { SKU: "KREL-RT20", Quantity: 1 }] },
      { ...open, Items: null },
    ]
    for (const order of variants) expect(findAdoptableOrder([order], expected)).toBeUndefined()
  })
})
