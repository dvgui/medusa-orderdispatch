"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexProcessedOrders = exports.courierFor = void 0;
const constants_1 = require("../constants");
/**
 * Courier tracking pages, picked from ODM's `ServiceName` (e.g. "OBA Royal Mail
 * Tracked 48", "DPD Next Day UK", "Hermes UK Standard"). Order matters: the
 * first match wins, so specific names come before broad ones.
 */
const COURIERS = [
    { match: /parcel\s*force/i, name: "Parcelforce", url: (n) => `https://www.parcelforce.com/track-trace?trackNumber=${n}` },
    { match: /royal\s*mail/i, name: "Royal Mail", url: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
    { match: /\bdpd\b/i, name: "DPD", url: (n) => `https://track.dpd.co.uk/parcels/${n}` },
    { match: /\bdhl\b/i, name: "DHL", url: (n) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}` },
    { match: /hermes|\bevri\b/i, name: "Evri", url: (n) => `https://www.evri.com/track/parcel/${n}` },
    { match: /fedex/i, name: "FedEx", url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
    { match: /\bdx\b/i, name: "DX", url: (n) => `https://www.dxdelivery.com/consumer/my-tracking/${n}` },
];
/** Courier display name and tracking URL for an ODM service name. */
const courierFor = (serviceName, trackingNumber) => {
    const service = (serviceName ?? "").trim();
    const number = (trackingNumber ?? "").trim();
    const known = COURIERS.find((c) => c.match.test(service));
    const encoded = encodeURIComponent(number);
    if (known)
        return { courier: known.name, trackingUrl: number ? known.url(encoded) : null };
    return {
        courier: service || "OrderDispatch",
        trackingUrl: number ? `${constants_1.ORDERDISPATCH_DEFAULT_BASE_URL}/tracking/?trackingNumber=${encoded}` : null,
    };
};
exports.courierFor = courierFor;
/**
 * Processed orders by our ReferenceNumber. ODM returns every processed order
 * with no filter; when a reference appears more than once (a re-processed
 * order), the latest ProcessedDateTime wins.
 */
const indexProcessedOrders = (orders) => {
    const byReference = new Map();
    for (const order of orders) {
        const reference = (order.ReferenceNum ?? "").trim();
        if (!reference)
            continue;
        const previous = byReference.get(reference);
        const later = !previous ||
            Date.parse(order.ProcessedDateTime ?? "") >= Date.parse(previous.ProcessedDateTime ?? "");
        if (later)
            byReference.set(reference, order);
    }
    return byReference;
};
exports.indexProcessedOrders = indexProcessedOrders;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3RyYWNraW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUE2RDtBQUc3RDs7OztHQUlHO0FBQ0gsTUFBTSxRQUFRLEdBQXlGO0lBQ3JHLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyx1REFBdUQsQ0FBQyxFQUFFLEVBQUU7SUFDekgsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQywrREFBK0QsQ0FBQyxFQUFFLEVBQUU7SUFDOUgsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUU7SUFDdEYsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyw0REFBNEQsQ0FBQyxFQUFFLEVBQUU7SUFDL0csRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsRUFBRTtJQUNqRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDRDQUE0QyxDQUFDLEVBQUUsRUFBRTtJQUMvRixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLG1EQUFtRCxDQUFDLEVBQUUsRUFBRTtDQUNyRyxDQUFBO0FBSUQscUVBQXFFO0FBQzlELE1BQU0sVUFBVSxHQUFHLENBQUMsV0FBc0MsRUFBRSxjQUE4QixFQUFlLEVBQUU7SUFDaEgsTUFBTSxPQUFPLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDMUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDNUMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN6RCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQyxJQUFJLEtBQUs7UUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDMUYsT0FBTztRQUNMLE9BQU8sRUFBRSxPQUFPLElBQUksZUFBZTtRQUNuQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLDBDQUE4Qiw2QkFBNkIsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUk7S0FDckcsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQVZZLFFBQUEsVUFBVSxjQVV0QjtBQUVEOzs7O0dBSUc7QUFDSSxNQUFNLG9CQUFvQixHQUFHLENBQUMsTUFBaUMsRUFBdUMsRUFBRTtJQUM3RyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtJQUNyRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzNCLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsU0FBUztZQUFFLFNBQVE7UUFDeEIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzQyxNQUFNLEtBQUssR0FDVCxDQUFDLFFBQVE7WUFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMzRixJQUFJLEtBQUs7WUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBQ0QsT0FBTyxXQUFXLENBQUE7QUFDcEIsQ0FBQyxDQUFBO0FBWlksUUFBQSxvQkFBb0Isd0JBWWhDIn0=