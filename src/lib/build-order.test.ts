import { describe, expect, it } from "bun:test"

import { OrderBuildError, buildOrderDispatchOrder, orderReference, toNumber, type ProviderOrder } from "./build-order"

const order: ProviderOrder = {
  id: "order_1",
  display_id: 1201,
  email: "jane@example.com",
  currency_code: "gbp",
  created_at: "2026-10-14T09:00:00.000Z",
  shipping_total: 4,
  discount_total: 7.7,
  metadata: { storefront: "peppys_uk" },
  shipping_address: {
    first_name: "Jane",
    last_name: "Doe",
    address_1: "1 High Street",
    city: "London",
    postal_code: "SW1A 2AA",
    country_code: "gb",
    phone: "+447700900123",
  },
  items: [
    { id: "li_1", title: "Retatrutide", unit_price: 77, quantity: 2, discount_total: 7.7, variant: { weight: 110 } },
    { id: "li_2", title: "Bac Water", unit_price: { numeric: 6 }, quantity: 1, variant: { weight: null } },
  ],
}

const items = [
  { line_item_id: "li_1", sku: "RETATRUTIDE-10MG", title: "Retatrutide 10mg", quantity: 2 },
  { line_item_id: "li_2", sku: "BACTERIOSTATIC-WATER-10ML", title: "Bacteriostatic Water 10ml", quantity: 1 },
]

describe("buildOrderDispatchOrder", () => {
  it("builds ODM's order from the order and the fulfillment lines", () => {
    const { reference, subSource, request } = buildOrderDispatchOrder({ order, items })
    expect(reference).toBe("1201")
    expect(subSource).toBe("peppys_uk")
    expect(request.ShippingDetails).toEqual({ ReferenceNumber: "1201", ShippingCost: 4 })
    expect(request.Currency).toBe("GBP")
    expect(request.OrderDate).toBe("2026-10-14T09:00:00.000Z")
    expect(request.DeliveryAddress).toMatchObject({
      FullName: "Jane Doe",
      Email: "jane@example.com",
      Country: "GB",
      PostCode: "SW1A 2AA",
    })
    expect(request.BillingAddress).not.toHaveProperty("Email")
    expect(request.OrderItems).toEqual([
      { Sku: "RETATRUTIDE-10MG", Title: "Retatrutide 10mg", Quantity: 2, RetailPrice: 77, DiscountAmount: 7.7, Weight: 0.11, LineItemId: "li_1" },
      { Sku: "BACTERIOSTATIC-WATER-10ML", Title: "Bacteriostatic Water 10ml", Quantity: 1, RetailPrice: 6, DiscountAmount: 0, LineItemId: "li_2" },
    ])
  })

  it("prices a kit per vial: Medusa fulfils required_quantity × ordered", () => {
    const kitOrder: ProviderOrder = {
      ...order,
      items: [
        {
          id: "li_kit",
          title: "Retatrutide Kit",
          unit_price: 300,
          quantity: 2,
          discount_total: 60,
          variant: { weight: 500, inventory_items: [{ required_quantity: 10 }] },
        },
      ],
    }
    const { request } = buildOrderDispatchOrder({
      order: kitOrder,
      items: [{ line_item_id: "li_kit", sku: "RETATRUTIDE-10MG", title: "Retatrutide 10mg", quantity: 20 }],
    })
    expect(request.OrderItems[0]).toMatchObject({ Quantity: 20, RetailPrice: 30, DiscountAmount: 60, Weight: 0.05 })
  })

  it("gives resends their own reference and no shipping charge", () => {
    const { reference, request } = buildOrderDispatchOrder({ order, items, resendClaimId: "claim_01JABCDEFGH12345678" })
    expect(reference).toBe("1201-R-12345678")
    expect(request.ShippingDetails.ShippingCost).toBe(0)
    expect(request.OrderDiscount).toBe(0)
  })

  it("refuses lines without a SKU and incomplete addresses", () => {
    expect(() => buildOrderDispatchOrder({ order, items: [{ line_item_id: "li_1", title: "Retatrutide", quantity: 1 }] })).toThrow(
      OrderBuildError
    )
    expect(() =>
      buildOrderDispatchOrder({ order: { ...order, shipping_address: { ...order.shipping_address, postal_code: "" } }, items })
    ).toThrow("Shipping address is missing postcode")
    expect(() => buildOrderDispatchOrder({ order, items: [] })).toThrow("Fulfillment has no items")
  })

  it("prefixes the reference when environments share one ODM account", () => {
    const { reference, request } = buildOrderDispatchOrder({ order, items, referencePrefix: "DEV-" })
    expect(reference).toBe("DEV-1201")
    expect(request.ShippingDetails.ReferenceNumber).toBe("DEV-1201")
    expect(buildOrderDispatchOrder({ order, items, resendClaimId: "claim_x12345678", referencePrefix: "DEV-" }).reference).toBe(
      "DEV-1201-R-12345678"
    )
  })

  it("tags orders without a storefront as unknown rather than failing", () => {
    expect(buildOrderDispatchOrder({ order: { ...order, metadata: null }, items }).subSource).toBe("unknown")
  })
})

describe("orderReference / toNumber", () => {
  it("falls back to the order id", () => {
    expect(orderReference({ id: "order_9", display_id: null })).toBe("order_9")
  })
  it("reads Medusa BigNumber shapes", () => {
    expect(toNumber({ numeric: 12.5 })).toBe(12.5)
    expect(toNumber({ value: "3" })).toBe(3)
    expect(toNumber("4.2")).toBe(4.2)
    expect(Number.isNaN(toNumber(undefined))).toBe(true)
  })
})
