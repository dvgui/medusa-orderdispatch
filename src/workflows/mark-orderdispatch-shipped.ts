import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createOrderShipmentWorkflow, updateFulfillmentWorkflow } from "@medusajs/medusa/core-flows"

export type MarkOrderDispatchShippedInput = Readonly<{
  order_id: string
  fulfillment_id: string
  /** Order line items in this fulfillment, as createOrderShipmentWorkflow
   *  validates them against the order. */
  items: ReadonlyArray<Readonly<{ id: string; quantity: number }>>
  /** The fulfillment's full `data`, merged with the ODM dispatch details
   *  (updateFulfillment replaces `data` as a whole). */
  data: Record<string, unknown>
  tracking_number: string
  tracking_url: string
}>

export const markOrderDispatchShippedWorkflowId = "mark-orderdispatch-shipped"

/**
 * Record ODM's dispatch on the fulfillment, then mark the order shipped.
 *
 * createOrderShipmentWorkflow — not the fulfillment-level createShipmentWorkflow
 * — because only the order-level one registers the shipment on the order
 * (shipped quantities, order fulfilment status) and emits shipment.created,
 * which sends the branded "your order has shipped" email.
 */
export const markOrderDispatchShippedWorkflow = createWorkflow(
  markOrderDispatchShippedWorkflowId,
  function (input: MarkOrderDispatchShippedInput) {
    const fulfillmentUpdate = transform({ input }, ({ input }) => ({
      id: input.fulfillment_id,
      data: input.data,
    }))
    updateFulfillmentWorkflow.runAsStep({ input: fulfillmentUpdate })

    const shipment = transform({ input }, ({ input }) => ({
      order_id: input.order_id,
      fulfillment_id: input.fulfillment_id,
      items: input.items.map((item) => ({ id: item.id, quantity: item.quantity })),
      labels: input.tracking_number
        ? [{ tracking_number: input.tracking_number, tracking_url: input.tracking_url, label_url: "" }]
        : [],
    }))
    createOrderShipmentWorkflow.runAsStep({ input: shipment })

    return new WorkflowResponse({ fulfillment_id: input.fulfillment_id })
  }
)
