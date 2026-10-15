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
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_stockItems, _OrderDispatchFulfillmentService_countries, _OrderDispatchFulfillmentService_countryName, _OrderDispatchFulfillmentService_resolveStockItems;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../../constants");
const build_order_1 = require("../../lib/build-order");
const orderdispatch_client_1 = require("../../lib/orderdispatch-client");
const country_1 = require("../../lib/country");
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
        _OrderDispatchFulfillmentService_stockItems.set(this, new Map());
        _OrderDispatchFulfillmentService_countries.set(this, void 0);
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
                shippingService: this.options_.shippingService,
            });
            const stockItems = await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_resolveStockItems).call(this, built.request.OrderItems.map((line) => line.Sku));
            const request = {
                ...built.request,
                OrderItems: built.request.OrderItems.map((line) => {
                    const stockItem = stockItems.get(line.Sku);
                    return { ...line, Sku: stockItem.Sku, StockItemId: stockItem.StockItemId };
                }),
                DeliveryAddress: {
                    ...built.request.DeliveryAddress,
                    Country: await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_countryName).call(this, built.request.DeliveryAddress.Country),
                },
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
_OrderDispatchFulfillmentService_stockItems = new WeakMap(), _OrderDispatchFulfillmentService_countries = new WeakMap(), _OrderDispatchFulfillmentService_instances = new WeakSet(), _OrderDispatchFulfillmentService_countryName = 
/** ODM's country name for an ISO code (its list is cached for a day). */
async function _OrderDispatchFulfillmentService_countryName(iso2) {
    const now = Date.now();
    if (!__classPrivateFieldGet(this, _OrderDispatchFulfillmentService_countries, "f") || now - __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_countries, "f").fetchedAt > 24 * 60 * 60_000) {
        __classPrivateFieldSet(this, _OrderDispatchFulfillmentService_countries, { names: await this.client_.getCountries(), fetchedAt: now }, "f");
    }
    const name = (0, country_1.odmCountryName)(iso2, __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_countries, "f").names);
    if (!name)
        throw new build_order_1.OrderBuildError(`OrderDispatch doesn't list the delivery country ${iso2}`);
    return name;
}, _OrderDispatchFulfillmentService_resolveStockItems = 
/**
 * The ODM stock item (exact SKU + StockItemId) for each Medusa SKU. Every SKU
 * must exist in ODM, plain or with the company prefix, or the order would
 * land there unpickable — so a missing one fails the fulfilment instead.
 */
async function _OrderDispatchFulfillmentService_resolveStockItems(skus) {
    const now = Date.now();
    const resolved = new Map();
    const missing = [];
    for (const sku of new Set(skus)) {
        const cached = __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_stockItems, "f").get(sku);
        if (cached && now - cached.fetchedAt <= this.options_.skuCacheMs) {
            resolved.set(sku, cached.item);
            continue;
        }
        const item = (0, sku_1.matchOdmStockItem)(sku, await this.client_.searchStockItems(sku), this.options_.skuPrefix);
        if (!item) {
            missing.push(sku);
            continue;
        }
        __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_stockItems, "f").set(sku, { item, fetchedAt: now });
        resolved.set(sku, item);
    }
    if (missing.length) {
        throw new build_order_1.OrderBuildError(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set up in OrderDispatch — add ${missing.length === 1 ? "it" : "them"} to OrderDispatch inventory first`);
    }
    return resolved;
};
OrderDispatchFulfillmentService.identifier = constants_1.ORDERDISPATCH_IDENTIFIER;
exports.default = OrderDispatchFulfillmentService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBVTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIseUVBQXdGO0FBQ3hGLCtDQUFrRDtBQUNsRCx1Q0FBb0U7QUFDcEUsdUNBSWtCO0FBSWxCOzs7OztHQUtHO0FBQ0gsTUFBTSwrQkFBZ0MsU0FBUSwwQ0FBa0M7SUFTOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFnQztRQUNyRCxJQUFBLHFDQUEyQixFQUFDLE9BQWdELENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsWUFBWSxFQUFFLE1BQU0sRUFBd0IsRUFBRSxPQUFxQztRQUNqRixLQUFLLEVBQUUsQ0FBQTs7UUFSQSxzREFBYyxJQUFJLEdBQUcsRUFBK0QsRUFBQTtRQUM3Riw2REFBc0U7UUFRcEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFBLHFDQUEyQixFQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDekIsT0FBTyw2Q0FBaUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUMzQixVQUFtQyxFQUNuQyxJQUE2QjtRQUU3QixPQUFPLEVBQUUsR0FBRyxVQUFVLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFD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