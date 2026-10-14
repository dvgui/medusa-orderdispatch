"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_knownSkus, _OrderDispatchFulfillmentService_assertSkusKnown;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../../constants");
const build_order_1 = require("../../lib/build-order");
const orderdispatch_client_1 = require("../../lib/orderdispatch-client");
const options_1 = require("./options");
/**
 * OrderDispatch (ODM) 3PL. `createFulfillment` pushes the order to ODM when an
 * admin fulfils it; ODM's own shipping rules pick the courier. Dispatch and
 * tracking come back through the `orderdispatch-tracking` job, which marks the
 * order shipped with `createOrderShipmentWorkflow`.
 */
class OrderDispatchFulfillmentService extends utils_1.AbstractFulfillmentProviderService {
    static validateOptions(options) {
        (0, options_1.resolveOrderDispatchOptions)(options);
    }
    constructor({ logger }, options) {
        super();
        _OrderDispatchFulfillmentService_instances.add(this);
        _OrderDispatchFulfillmentService_knownSkus.set(this, void 0);
        this.logger_ = logger;
        this.options_ = (0, options_1.resolveOrderDispatchOptions)(options);
        this.client_ = new orderdispatch_client_1.OrderDispatchClient(this.options_);
    }
    async getFulfillmentOptions() {
        return constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS.map((option) => ({ ...option }));
    }
    async validateFulfillmentData(optionData, data) {
        return { ...optionData, ...data };
    }
    async validateOption(data) {
        return constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS.some((option) => option.id === data.id);
    }
    async canCalculate() {
        return false;
    }
    async createFulfillment(data, items, order, fulfillment) {
        const existing = data;
        if (existing.odOrderNumber) {
            // A retried workflow must not create a second ODM order.
            return { data, labels: [] };
        }
        if (!order) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "OrderDispatch needs the order to push it");
        }
        const resendClaimId = fulfillment.metadata?.resend_claim_id;
        try {
            const built = (0, build_order_1.buildOrderDispatchOrder)({
                order: order,
                items: items,
                resendClaimId: typeof resendClaimId === "string" ? resendClaimId : null,
                referencePrefix: this.options_.referencePrefix,
            });
            await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_assertSkusKnown).call(this, built.request.OrderItems.map((line) => line.Sku));
            const created = await this.client_.createOrder(built.request, {
                source: this.options_.source,
                subSource: built.subSource,
            });
            this.logger_.info(`[orderdispatch] pushed ${built.reference} (${built.subSource}) as ODM order ${created.OrderNumber}`);
            const pushed = {
                odOrderNumber: created.OrderNumber,
                odReference: built.reference,
                odSubSource: built.subSource,
                odPushedAt: new Date().toISOString(),
            };
            return { data: { ...data, ...pushed }, labels: [] };
        }
        catch (error) {
            if (error instanceof build_order_1.OrderBuildError || error instanceof orderdispatch_client_1.OrderDispatchError) {
                this.logger_.error(`[orderdispatch] push failed for order ${order.display_id ?? order.id}: ${error.message}`);
                // INVALID_DATA reaches the admin's fulfil dialog with the reason.
                throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, `OrderDispatch: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * ODM has no cancel API. Medusa's cancel still goes ahead; the app's
     * `order.fulfillment_canceled` subscriber alerts someone to cancel the ODM
     * order in its dashboard before it is picked.
     */
    async cancelFulfillment(data) {
        const { odOrderNumber, odReference } = data;
        if (odOrderNumber) {
            this.logger_.warn(`[orderdispatch] fulfillment for ${odReference} cancelled in Medusa — cancel ODM order ${odOrderNumber} in the OrderDispatch dashboard`);
        }
        return { ...data, odCancelRequested: Boolean(odOrderNumber) };
    }
    async createReturnFulfillment() {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.NOT_ALLOWED, "OrderDispatch returns go through the OrderDispatch returns portal, not Medusa");
    }
}
_OrderDispatchFulfillmentService_knownSkus = new WeakMap(), _OrderDispatchFulfillmentService_instances = new WeakSet(), _OrderDispatchFulfillmentService_assertSkusKnown = 
/** Every SKU must exist in ODM, or the order lands there unpickable. */
async function _OrderDispatchFulfillmentService_assertSkusKnown(skus) {
    if (!this.options_.checkSkus)
        return;
    const now = Date.now();
    if (!__classPrivateFieldGet(this, _OrderDispatchFulfillmentService_knownSkus, "f") || now - __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_knownSkus, "f").fetchedAt > this.options_.skuCacheMs) {
        const levels = await this.client_.getStockLevels();
        __classPrivateFieldSet(this, _OrderDispatchFulfillmentService_knownSkus, { skus: new Set(levels.map((l) => l.ItemNumber.trim().toUpperCase())), fetchedAt: now }, "f");
    }
    const known = __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_knownSkus, "f").skus;
    const missing = [...new Set(skus)].filter((sku) => !known.has(sku.toUpperCase()));
    if (missing.length) {
        throw new build_order_1.OrderBuildError(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set up in OrderDispatch — add ${missing.length === 1 ? "it" : "them"} to OrderDispatch inventory first`);
    }
};
OrderDispatchFulfillmentService.identifier = constants_1.ORDERDISPATCH_IDENTIFIER;
exports.default = OrderDispatchFulfillmentService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBVTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIseUVBQXdGO0FBQ3hGLHVDQUlrQjtBQUlsQjs7Ozs7R0FLRztBQUNILE1BQU0sK0JBQWdDLFNBQVEsMENBQWtDO0lBUTlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBZ0M7UUFDckQsSUFBQSxxQ0FBMkIsRUFBQyxPQUFnRCxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELFlBQVksRUFBRSxNQUFNLEVBQXdCLEVBQUUsT0FBcUM7UUFDakYsS0FBSyxFQUFFLENBQUE7O1FBUFQsNkRBQXVFO1FBUXJFLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBQSxxQ0FBMkIsRUFBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksMENBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3pCLE9BQU8sNkNBQWlDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FDM0IsVUFBbUMsRUFDbkMsSUFBNkI7UUFFN0IsT0FBTyxFQUFFLEdBQUcsVUFBVSxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBNkI7UUFDaEQsT0FBTyw2Q0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFN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