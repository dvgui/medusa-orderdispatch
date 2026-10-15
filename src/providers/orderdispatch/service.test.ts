import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"

import OrderDispatchFulfillmentService from "./service"

const logger = { info: () => {}, warn: () => {}, error: () => {} } as never

const order = {
  id: "order_1",
  display_id: 1201,
  email: "jane@example.com",
  currency_code: "gbp",
  metadata: { storefront: "buyreta_eu" },
  shipping_address: { first_name: "Jane", last_name: "Doe", address_1: "1 St", city: "Berlin", postal_code: "10115", country_code: "de" },
  items: [{ id: "li_1", title: "Retatrutide", unit_price: 77, quantity: 1, variant: { weight: 110 } }],
} as never

const items = [{ line_item_id: "li_1", sku: "RETATRUTIDE-10MG", title: "Retatrutide 10mg", quantity: 1 }] as never

const jwt = `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`

describe("OrderDispatchFulfillmentService", () => {
  let fetchSpy: ReturnType<typeof spyOn>
  const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch")
  })
  afterEach(() => fetchSpy.mockRestore())

  const make = (opts: Record<string, unknown> = {}) =>
    new OrderDispatchFulfillmentService({ logger }, { username: "api@x", password: "pw", ...opts })

  it("pushes the order with the storefront as subSource and stores ODM's order number", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer({ Success: true, StockLevels: [{ ItemNumber: "RETATRUTIDE-10MG", Available: 5, InStock: 5, InOrders: 0 }] }))
      .mockResolvedValueOnce(answer(["United Kingdom", "Germany"]))
      .mockResolvedValueOnce(answer({ IsSuccessfull: true, OrderNumber: "9001" }))

    const result = await make().createFulfillment({ id: "od-intl" }, items, order, { metadata: {} } as never)

    expect(result.data).toMatchObject({ id: "od-intl", odOrderNumber: "9001", odReference: "1201", odSubSource: "buyreta_eu" })
    const createCall = fetchSpy.mock.calls[3] as [URL, RequestInit]
    expect(createCall[0].searchParams.get("subSource")).toBe("buyreta_eu")
    const body = JSON.parse(String(createCall[1].body))
    expect(body.OrderItems[0]).toMatchObject({ Sku: "RETATRUTIDE-10MG", Weight: 0.11 })
    // ODM takes its own country NAME, not the ISO code.
    expect(body.DeliveryAddress.Country).toBe("Germany")
    expect(body.ShippingDetails.ShippingService).toBe("StandardDelivery")
  })

  it("sends the company-prefixed stock item ODM holds", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer({ Success: true, StockLevels: [{ ItemNumber: "KREL-RETATRUTIDE-10MG", Available: 5, InStock: 5, InOrders: 0 }] }))
      .mockResolvedValueOnce(answer(["Germany"]))
      .mockResolvedValueOnce(answer({ IsSuccessfull: true, OrderNumber: "9002" }))

    await make({ skuPrefix: "KREL-" }).createFulfillment({}, items, order, { metadata: {} } as never)

    const createCall = fetchSpy.mock.calls[3] as [URL, RequestInit]
    expect(JSON.parse(String(createCall[1].body)).OrderItems[0].Sku).toBe("KREL-RETATRUTIDE-10MG")
  })

  it("refuses a delivery country ODM doesn't list, before creating anything", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer({ Success: true, StockLevels: [{ ItemNumber: "RETATRUTIDE-10MG", Available: 5, InStock: 5, InOrders: 0 }] }))
      .mockResolvedValueOnce(answer(["United Kingdom"]))

    await expect(make().createFulfillment({}, items, order, { metadata: {} } as never)).rejects.toThrow(
      "OrderDispatch doesn't list the delivery country DE"
    )
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it("does not push twice when the fulfillment already has an ODM order", async () => {
    const data = { odOrderNumber: "9001", odReference: "1201" }
    const result = await make().createFulfillment(data, items, order, {} as never)
    expect(result.data).toBe(data)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("refuses a SKU OrderDispatch doesn't stock, before creating anything", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer({ Success: true, StockLevels: [{ ItemNumber: "OTHER-SKU", Available: 1, InStock: 1, InOrders: 0 }] }))

    await expect(make().createFulfillment({}, items, order, {} as never)).rejects.toThrow(
      "OrderDispatch: RETATRUTIDE-10MG is not set up in OrderDispatch"
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("offers the two options and marks a cancel for follow-up", async () => {
    const service = make()
    expect((await service.getFulfillmentOptions()).map((o) => o.id)).toEqual(["od-uk", "od-intl"])
    expect(await service.validateOption({ id: "od-uk" })).toBe(true)
    expect(await service.validateOption({ id: "rm-signed-for-1st" })).toBe(false)
    expect(await service.cancelFulfillment({ odOrderNumber: "9001" })).toMatchObject({ odCancelRequested: true })
  })

  it("requires credentials", () => {
    expect(() => OrderDispatchFulfillmentService.validateOptions({ username: "", password: "" })).toThrow("username and password")
  })
})
