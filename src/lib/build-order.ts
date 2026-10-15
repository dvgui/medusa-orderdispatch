import type { CreateOrderItem, CreateOrderRequest, DeliveryAddress } from "./orderdispatch-client/types"

/**
 * Turns the order and fulfillment Medusa hands a fulfillment provider into an
 * ODM CreateOrder request. Pure — no I/O — so it is unit-tested directly.
 *
 * The fulfillment lines already carry the warehouse SKU: Medusa copies the
 * inventory item's `sku` onto each line (core-flows create-fulfillment), and
 * every physical product has one inventory item named by its warehouse SKU.
 */

/** Medusa amounts arrive as numbers, strings or BigNumber instances. */
export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (value && typeof value === "object") {
    // bignumber.js, e.g. MathBN.mult(required_quantity, quantity) on the
    // fulfillment lines Medusa hands the provider.
    const toNum = (value as { toNumber?: unknown }).toNumber
    if (typeof toNum === "function") return Number(toNum.call(value))
    const numeric = (value as { numeric?: unknown }).numeric
    if (typeof numeric === "number") return numeric
    if ("value" in value) return Number((value as { value: unknown }).value)
  }
  return Number.NaN
}

const money = (value: unknown): number => {
  const n = toNumber(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

/** The order fields read here (a subset of FulfillmentOrderDTO as loaded by
 *  createOrderFulfillmentWorkflow). */
export type ProviderOrder = Readonly<{
  id?: string
  display_id?: number | string | null
  email?: string | null
  currency_code?: string | null
  created_at?: string | Date | null
  shipping_total?: unknown
  discount_total?: unknown
  metadata?: Record<string, unknown> | null
  shipping_address?: Readonly<{
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    postal_code?: string | null
    province?: string | null
    country_code?: string | null
    phone?: string | null
  }> | null
  items?: ReadonlyArray<
    Readonly<{
      id: string
      title?: string | null
      unit_price?: unknown
      quantity?: unknown
      discount_total?: unknown
      variant?: Readonly<{
        weight?: number | null
        /** One variant unit consumes `required_quantity` of each item —
         *  e.g. a 10-vial kit is 10 of the vial's item. */
        inventory_items?: ReadonlyArray<Readonly<{ required_quantity?: unknown }> | null> | null
      }> | null
    }>
  > | null
}>

export type ProviderFulfillmentItem = Readonly<{
  line_item_id?: string | null
  inventory_item_id?: string | null
  title?: string | null
  sku?: string | null
  quantity?: unknown
}>

export type BuiltOrder = Readonly<{
  reference: string
  subSource: string
  request: CreateOrderRequest
}>

export class OrderBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OrderBuildError"
  }
}

/**
 * The ReferenceNumber processed orders are matched back by. Resends get the
 * same `<display>-R-<claim tail>` shape the Royal Mail integration uses, so a
 * replacement never collides with the original shipment. `prefix` keeps
 * environments sharing one ODM account apart (dev sends `DEV-1234`).
 */
export const orderReference = (
  order: Pick<ProviderOrder, "display_id" | "id">,
  resendClaimId?: string | null,
  prefix = ""
): string => {
  const base = String(order.display_id ?? order.id ?? "").trim()
  if (!base) throw new OrderBuildError("Order has neither a display id nor an id")
  return `${prefix}${resendClaimId ? `${base}-R-${resendClaimId.slice(-8)}` : base}`
}

const deliveryAddress = (order: ProviderOrder): DeliveryAddress => {
  const a = order.shipping_address
  const fullName = [text(a?.first_name), text(a?.last_name)].filter(Boolean).join(" ")
  const missing = [
    !fullName && "name",
    !text(a?.address_1) && "address line 1",
    !text(a?.city) && "town",
    !text(a?.postal_code) && "postcode",
    !text(a?.country_code) && "country",
  ].filter(Boolean)
  if (missing.length) {
    throw new OrderBuildError(`Shipping address is missing ${missing.join(", ")}`)
  }
  return {
    FullName: fullName,
    Email: text(order.email) || undefined,
    Phone: text(a?.phone) || undefined,
    Company: text(a?.company) || undefined,
    Address1: text(a?.address_1),
    Address2: text(a?.address_2) || undefined,
    Town: text(a?.city),
    PostCode: text(a?.postal_code),
    Region: text(a?.province) || undefined,
    Country: text(a?.country_code).toUpperCase(),
  }
}

/** Physical units one variant unit consumes, across all its inventory items. */
const unitsPerVariant = (line: NonNullable<ProviderOrder["items"]>[number] | undefined): number => {
  const units = (line?.variant?.inventory_items ?? []).reduce((sum, link) => {
    const required = toNumber(link?.required_quantity ?? 1)
    return sum + (Number.isFinite(required) && required > 0 ? required : 1)
  }, 0)
  return units > 0 ? units : 1
}

export const buildOrderDispatchOrder = ({
  order,
  items,
  resendClaimId,
  referencePrefix = "",
}: Readonly<{
  order: ProviderOrder
  items: readonly ProviderFulfillmentItem[]
  resendClaimId?: string | null
  referencePrefix?: string
}>): BuiltOrder => {
  if (!items.length) throw new OrderBuildError("Fulfillment has no items")
  const orderItems = new Map((order.items ?? []).map((i) => [i.id, i]))
  const isResend = Boolean(resendClaimId)

  const lines: CreateOrderItem[] = items.map((item) => {
    const sku = text(item.sku)
    const label = text(item.title) || item.line_item_id || "item"
    if (!sku) throw new OrderBuildError(`${label} has no SKU`)
    const quantity = toNumber(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new OrderBuildError(`${sku} has an invalid quantity`)
    }
    const line = item.line_item_id ? orderItems.get(item.line_item_id) : undefined
    // Medusa fulfils `required_quantity × ordered` of each item, so a kit
    // arrives as 10 vials: price, discount and weight are per physical unit.
    const perVariant = unitsPerVariant(line)
    const lineQuantity = toNumber(line?.quantity)
    const discount = toNumber(line?.discount_total)
    const grams = toNumber(line?.variant?.weight) / perVariant
    return {
      Sku: sku,
      Title: text(item.title) || text(line?.title) || sku,
      Quantity: quantity,
      RetailPrice: money(toNumber(line?.unit_price) / perVariant),
      DiscountAmount:
        lineQuantity > 0 && Number.isFinite(discount) ? money((discount * quantity) / (lineQuantity * perVariant)) : 0,
      ...(Number.isFinite(grams) && grams > 0 ? { Weight: Math.round(grams) / 1000 } : {}),
      ...(item.line_item_id ? { LineItemId: item.line_item_id } : {}),
    }
  })

  const reference = orderReference(order, resendClaimId, referencePrefix)
  const address = deliveryAddress(order)
  const { Email: _email, Address3: _address3, ...billing } = address
  const subSource = text(order.metadata?.storefront) || "unknown"
  const createdAt = order.created_at ? new Date(order.created_at) : undefined

  return {
    reference,
    subSource,
    request: {
      OrderItems: lines,
      DeliveryAddress: address,
      // The provider is not given the billing address; ODM only needs one for
      // its records, and the parcel goes to the delivery address.
      BillingAddress: billing,
      ShippingDetails: {
        ReferenceNumber: reference,
        ShippingCost: isResend ? 0 : money(order.shipping_total),
      },
      PaymentStatus: "PAID",
      ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { OrderDate: createdAt.toISOString() } : {}),
      Currency: text(order.currency_code).toUpperCase() || undefined,
      OrderDiscount: isResend ? 0 : money(order.discount_total),
    },
  }
}
