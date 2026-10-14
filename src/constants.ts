/** `static identifier` of the fulfillment provider service. */
export const ORDERDISPATCH_IDENTIFIER = "orderdispatch-fulfillment"

/**
 * Medusa provider id when registered with `id: "orderdispatch-fulfillment"`
 * (Medusa joins `<identifier>_<id>`). Fulfillments and shipping options carry it.
 */
export const ORDERDISPATCH_PROVIDER_ID = `${ORDERDISPATCH_IDENTIFIER}_${ORDERDISPATCH_IDENTIFIER}`

export const ORDERDISPATCH_DEFAULT_BASE_URL = "https://www.orderdispatch.co.uk"

/** OrderDispatch picks the courier through its shipping rules; Medusa only
 *  says whether the parcel is domestic or international. */
export const ORDERDISPATCH_FULFILLMENT_OPTIONS = [
  { id: "od-uk", name: "OrderDispatch UK" },
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
