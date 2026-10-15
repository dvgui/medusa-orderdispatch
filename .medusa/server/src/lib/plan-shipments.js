"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planShipments = void 0;
const build_order_1 = require("./build-order");
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
        // Query returns quantities as BigNumber; Number() of one is NaN.
        .map((item) => ({ id: item.line_item_id, quantity: (0, build_order_1.toNumber)(item.quantity ?? 0) }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbi1zaGlwbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3BsYW4tc2hpcG1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLCtDQUF3QztBQUV4Qyx5Q0FBdUM7QUFldkM7Ozs7R0FJRztBQUNJLE1BQU0sYUFBYSxHQUFHLENBQzNCLFlBQXdDLEVBQ3hDLG9CQUF5RCxFQUN0QyxFQUFFLENBQ3JCLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQXFCLEVBQUU7SUFDdEQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBMkQsQ0FBQTtJQUMvRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ2xDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFBO0lBQ3JDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPO1FBQUUsT0FBTyxFQUFFLENBQUE7SUFDckMsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3JELElBQUksQ0FBQyxTQUFTO1FBQUUsT0FBTyxFQUFFLENBQUE7SUFFekIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzlELE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBQSxxQkFBVSxFQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDbEYsTUFBTSxLQUFLLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztTQUNwQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQXdELEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25HLGlFQUFpRTtTQUNoRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBQSxzQkFBUSxFQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFckYsT0FBTztRQUNMO1lBQ0UsU0FBUztZQUNULEtBQUssRUFBRTtnQkFDTCxRQUFRLEVBQUUsT0FBTztnQkFDakIsY0FBYyxFQUFFLFdBQVcsQ0FBQyxFQUFFO2dCQUM5QixLQUFLO2dCQUNMLElBQUksRUFBRTtvQkFDSixHQUFHLElBQUk7b0JBQ1AsYUFBYSxFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksT0FBTztvQkFDL0MsU0FBUyxFQUFFLE9BQU87b0JBQ2xCLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxTQUFTO29CQUM3QyxhQUFhLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixJQUFJLFNBQVM7aUJBQ3hEO2dCQUNELGVBQWUsRUFBRSxjQUFjO2dCQUMvQixZQUFZLEVBQUUsV0FBVyxJQUFJLEVBQUU7YUFDaEM7U0FDRjtLQUNGLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQXRDUyxRQUFBLGFBQWEsaUJBc0N0QiJ9