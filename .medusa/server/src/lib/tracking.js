"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexProcessedOrders = exports.courierFor = void 0;
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
    { match: /hermes|\bevri\b/i, name: "Evri", url: (n) => `https://www.evri.com/track/parcel/${n}/details` },
    { match: /fedex/i, name: "FedEx", url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
];
/** Courier display name and tracking URL for an ODM service name. */
const courierFor = (serviceName, trackingNumber) => {
    const service = (serviceName ?? "").trim();
    const number = (trackingNumber ?? "").trim();
    const known = COURIERS.find((c) => c.match.test(service));
    const encoded = encodeURIComponent(number);
    if (known)
        return { courier: known.name, trackingUrl: number ? known.url(encoded) : null };
    // ODM has no public tracking page; the number alone is shown.
    return { courier: service || "OrderDispatch", trackingUrl: null };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2tpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3RyYWNraW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBOzs7O0dBSUc7QUFDSCxNQUFNLFFBQVEsR0FBeUY7SUFDckcsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHVEQUF1RCxDQUFDLEVBQUUsRUFBRTtJQUN6SCxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLCtEQUErRCxDQUFDLEVBQUUsRUFBRTtJQUM5SCxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRTtJQUN0RixFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDREQUE0RCxDQUFDLEVBQUUsRUFBRTtJQUMvRyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMscUNBQXFDLENBQUMsVUFBVSxFQUFFO0lBQ3pHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsNENBQTRDLENBQUMsRUFBRSxFQUFFO0NBQ2hHLENBQUE7QUFJRCxxRUFBcUU7QUFDOUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxXQUFzQyxFQUFFLGNBQThCLEVBQWUsRUFBRTtJQUNoSCxNQUFNLE9BQU8sR0FBRyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMxQyxNQUFNLE1BQU0sR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM1QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3pELE1BQU0sT0FBTyxHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLElBQUksS0FBSztRQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMxRiw4REFBOEQ7SUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLElBQUksZUFBZSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUNuRSxDQUFDLENBQUE7QUFSWSxRQUFBLFVBQVUsY0FRdEI7QUFFRDs7OztHQUlHO0FBQ0ksTUFBTSxvQkFBb0IsR0FBRyxDQUFDLE1BQWlDLEVBQXVDLEVBQUU7SUFDN0csTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUE7SUFDckQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMzQixNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVM7WUFBRSxTQUFRO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0MsTUFBTSxLQUFLLEdBQ1QsQ0FBQyxRQUFRO1lBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUE7UUFDM0YsSUFBSSxLQUFLO1lBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUNELE9BQU8sV0FBVyxDQUFBO0FBQ3BCLENBQUMsQ0FBQTtBQVpZLFFBQUEsb0JBQW9CLHdCQVloQyJ9