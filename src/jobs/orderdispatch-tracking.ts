import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDERDISPATCH_PROVIDER_ID } from "../constants"
import { OrderDispatchClient } from "../lib/orderdispatch-client"
import { planShipments, type OpenFulfillment } from "../lib/plan-shipments"
import { indexProcessedOrders } from "../lib/tracking"
import { markOrderDispatchShippedWorkflow } from "../workflows/mark-orderdispatch-shipped"

/**
 * ODM has no webhooks: poll its processed orders and mark matching Medusa
 * fulfillments shipped. Idempotent — shipped fulfillments drop out of the
 * query, so a re-run only picks up what is still open.
 *
 * Credentials come from the environment (jobs don't receive provider options):
 * ORDERDISPATCH_ENABLED=true, ORDERDISPATCH_USERNAME, ORDERDISPATCH_PASSWORD,
 * optional ORDERDISPATCH_BASE_URL.
 */
export default async function orderDispatchTrackingJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  if (process.env.ORDERDISPATCH_ENABLED?.trim().toLowerCase() !== "true") return
  const started = Date.now()

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "items.line_item_id", "items.quantity", "order.id"],
      filters: {
        provider_id: ORDERDISPATCH_PROVIDER_ID,
        shipped_at: null,
        canceled_at: null,
      },
    })
    const open = data as OpenFulfillment[]
    if (!open.length) return

    const client = new OrderDispatchClient({
      username: process.env.ORDERDISPATCH_USERNAME ?? "",
      password: process.env.ORDERDISPATCH_PASSWORD ?? "",
      baseUrl: process.env.ORDERDISPATCH_BASE_URL,
    })
    const processed = indexProcessedOrders(await client.getProcessedOrders())
    const planned = planShipments(open, processed)

    let shipped = 0
    for (const { reference, input } of planned) {
      try {
        await markOrderDispatchShippedWorkflow(container).run({ input })
        shipped++
        logger.info(
          `[orderdispatch] ${reference} dispatched — ${input.data.odServiceName ?? "courier"} ${input.tracking_number || "(no tracking number)"}`
        )
      } catch (error) {
        logger.error(
          `[orderdispatch] could not mark ${reference} shipped: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
    logger.info(
      `[orderdispatch] tracking: ${open.length} open, ${planned.length} dispatched in ODM, ${shipped} marked shipped (${Date.now() - started}ms)`
    )
  } catch (error) {
    logger.error(`[orderdispatch] tracking job failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const config = {
  name: "orderdispatch-tracking",
  schedule: "*/15 * * * *",
}
