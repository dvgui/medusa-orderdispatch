/** `static identifier` of the fulfillment provider service. */
export const ORDERDISPATCH_IDENTIFIER = "orderdispatch-fulfillment"

/**
 * Medusa provider id when registered with `id: "orderdispatch-fulfillment"`
 * (Medusa joins `<identifier>_<id>`). Fulfillments and shipping options carry it.
 */
export const ORDERDISPATCH_PROVIDER_ID = `${ORDERDISPATCH_IDENTIFIER}_${ORDERDISPATCH_IDENTIFIER}`

export const ORDERDISPATCH_DEFAULT_BASE_URL = "https://www.orderdispatch.co.uk"

/**
 * Medusa's fulfillment options. ODM ignores CreateOrder's ShippingService, so
 * the customer's choice reaches ODM's shipping rules (Settings → Shipping
 * Service Settings) through the order's SubSource: Express orders are tagged
 * `<storefront>-express`. The international options are priced live from
 * ODM's DDP rates. ODM's rules (2026-10-15):
 *   Country = United Kingdom            → Royal Mail Tracked 24 NEXT DAY
 *   Sub Source ends with "-express"     → Express Worldwide DDP
 *   Country in the DHL Economy list     → Economy Select International DDP
 *   any other country                   → Express Worldwide DDP
 */
export const ORDERDISPATCH_EXPRESS_SUFFIX = "-express"

export const ORDERDISPATCH_FULFILLMENT_OPTIONS = [
  { id: "od-uk", name: "OrderDispatch UK" },
  {
    id: "od-intl-economy",
    name: "OrderDispatch International Economy",
    rate: { vendor: "DHL Express", service: "Economy Select International DDP", fallback: "Express Worldwide DDP" },
  },
  {
    id: "od-intl-express",
    name: "OrderDispatch International Express",
    subSourceSuffix: ORDERDISPATCH_EXPRESS_SUFFIX,
    rate: { vendor: "DHL Express", service: "Express Worldwide DDP" },
  },
  /** Before the Economy/Express split; shipped as Economy. */
  { id: "od-intl", name: "OrderDispatch International" },
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
