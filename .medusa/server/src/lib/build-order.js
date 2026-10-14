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
 * replacement never collides with the original shipment. `prefix` keeps
 * environments sharing one ODM account apart (dev sends `DEV-1234`).
 */
const orderReference = (order, resendClaimId, prefix = "") => {
    const base = String(order.display_id ?? order.id ?? "").trim();
    if (!base)
        throw new OrderBuildError("Order has neither a display id nor an id");
    return `${prefix}${resendClaimId ? `${base}-R-${resendClaimId.slice(-8)}` : base}`;
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
/** Physical units one variant unit consumes, across all its inventory items. */
const unitsPerVariant = (line) => {
    const units = (line?.variant?.inventory_items ?? []).reduce((sum, link) => {
        const required = (0, exports.toNumber)(link?.required_quantity ?? 1);
        return sum + (Number.isFinite(required) && required > 0 ? required : 1);
    }, 0);
    return units > 0 ? units : 1;
};
const buildOrderDispatchOrder = ({ order, items, resendClaimId, referencePrefix = "", }) => {
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
        // Medusa fulfils `required_quantity × ordered` of each item, so a kit
        // arrives as 10 vials: price, discount and weight are per physical unit.
        const perVariant = unitsPerVariant(line);
        const lineQuantity = (0, exports.toNumber)(line?.quantity);
        const discount = (0, exports.toNumber)(line?.discount_total);
        const grams = (0, exports.toNumber)(line?.variant?.weight) / perVariant;
        return {
            Sku: sku,
            Title: text(item.title) || text(line?.title) || sku,
            Quantity: quantity,
            RetailPrice: money((0, exports.toNumber)(line?.unit_price) / perVariant),
            DiscountAmount: lineQuantity > 0 && Number.isFinite(discount) ? money((discount * quantity) / (lineQuantity * perVariant)) : 0,
            ...(Number.isFinite(grams) && grams > 0 ? { Weight: Math.round(grams) / 1000 } : {}),
            ...(item.line_item_id ? { LineItemId: item.line_item_id } : {}),
        };
    });
    const reference = (0, exports.orderReference)(order, resendClaimId, referencePrefix);
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