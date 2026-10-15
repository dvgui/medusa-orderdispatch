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
      .mockResolvedValueOnce(answer([{ StockItemId: "si-1", Sku: "RETATRUTIDE-10MG" }]))
      .mockResolvedValueOnce(answer(["United Kingdom", "Germany"]))
      .mockResolvedValueOnce(answer({ IsSuccessfull: true, OrderNumber: "9001" }))

    const result = await make().createFulfillment({ id: "od-intl" }, items, order, { metadata: {} } as never)

    expect(result.data).toMatchObject({ id: "od-intl", odOrderNumber: "9001", odReference: "1201", odSubSource: "buyreta_eu" })
    const createCall = fetchSpy.mock.calls[3] as [URL, RequestInit]
    expect(createCall[0].searchParams.get("subSource")).toBe("buyreta_eu")
    const body = JSON.parse(String(createCall[1].body))
    expect(body.OrderItems[0]).toMatchObject({ Sku: "RETATRUTIDE-10MG", StockItemId: "si-1", Weight: 0.11 })
    // ODM takes its own country NAME, not the ISO code.
    expect(body.DeliveryAddress.Country).toBe("Germany")
    // Each option sends the label ODM's shipping rules map to a courier service.
    expect(body.ShippingDetails.ShippingService).toBe("DHL Economy DDP")
  })

  it("sends the company-prefixed stock item ODM holds", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer([{ StockItemId: "si-krel", Sku: "KREL-RETATRUTIDE-10MG" }, { StockItemId: "si-other", Sku: "KREL-RETATRUTIDE-10MG-KIT" }]))
      .mockResolvedValueOnce(answer(["Germany"]))
      .mockResolvedValueOnce(answer({ IsSuccessfull: true, OrderNumber: "9002" }))

    await make({ skuPrefix: "KREL-" }).createFulfillment({}, items, order, { metadata: {} } as never)

    const createCall = fetchSpy.mock.calls[3] as [URL, RequestInit]
    expect(JSON.parse(String(createCall[1].body)).OrderItems[0]).toMatchObject({ Sku: "KREL-RETATRUTIDE-10MG", StockItemId: "si-krel" })
    // The lookup is ODM's inventory search for the plain SKU.
    const searchCall = fetchSpy.mock.calls[1] as [URL, RequestInit]
    expect(searchCall[0].pathname).toBe("/Api/AmazonFBAInventorySearch/Search")
    expect(searchCall[0].searchParams.get("text")).toBe("RETATRUTIDE-10MG")
  })

  it("refuses a delivery country ODM doesn't list, before creating anything", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(answer([{ StockItemId: "si-1", Sku: "RETATRUTIDE-10MG" }]))
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
      .mockResolvedValueOnce(answer([{ StockItemId: "si-x", Sku: "OTHER-SKU" }]))

    await expect(make().createFulfillment({}, items, order, {} as never)).rejects.toThrow(
      "OrderDispatch: RETATRUTIDE-10MG is not set up in OrderDispatch"
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("prices the international options live: ODM's DDP rate + markup", async () => {
    fetchSpy
      .mockResolvedValueOnce(answer({ token: jwt }))
      .mockResolvedValueOnce(
        answer({
          Country: "DE",
          Weight: 0.27,
          Rates: [
            { Vendor: "DHL Express", Name: "Economy Select International DDP", Price: 15.98 },
            { Vendor: "DHL Express", Name: "Express Worldwide DDP", Price: 31.83 },
          ],
        })
      )
    const service = make()
    const context = { shipping_address: { country_code: "de" }, items: [{ quantity: 2, variant: { weight: 110 } }] } as never
    expect(await service.calculatePrice({ id: "od-intl-economy" }, {}, context)).toEqual({
      calculated_amount: 19.18,
      is_calculated_price_tax_inclusive: false,
    })
    // Same country and weight: served from the cache, no second ODM call.
    expect((await service.calculatePrice({ id: "od-intl-express" }, {}, context)).calculated_amount).toBe(38.2)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const ratesCall = fetchSpy.mock.calls[1] as [URL, RequestInit]
    expect(ratesCall[0].searchParams.get("country")).toBe("DE")
    expect(ratesCall[0].searchParams.get("weight")).toBe("0.27") // 2 × 110 g + 50 g packaging
  })

  it("calculates only the international options and needs an address", async () => {
    const service = make()
    expect(await service.canCalculate({ data: { id: "od-intl-express" } } as never)).toBe(true)
    expect(await service.canCalculate({ data: { id: "od-uk" } } as never)).toBe(false)
    await expect(service.calculatePrice({ id: "od-intl-economy" }, {}, { items: [] } as never)).rejects.toThrow(
      "Enter a delivery address"
    )
  })

  it("offers UK, Economy and Express and marks a cancel for follow-up", async () => {
    const service = make()
    expect((await service.getFulfillmentOptions()).map((o) => o.id)).toEqual(["od-uk", "od-intl-economy", "od-intl-express", "od-intl"])
    expect(await service.validateOption({ id: "od-uk" })).toBe(true)
    expect(await service.validateOption({ id: "rm-signed-for-1st" })).toBe(false)
    expect(await service.cancelFulfillment({ odOrderNumber: "9001" })).toMatchObject({ odCancelRequested: true })
  })

  it("requires credentials", () => {
    expect(() => OrderDispatchFulfillmentService.validateOptions({ username: "", password: "" })).toThrow("username and password")
  })
})
