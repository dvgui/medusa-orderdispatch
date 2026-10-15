import type { OrderDispatchFulfillmentData } from "../constants"
import type { MarkOrderDispatchShippedInput } from "../workflows/mark-orderdispatch-shipped"
import { toNumber } from "./build-order"
import type { ProcessedOrder } from "./orderdispatch-client/types"
import { courierFor } from "./tracking"

/** An open OrderDispatch fulfillment, as the tracking job queries it. */
export type OpenFulfillment = Readonly<{
  id: string
  data?: Record<string, unknown> | null
  items?: ReadonlyArray<Readonly<{ line_item_id?: string | null; quantity?: unknown }>> | null
  order?: Readonly<{ id?: string | null }> | null
}>

export type PlannedShipment = Readonly<{
  reference: string
  input: MarkOrderDispatchShippedInput
}>

/**
 * Which open fulfillments ODM has dispatched, and the workflow input that
 * marks each shipped. Fulfillments without an ODM reference, an order, or a
 * processed record are left for the next run.
 */
export const planShipments = (
  fulfillments: readonly OpenFulfillment[],
  processedByReference: ReadonlyMap<string, ProcessedOrder>
): PlannedShipment[] =>
  fulfillments.flatMap((fulfillment): PlannedShipment[] => {
    const data = (fulfillment.data ?? {}) as Record<string, unknown> & OrderDispatchFulfillmentData
    const reference = data.odReference
    const orderId = fulfillment.order?.id
    if (!reference || !orderId) return []
    const processed = processedByReference.get(reference)
    if (!processed) return []

    const trackingNumber = (processed.TrackingNumber ?? "").trim()
    const { courier, trackingUrl } = courierFor(processed.ServiceName, trackingNumber)
    const items = (fulfillment.items ?? [])
      .filter((item): item is { line_item_id: string; quantity?: unknown } => Boolean(item.line_item_id))
      // Query returns quantities as BigNumber; Number() of one is NaN.
      .map((item) => ({ id: item.line_item_id, quantity: toNumber(item.quantity ?? 0) }))

    return [
      {
        reference,
        input: {
          order_id: orderId,
          fulfillment_id: fulfillment.id,
          items,
          data: {
            ...data,
            odServiceName: processed.ServiceName ?? courier,
            odCourier: courier,
            odTrackingNumber: trackingNumber || undefined,
            odProcessedAt: processed.ProcessedDateTime ?? undefined,
          },
          tracking_number: trackingNumber,
          tracking_url: trackingUrl ?? "",
        },
      },
    ]
  })
