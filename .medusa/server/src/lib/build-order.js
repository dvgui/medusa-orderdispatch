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
        // bignumber.js, e.g. MathBN.mult(required_quantity, quantity) on the
        // fulfillment lines Medusa hands the provider.
        const toNum = value.toNumber;
        if (typeof toNum === "function")
            return Number(toNum.call(value));
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
/** A short, safe description of a value for error messages. */
const describe = (value) => {
    const kind = value === null ? "null" : typeof value;
    const name = value && typeof value === "object" ? value.constructor?.name : undefined;
    let json = "";
    try {
        json = JSON.stringify(value) ?? "";
    }
    catch {
        json = "[unserialisable]";
    }
    return `${kind}${name && name !== "Object" ? ` ${name}` : ""} ${json.slice(0, 120)}`.trim();
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
    // Every field, empty when unknown (see DeliveryAddress). Country stays the
    // ISO code here; the provider swaps in ODM's country name.
    return {
        FullName: fullName,
        Email: text(order.email),
        Phone: text(a?.phone),
        Company: text(a?.company),
        Address1: text(a?.address_1),
        Address2: text(a?.address_2),
        Address3: "",
        Town: text(a?.city),
        Region: text(a?.province),
        PostCode: text(a?.postal_code),
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
const buildOrderDispatchOrder = ({ order, items, resendClaimId, referencePrefix = "", shippingService = "StandardDelivery", }) => {
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
            throw new OrderBuildError(`${sku} has an invalid quantity (${describe(item.quantity)})`);
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
    const subSource = text(order.metadata?.storefront) || "unknown";
    const createdAt = order.created_at ? new Date(order.created_at) : undefined;
    return {
        reference,
        subSource,
        request: {
            OrderItems: lines,
            // No BillingAddress: ODM's own Create Order screen doesn't send one.
            DeliveryAddress: address,
            ShippingDetails: {
                ShippingService: shippingService,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtb3JkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL2J1aWxkLW9yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBOzs7Ozs7O0dBT0c7QUFFSCx3RUFBd0U7QUFDakUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFjLEVBQVUsRUFBRTtJQUNqRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQTtJQUMzQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFBRSxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRCxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxxRUFBcUU7UUFDckUsK0NBQStDO1FBQy9DLE1BQU0sS0FBSyxHQUFJLEtBQWdDLENBQUMsUUFBUSxDQUFBO1FBQ3hELElBQUksT0FBTyxLQUFLLEtBQUssVUFBVTtZQUFFLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLE9BQU8sR0FBSSxLQUErQixDQUFDLE9BQU8sQ0FBQTtRQUN4RCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVE7WUFBRSxPQUFPLE9BQU8sQ0FBQTtRQUMvQyxJQUFJLE9BQU8sSUFBSSxLQUFLO1lBQUUsT0FBTyxNQUFNLENBQUUsS0FBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFBO0FBQ25CLENBQUMsQ0FBQTtBQWJZLFFBQUEsUUFBUSxZQWFwQjtBQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsS0FBYyxFQUFVLEVBQUU7SUFDdkMsTUFBTSxDQUFDLEdBQUcsSUFBQSxnQkFBUSxFQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pCLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMs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