import type { CreateOrderItem, OpenOrder } from "./orderdispatch-client/types"

/**
 * ODM can save an order and still answer CreateOrder with an error — a step
 * after the insert fails (on 2026-10-21 every create came back "Procedure or
 * function GetSetGiftNotes has too many arguments specified"), and a retry is
 * then refused with "Order with Reference … Already exists". The order is in
 * ODM and will ship, so the fulfilment adopts it instead of failing.
 *
 * Only an open order that is unmistakably this push qualifies: same reference,
 * Source and SubSource, not cancelled, and the same SKUs and quantities.
 * Pure — the caller fetches the open orders.
 */
export const findAdoptableOrder = (
  openOrders: readonly OpenOrder[],
  expected: Readonly<{
    reference: string
    source: string
    subSource: string
    lines: readonly Pick<CreateOrderItem, "Sku" | "Quantity">[]
  }>
): OpenOrder | undefined => {
  const same = (a: unknown, b: string) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase()
  const wanted = quantitiesBySku(expected.lines.map((line) => [line.Sku, line.Quantity]))
  return openOrders.find(
    (order) =>
      String(order.ReferenceNum ?? "").trim() === expected.reference &&
      same(order.Source, expected.source) &&
      same(order.SubSource, expected.subSource) &&
      !order.IsCancelled &&
      sameQuantities(quantitiesBySku((order.Items ?? []).map((item) => [item.SKU, item.Quantity])), wanted)
  )
}

const quantitiesBySku = (lines: ReadonlyArray<readonly [unknown, unknown]>): ReadonlyMap<string, number> => {
  const totals = new Map<string, number>()
  for (const [sku, quantity] of lines) {
    const key = String(sku ?? "").trim().toUpperCase()
    totals.set(key, (totals.get(key) ?? 0) + Number(quantity ?? 0))
  }
  return totals
}

const sameQuantities = (a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean =>
  a.size === b.size && [...a].every(([sku, quantity]) => b.get(sku) === quantity)
