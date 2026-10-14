"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planShipments = void 0;
const tracking_1 = require("./tracking");
/**
 * Which open fulfillments ODM has dispatched, and the workflow input that
 * marks each shipped. Fulfillments without an ODM reference, an order, or a
 * processed record are left for the next run.
 */
const planShipments = (fulfillments, processedByReference) => fulfillments.flatMap((fulfillment) => {
    const data = (fulfillment.data ?? {});
    const reference = data.odReference;
    const orderId = fulfillment.order?.id;
    if (!reference || !orderId)
        return [];
    const processed = processedByReference.get(reference);
    if (!processed)
        return [];
    const trackingNumber = (processed.TrackingNumber ?? "").trim();
    const { courier, trackingUrl } = (0, tracking_1.courierFor)(processed.ServiceName, trackingNumber);
    const items = (fulfillment.items ?? [])
        .filter((item) => Boolean(item.line_item_id))
        .map((item) => ({ id: item.line_item_id, quantity: Number(item.quantity ?? 0) }));
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
    ];
});
exports.planShipments = planShipments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbi1zaGlwbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3BsYW4tc2hpcG1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLHlDQUF1QztBQWV2Qzs7OztHQUlHO0FBQ0ksTUFBTSxhQUFhLEdBQUcsQ0FDM0IsWUFBd0MsRUFDeEMsb0JBQXlELEVBQ3RDLEVBQUUsQ0FDckIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBcUIsRUFBRTtJQUN0RCxNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUEyRCxDQUFBO0lBQy9GLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDbEMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUE7SUFDckMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUNyQyxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDckQsSUFBSSxDQUFDLFNBQVM7UUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUV6QixNQUFNLGNBQWMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFBLHFCQUFVLEVBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNsRixNQUFNLEtBQUssR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1NBQ3BDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBd0QsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDbEcsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRW5GLE9BQU87UUFDTDtZQUNFLFNBQVM7WUFDVCxLQUFLLEVBQUU7Z0JBQ0wsUUFBUSxFQUFFLE9BQU87Z0JBQ2pCLGNBQWMsRUFBRSxXQUFXLENBQUMsRUFBRTtnQkFDOUIsS0FBSztnQkFDTCxJQUFJLEVBQUU7b0JBQ0osR0FBRyxJQUFJO29CQUNQLGFBQWEsRUFBRSxTQUFTLENBQUMsV0FBVyxJQUFJLE9BQU87b0JBQy9DLFNBQVMsRUFBRSxPQUFPO29CQUNsQixnQkFBZ0IsRUFBRSxjQUFjLElBQUksU0FBUztvQkFDN0MsYUFBYSxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsSUFBSSxTQUFTO2lCQUN4RDtnQkFDRCxlQUFlLEVBQUUsY0FBYztnQkFDL0IsWUFBWSxFQUFFLFdBQVcsSUFBSSxFQUFFO2FBQ2hDO1NBQ0Y7S0FDRixDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFyQ1MsUUFBQSxhQUFhLGlCQXFDdEIifQ==