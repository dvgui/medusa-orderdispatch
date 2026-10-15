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
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_stockItems, _OrderDispatchFulfillmentService_resolveSkus;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../../constants");
const build_order_1 = require("../../lib/build-order");
const orderdispatch_client_1 = require("../../lib/orderdispatch-client");
const sku_1 = require("../../lib/sku");
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
        _OrderDispatchFulfillmentService_stockItems.set(this, void 0);
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
            const odmSku = await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_resolveSkus).call(this, built.request.OrderItems.map((line) => line.Sku));
            const request = {
                ...built.request,
                OrderItems: built.request.OrderItems.map((line) => ({ ...line, Sku: odmSku.get(line.Sku) ?? line.Sku })),
            };
            const created = await this.client_.createOrder(request, {
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
_OrderDispatchFulfillmentService_stockItems = new WeakMap(), _OrderDispatchFulfillmentService_instances = new WeakSet(), _OrderDispatchFulfillmentService_resolveSkus = 
/**
 * The ODM stock item for each Medusa SKU. Every SKU must exist in ODM (plain
 * or with the company prefix), or the order lands there unpickable.
 */
async function _OrderDispatchFulfillmentService_resolveSkus(skus) {
    const prefix = this.options_.skuPrefix;
    if (!this.options_.checkSkus)
        return new Map(skus.map((sku) => [sku, (0, sku_1.odmSkuFor)(sku, prefix)]));
    const now = Date.now();
    if (!__classPrivateFieldGet(this, _OrderDispatchFulfillmentService_stockItems, "f") || now - __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_stockItems, "f").fetchedAt > this.options_.skuCacheMs) {
        const levels = await this.client_.getStockLevels();
        __classPrivateFieldSet(this, _OrderDispatchFulfillmentService_stockItems, { itemNumbers: levels.map((l) => l.ItemNumber), fetchedAt: now }, "f");
    }
    const { resolved, missing } = (0, sku_1.resolveOdmSkus)(skus, __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_stockItems, "f").itemNumbers, prefix);
    if (missing.length) {
        throw new build_order_1.OrderBuildError(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set up in OrderDispatch — add ${missing.length === 1 ? "it" : "them"} to OrderDispatch inventory first`);
    }
    return resolved;
};
OrderDispatchFulfillmentService.identifier = constants_1.ORDERDISPATCH_IDENTIFIER;
exports.default = OrderDispatchFulfillmentService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBVTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIseUVBQXdGO0FBQ3hGLHVDQUF5RDtBQUN6RCx1Q0FJa0I7QUFJbEI7Ozs7O0dBS0c7QUFDSCxNQUFNLCtCQUFnQyxTQUFRLDBDQUFrQztJQVE5RSxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQWdDO1FBQ3JELElBQUEscUNBQTJCLEVBQUMsT0FBZ0QsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxZQUFZLEVBQUUsTUFBTSxFQUF3QixFQUFFLE9BQXFDO1FBQ2pGLEtBQUssRUFBRSxDQUFBOztRQVBULDhEQUE2RTtRQVEzRSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUEscUNBQTJCLEVBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLDBDQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUN6QixPQUFPLDZDQUFpQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQzNCLFVBQW1DLEVBQ25DLElBQTZCO1FBRTdCLE9BQU8sRUFBRSxHQUFHLFVBQVUsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQTZCO1FBQ2hELE9BQU8sNkNBQWlDLENBQUMsSUFBSSxD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