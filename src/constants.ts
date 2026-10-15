/** `static identifier` of the fulfillment provider service. */
export const ORDERDISPATCH_IDENTIFIER = "orderdispatch-fulfillment"

/**
 * Medusa provider id when registered with `id: "orderdispatch-fulfillment"`
 * (Medusa joins `<identifier>_<id>`). Fulfillments and shipping options carry it.
 */
export const ORDERDISPATCH_PROVIDER_ID = `${ORDERDISPATCH_IDENTIFIER}_${ORDERDISPATCH_IDENTIFIER}`

export const ORDERDISPATCH_DEFAULT_BASE_URL = "https://www.orderdispatch.co.uk"

/**
 * Medusa's fulfillment options. Each sends ODM a ShippingService label that
 * ODM's shipping rules (Settings → Shipping Service Settings) map to the real
 * courier service. The international ones are priced live from ODM's DDP rates.
 */
export const ORDERDISPATCH_FULFILLMENT_OPTIONS = [
  { id: "od-uk", name: "OrderDispatch UK", shippingService: "UK Tracked 24" },
  {
    id: "od-intl-economy",
    name: "OrderDispatch International Economy",
    shippingService: "DHL Economy DDP",
    rate: { vendor: "DHL Express", service: "Economy Select International DDP", fallback: "Express Worldwide DDP" },
  },
  {
    id: "od-intl-express",
    name: "OrderDispatch International Express",
    shippingService: "DHL Express DDP",
    rate: { vendor: "DHL Express", service: "Express Worldwide DDP" },
  },
  /** Before the Economy/Express split; shipped as Economy. */
  { id: "od-intl", name: "OrderDispatch International", shippingService: "DHL Economy DDP" },
] as const

export type OrderDispatchOptionId = (typeof ORDERDISPATCH_FULFILLMENT_OPTIONS)[number]["id"]

/** Keys this plugin owns on `fulfillment.data`. */
export type OrderDispatchFulfillmentData = Readonly<{
  /** ODM's own order number, returned by CreateOrder. */
  odOrderNumber?: string
  /** Our ReferenceNumber — how processed orders are matched back. */
  odReference?: string
  odSubSource?: string
  odPushedAt?: string
  odCancelRequested?: boolean
  odServiceName?: string
  odTrackingNumber?: string
  odProcessedAt?: string
}>
