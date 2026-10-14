"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrderDispatchOrder = exports.orderReference = exports.OrderBuildError = exports.toNumber = void 0;
/**
 * Turns the order and fulfillment Medusa hands a fulfillment provider into an
 * ODM CreateOrder request. Pure — no I/O — so it is unit-tested directly.
 *
 * The fulfillment lines already carry the warehouse SKU: Medusa copies the
 * inventory item's `sku` onto each line (core-flows create-fulfillment), and
 * every physical product has one inventory item named by its warehouse SKU.
 */
/** Medusa amounts arrive as numbers, strings or BigNumber instances. */
const toNumber = (value) => {
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    if (value && typeof value === "object") {
        const numeric = value.numeric;
        if (typeof numeric === "number")
            return numeric;
        if ("value" in value)
            return Number(value.value);
    }
    return Number.NaN;
};
exports.toNumber = toNumber;
const money = (value) => {
    const n = (0, exports.toNumber)(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const text = (value) => (typeof value === "string" ? value.trim() : "");
class OrderBuildError extends Error {
    constructor(message) {
        super(message);
        this.name = "OrderBuildError";
    }
}
exports.OrderBuildError = OrderBuildError;
/**
 * The ReferenceNumber processed orders are matched back by. Resends get the
 * same `<display>-R-<claim tail>` shape the Royal Mail integration uses, so a
 * replacement never collides with the original shipment.
 */
const orderReference = (order, resendClaimId) => {
    const base = String(order.display_id ?? order.id ?? "").trim();
    if (!base)
        throw new OrderBuildError("Order has neither a display id nor an id");
    return resendClaimId ? `${base}-R-${resendClaimId.slice(-8)}` : base;
};
exports.orderReference = orderReference;
const deliveryAddress = (order) => {
    const a = order.shipping_address;
    const fullName = [text(a?.first_name), text(a?.last_name)].filter(Boolean).join(" ");
    const missing = [
        !fullName && "name",
        !text(a?.address_1) && "address line 1",
        !text(a?.city) && "town",
        !text(a?.postal_code) && "postcode",
        !text(a?.country_code) && "country",
    ].filter(Boolean);
    if (missing.length) {
        throw new OrderBuildError(`Shipping address is missing ${missing.join(", ")}`);
    }
    return {
        FullName: fullName,
        Email: text(order.email) || undefined,
        Phone: text(a?.phone) || undefined,
        Company: text(a?.company) || undefined,
        Address1: text(a?.address_1),
        Address2: text(a?.address_2) || undefined,
        Town: text(a?.city),
        PostCode: text(a?.postal_code),
        Region: text(a?.province) || undefined,
        Country: text(a?.country_code).toUpperCase(),
    };
};
const buildOrderDispatchOrder = ({ order, items, resendClaimId, }) => {
    if (!items.length)
        throw new OrderBuildError("Fulfillment has no items");
    const orderItems = new Map((order.items ?? []).map((i) => [i.id, i]));
    const isResend = Boolean(resendClaimId);
    const lines = items.map((item) => {
        const sku = text(item.sku);
        const label = text(item.title) || item.line_item_id || "item";
        if (!sku)
            throw new OrderBuildError(`${label} has no SKU`);
        const quantity = (0, exports.toNumber)(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new OrderBuildError(`${sku} has an invalid quantity`);
        }
        const line = item.line_item_id ? orderItems.get(item.line_item_id) : undefined;
        const grams = (0, exports.toNumber)(line?.variant?.weight);
        return {
            Sku: sku,
            Title: text(item.title) || text(line?.title) || sku,
            Quantity: quantity,
            RetailPrice: money(line?.unit_price),
            DiscountAmount: money(line?.discount_total),
            ...(Number.isFinite(grams) && grams > 0 ? { Weight: Math.round(grams) / 1000 } : {}),
            ...(item.line_item_id ? { LineItemId: item.line_item_id } : {}),
        };
    });
    const reference = (0, exports.orderReference)(order, resendClaimId);
    const address = deliveryAddress(order);
    const { Email: _email, Address3: _address3, ...billing } = address;
    const subSource = text(order.metadata?.storefront) || "unknown";
    const createdAt = order.created_at ? new Date(order.created_at) : undefined;
    return {
        reference,
        subSource,
        request: {
            OrderItems: lines,
            DeliveryAddress: address,
            // The provider is not given the billing address; ODM only needs one for
            // its records, and the parcel goes to the delivery address.
            BillingAddress: billing,
            ShippingDetails: {
                ReferenceNumber: reference,
                ShippingCost: isResend ? 0 : money(order.shipping_total),
            },
            PaymentStatus: "PAID",
            ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { OrderDate: createdAt.toISOString() } : {}),
            Currency: text(order.currency_code).toUpperCase() || undefined,
            OrderDiscount: isResend ? 0 : money(order.discount_total),
        },
    };
};
exports.buildOrderDispatchOrder = buildOrderDispatchOrder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtb3JkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL2J1aWxkLW9yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBOzs7Ozs7O0dBT0c7QUFFSCx3RUFBd0U7QUFDakUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFjLEVBQVUsRUFBRTtJQUNqRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQTtJQUMzQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFBRSxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRCxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxNQUFNLE9BQU8sR0FBSSxLQUErQixDQUFDLE9BQU8sQ0FBQTtRQUN4RCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVE7WUFBRSxPQUFPLE9BQU8sQ0FBQTtRQUMvQyxJQUFJLE9BQU8sSUFBSSxLQUFLO1lBQUUsT0FBTyxNQUFNLENBQUUsS0FBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFBO0FBQ25CLENBQUMsQ0FBQTtBQVRZLFFBQUEsUUFBUSxZQVNwQjtBQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsS0FBYyxFQUFVLEVBQUU7SUFDdkMsTUFBTSxDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pCLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDM0QsQ0FBQyxDQUFBO0FBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFjLEVBQVUsRUFBRSxDQUFDLENBQUMsT0FB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