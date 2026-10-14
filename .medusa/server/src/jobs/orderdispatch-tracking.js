"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderDispatchTrackingJob;
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../constants");
const orderdispatch_client_1 = require("../lib/orderdispatch-client");
const plan_shipments_1 = require("../lib/plan-shipments");
const tracking_1 = require("../lib/tracking");
const mark_orderdispatch_shipped_1 = require("../workflows/mark-orderdispatch-shipped");
/**
 * ODM has no webhooks: poll its processed orders and mark matching Medusa
 * fulfillments shipped. Idempotent — shipped fulfillments drop out of the
 * query, so a re-run only picks up what is still open.
 *
 * Credentials come from the environment (jobs don't receive provider options):
 * ORDERDISPATCH_ENABLED=true, ORDERDISPATCH_USERNAME, ORDERDISPATCH_PASSWORD,
 * optional ORDERDISPATCH_BASE_URL.
 */
async function orderDispatchTrackingJob(container) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    if (process.env.ORDERDISPATCH_ENABLED?.trim().toLowerCase() !== "true")
        return;
    const started = Date.now();
    try {
        const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
        const { data } = await query.graph({
            entity: "fulfillment",
            fields: ["id", "data", "items.line_item_id", "items.quantity", "order.id"],
            filters: {
                provider_id: constants_1.ORDERDISPATCH_PROVIDER_ID,
                shipped_at: null,
                canceled_at: null,
            },
        });
        const open = data;
        if (!open.length)
            return;
        const client = new orderdispatch_client_1.OrderDispatchClient({
            username: process.env.ORDERDISPATCH_USERNAME ?? "",
            password: process.env.ORDERDISPATCH_PASSWORD ?? "",
            baseUrl: process.env.ORDERDISPATCH_BASE_URL,
        });
        const processed = (0, tracking_1.indexProcessedOrders)(await client.getProcessedOrders());
        const planned = (0, plan_shipments_1.planShipments)(open, processed);
        let shipped = 0;
        for (const { reference, input } of planned) {
            try {
                await (0, mark_orderdispatch_shipped_1.markOrderDispatchShippedWorkflow)(container).run({ input });
                shipped++;
                logger.info(`[orderdispatch] ${reference} dispatched — ${input.data.odServiceName ?? "courier"} ${input.tracking_number || "(no tracking number)"}`);
            }
            catch (error) {
                logger.error(`[orderdispatch] could not mark ${reference} shipped: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        logger.info(`[orderdispatch] tracking: ${open.length} open, ${planned.length} dispatched in ODM, ${shipped} marked shipped (${Date.now() - started}ms)`);
    }
    catch (error) {
        logger.error(`[orderdispatch] tracking job failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
exports.config = {
    name: "orderdispatch-tracking",
    schedule: "*/15 * * * *",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JkZXJkaXNwYXRjaC10cmFja2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9qb2JzL29yZGVyZGlzcGF0Y2gtdHJhY2tpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBa0JBLDJDQStDQztBQWhFRCxxREFBcUU7QUFFckUsNENBQXdEO0FBQ3hELHNFQUFpRTtBQUNqRSwwREFBMkU7QUFDM0UsOENBQXNEO0FBQ3RELHdGQUEwRjtBQUUxRjs7Ozs7Ozs7R0FRRztBQUNZLEtBQUssVUFBVSx3QkFBd0IsQ0FBQyxTQUEwQjtJQUMvRSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFTLGlDQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzFFLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNO1FBQUUsT0FBTTtJQUM5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFFMUIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxhQUFhO1lBQ3JCLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDO1lBQzFFLE9BQU8sRUFBRTtnQkFDUCxXQUFXLEVBQUUscUNBQXlCO2dCQUN0QyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsV0FBVyxFQUFFLElBQUk7YUFDbEI7U0FDRixDQUFDLENBQUE7UUFDRixNQUFNLElBQUksR0FBRyxJQUF5QixDQUFBO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU07UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQztZQUNyQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxFQUFFO1lBQ2xELFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLEVBQUU7WUFDbEQsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCO1NBQzVDLENBQUMsQ0FBQTtRQUNGLE1BQU0sU0FBUyxHQUFHLElBQUEsK0JBQW9CLEVBQUMsTUFBTSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sT0FBTyxHQUFHLElBQUEsOEJBQWEsRUFBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFOUMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQztnQkFDSCxNQUFNLElBQUEsNkRBQWdDLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFDaEUsT0FBTyxFQUFFLENBQUE7Z0JBQ1QsTUFBTSxDQUFDLElBQUksQ0FDVCxtQkFBbUIsU0FBUyxpQkFBaUIsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQyxlQUFlLElBQUksc0JBQXNCLEVBQUUsQ0FDeEksQ0FBQTtZQUNILENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysa0NBQWtDLFNBQVMsYUFBYSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDakgsQ0FBQTtZQUNILENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FDVCw2QkFBNkIsSUFBSSxDQUFDLE1BQU0sVUFBVSxPQUFPLENBQUMsTUFBTSx1QkFBdUIsT0FBTyxvQkFBb0IsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sS0FBSyxDQUM1SSxDQUFBO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2hILENBQUM7QUFDSCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQUc7SUFDcEIsSUFBSSxFQUFFLHdCQUF3QjtJQUM5QixRQUFRLEVBQUUsY0FBYztDQUN6QixDQUFBIn0=