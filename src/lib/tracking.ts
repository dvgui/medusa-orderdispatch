import { ORDERDISPATCH_DEFAULT_BASE_URL } from "../constants"
import type { ProcessedOrder } from "./orderdispatch-client/types"

/**
 * Courier tracking pages, picked from ODM's `ServiceName` (e.g. "OBA Royal Mail
 * Tracked 48", "DPD Next Day UK", "Hermes UK Standard"). Order matters: the
 * first match wins, so specific names come before broad ones.
 */
const COURIERS: ReadonlyArray<Readonly<{ match: RegExp; name: string; url: (n: string) => string }>> = [
  { match: /parcel\s*force/i, name: "Parcelforce", url: (n) => `https://www.parcelforce.com/track-trace?trackNumber=${n}` },
  { match: /royal\s*mail/i, name: "Royal Mail", url: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  { match: /\bdpd\b/i, name: "DPD", url: (n) => `https://track.dpd.co.uk/parcels/${n}` },
  { match: /\bdhl\b/i, name: "DHL", url: (n) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}` },
  { match: /hermes|\bevri\b/i, name: "Evri", url: (n) => `https://www.evri.com/track/parcel/${n}` },
  { match: /fedex/i, name: "FedEx", url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { match: /\bdx\b/i, name: "DX", url: (n) => `https://www.dxdelivery.com/consumer/my-tracking/${n}` },
]

export type CourierInfo = Readonly<{ courier: string; trackingUrl: string | null }>

/** Courier display name and tracking URL for an ODM service name. */
export const courierFor = (serviceName: string | null | undefined, trackingNumber?: string | null): CourierInfo => {
  const service = (serviceName ?? "").trim()
  const number = (trackingNumber ?? "").trim()
  const known = COURIERS.find((c) => c.match.test(service))
  const encoded = encodeURIComponent(number)
  if (known) return { courier: known.name, trackingUrl: number ? known.url(encoded) : null }
  return {
    courier: service || "OrderDispatch",
    trackingUrl: number ? `${ORDERDISPATCH_DEFAULT_BASE_URL}/tracking/?trackingNumber=${encoded}` : null,
  }
}

/**
 * Processed orders by our ReferenceNumber. ODM returns every processed order
 * with no filter; when a reference appears more than once (a re-processed
 * order), the latest ProcessedDateTime wins.
 */
export const indexProcessedOrders = (orders: readonly ProcessedOrder[]): ReadonlyMap<string, ProcessedOrder> => {
  const byReference = new Map<string, ProcessedOrder>()
  for (const order of orders) {
    const reference = (order.ReferenceNum ?? "").trim()
    if (!reference) continue
    const previous = byReference.get(reference)
    const later =
      !previous ||
      Date.parse(order.ProcessedDateTime ?? "") >= Date.parse(previous.ProcessedDateTime ?? "")
    if (later) byReference.set(reference, order)
  }
  return byReference
}
