import { describe, expect, it } from "bun:test"

import { OrderDispatchClient, OrderDispatchError, jwtExpiresAt } from "./client"

const jwt = (expSeconds: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: expSeconds, unique_name: "api@x" })).toString("base64url")}.s`

type Call = { url: string; init: RequestInit }

/** A fetch that answers from a queue, recording each call. */
const fakeFetch = (responses: Array<{ status?: number; body: unknown }>) => {
  const calls: Call[] = []
  const impl = (async (url: URL | string, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const next = responses.shift()
    if (!next) throw new Error("unexpected request")
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 })
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe("OrderDispatchClient", () => {
  const NOW = 1_800_000_000_000

  it("logs in once and reuses the token until shortly before it expires", async () => {
    const { impl, calls } = fakeFetch([
      { body: { token: jwt(NOW / 1000 + 20 * 3600) } },
      { body: { Success: true, StockLevels: [{ ItemNumber: "RETATRUTIDE-10MG", Available: 3, InStock: 3, InOrders: 0 }] } },
      { body: { Success: true, ProcessedOrders: [] } },
    ])
    const client = new OrderDispatchClient({ username: "api@x", password: "pw", fetchImpl: impl, now: () => NOW })
    const stock = await client.getStockLevels()
    await client.getProcessedOrders()
    expect(stock[0].ItemNumber).toBe("RETATRUTIDE-10MG")
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual([
      "/api/Auth/ValidateUser",
      "/api/InventoryPreview/GetStockLevels",
      "/api/ProcessedOrders/GetProcessedOrders",
    ])
    expect((calls[1].init.headers as Record<string, string>).Authorization).toStartWith("Bearer h.")
  })

  it("re-logs once on a 401 and retries the request", async () => {
    const { impl, calls } = fakeFetch([
      { body: { token: jwt(NOW / 1000 + 3600) } },
      { status: 401, body: {} },
      { body: { token: jwt(NOW / 1000 + 3600) } },
      { body: { Success: true, ProcessedOrders: [] } },
    ])
    const client = new OrderDispatchClient({ username: "u", password: "pw", fetchImpl: impl, now: () => NOW })
    await client.getProcessedOrders()
    expect(calls).toHaveLength(4)
  })

  it("refreshes a token that is about to expire", async () => {
    let now = NOW
    const { impl, calls } = fakeFetch([
      { body: { token: jwt(NOW / 1000 + 600) } },
      { body: { Success: true, ProcessedOrders: [] } },
      { body: { token: jwt(NOW / 1000 + 7200) } },
      { body: { Success: true, ProcessedOrders: [] } },
    ])
    const client = new OrderDispatchClient({ username: "u", password: "pw", fetchImpl: impl, now: () => now })
    await client.getProcessedOrders()
    now += 6 * 60_000 // within the 5-minute refresh margin of a 10-minute token
    await client.getProcessedOrders()
    expect(calls.filter((c) => c.url.includes("ValidateUser"))).toHaveLength(2)
  })

  it("sends source and subSource as query parameters and surfaces ODM's error", async () => {
    const { impl, calls } = fakeFetch([
      { body: { token: jwt(NOW / 1000 + 3600) } },
      { body: { IsSuccessfull: false, Error: "Unknown SKU RETA-X" } },
    ])
    const client = new OrderDispatchClient({ username: "u", password: "pw", fetchImpl: impl, now: () => NOW })
    const order = {
      OrderItems: [{ Sku: "RETA-X", Quantity: 1 }],
      DeliveryAddress: { FullName: "A B", Address1: "1 St", Town: "T", PostCode: "P", Country: "GB" },
      ShippingDetails: { ReferenceNumber: "1001" },
    }
    await expect(client.createOrder(order, { source: "MEDUSA", subSource: "peppys_uk" })).rejects.toThrow(
      "OrderDispatch rejected order 1001: Unknown SKU RETA-X"
    )
    const url = new URL(calls[1].url)
    expect(url.searchParams.get("source")).toBe("MEDUSA")
    expect(url.searchParams.get("subSource")).toBe("peppys_uk")
  })

  it("never puts the password in an error", async () => {
    const { impl } = fakeFetch([{ status: 401, body: { message: "bad" } }])
    const client = new OrderDispatchClient({ username: "u", password: "s3cr3t-pw", fetchImpl: impl, now: () => NOW })
    const error = await client.getStockLevels().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(OrderDispatchError)
    expect(String((error as Error).message)).not.toContain("s3cr3t-pw")
  })

  it("reads a JWT's expiry", () => {
    expect(jwtExpiresAt(jwt(1_792_042_063))).toBe(1_792_042_063_000)
    expect(jwtExpiresAt("not-a-jwt")).toBeUndefined()
  })
})
