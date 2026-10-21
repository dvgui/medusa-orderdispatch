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
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_stockItems, _OrderDispatchFulfillmentService_countries, _OrderDispatchFulfillmentService_rates, _OrderDispatchFulfillmentService_createOrAdopt, _OrderDispatchFulfillmentService_ratesFor, _OrderDispatchFulfillmentService_countryName, _OrderDispatchFulfillmentService_resolveStockItems;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../../constants");
const build_order_1 = require("../../lib/build-order");
const adopt_order_1 = require("../../lib/adopt-order");
const orderdispatch_client_1 = require("../../lib/orderdispatch-client");
const country_1 = require("../../lib/country");
const sku_1 = require("../../lib/sku");
const rates_1 = require("../../lib/rates");
const options_1 = require("./options");
/**
 * OrderDispatch (ODM) 3PL. `createFulfillment` pushes the order to ODM when an
 * admin fulfils it; ODM's own shipping rules pick the courier. Dispatch and
 * tracking come back through the `orderdispatch-tracking` job, which marks the
 * order shipped with `createOrderShipmentWorkflow`.
 */
const optionFor = (id) => constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS.find((option) => option.id === id);
class OrderDispatchFulfillmentService extends utils_1.AbstractFulfillmentProviderService {
    static validateOptions(options) {
        (0, options_1.resolveOrderDispatchOptions)(options);
    }
    constructor({ logger }, options) {
        super();
        _OrderDispatchFulfillmentService_instances.add(this);
        _OrderDispatchFulfillmentService_stockItems.set(this, new Map());
        _OrderDispatchFulfillmentService_countries.set(this, void 0);
        _OrderDispatchFulfillmentService_rates.set(this, new Map());
        this.logger_ = logger;
        this.options_ = (0, options_1.resolveOrderDispatchOptions)(options);
        this.client_ = new orderdispatch_client_1.OrderDispatchClient(this.options_);
    }
    async getFulfillmentOptions() {
        return constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS.map(({ id, name }) => ({ id, name }));
    }
    async validateFulfillmentData(optionData, data) {
        return { ...optionData, ...data };
    }
    async validateOption(data) {
        return constants_1.ORDERDISPATCH_FULFILLMENT_OPTIONS.some((option) => option.id === data.id);
    }
    /** The international options are priced live from ODM's DDP rates. */
    async canCalculate(option) {
        return Boolean(optionFor(option.data?.id)?.rate);
    }
    /**
     * ODM's DDP rate for the delivery country and parcel weight, plus the
     * markup. GBP and tax-exclusive, like the store's flat options.
     */
    async calculatePrice(optionData, _data, context) {
        const option = optionFor(optionData.id);
        if (!option?.rate) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, `OrderDispatch option ${String(optionData.id)} has a flat price`);
        }
        const country = context.shipping_address?.country_code?.trim().toUpperCase();
        if (!country) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Enter a delivery address to see the shipping price");
        }
        const kg = (0, rates_1.parcelWeightKg)(context.items, this.options_.packagingGrams);
        const rate = (0, rates_1.pickRate)(await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_ratesFor).call(this, country, kg), option.rate);
        if (!rate) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.NOT_ALLOWED, `${option.name} doesn't deliver to ${country}`);
        }
        return {
            calculated_amount: (0, rates_1.withMarkup)(rate.Price, this.options_.rateMarkupPercent),
            is_calculated_price_tax_inclusive: false,
        };
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
                    // The warehouse picks by ODM's own item name, so the line carries it
                    // (some items are named by warehouse code, e.g. "TR10", not by product).
                    return {
                        ...line,
                        Sku: stockItem.Sku,
                        StockItemId: stockItem.StockItemId,
                        Title: stockItem.Title?.trim() || line.Title,
                    };
                }),
                DeliveryAddress: {
                    ...built.request.DeliveryAddress,
                    Country: await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_countryName).call(this, built.request.DeliveryAddress.Country),
                },
            };
            // ODM's rules read the customer's Express choice from the SubSource.
            const subSource = `${built.subSource}${optionFor(data.id)?.subSourceSuffix ?? ""}`;
            const created = await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_createOrAdopt).call(this, request, built.reference, subSource);
            this.logger_.info(`[orderdispatch] pushed ${built.reference} (${subSource}) as ODM order ${created.orderNumber}`);
            const pushed = {
                odOrderNumber: created.orderNumber,
                odReference: built.reference,
                odSubSource: subSource,
                odPushedAt: new Date().toISOString(),
                ...(created.adoptedAfter ? { odAdoptedAfter: created.adoptedAfter } : {}),
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
_OrderDispatchFulfillmentService_stockItems = new WeakMap(), _OrderDispatchFulfillmentService_countries = new WeakMap(), _OrderDispatchFulfillmentService_rates = new WeakMap(), _OrderDispatchFulfillmentService_instances = new WeakSet(), _OrderDispatchFulfillmentService_createOrAdopt = 
/**
 * CreateOrder — or, when ODM answers with an error but saved the order anyway
 * (see findAdoptableOrder), the open order it holds for this push.
 */
async function _OrderDispatchFulfillmentService_createOrAdopt(request, reference, subSource) {
    const { source } = this.options_;
    try {
        return { orderNumber: (await this.client_.createOrder(request, { source, subSource })).OrderNumber };
    }
    catch (error) {
        if (!(error instanceof orderdispatch_client_1.OrderDispatchError))
            throw error;
        let adopted;
        try {
            adopted = (0, adopt_order_1.findAdoptableOrder)(await this.client_.getOpenOrders(), {
                reference,
                source,
                subSource,
                lines: request.OrderItems,
            });
        }
        catch (lookupError) {
            const reason = lookupError instanceof Error ? lookupError.message : String(lookupError);
            this.logger_.warn(`[orderdispatch] could not check ODM's open orders for ${reference}: ${reason}`);
        }
        if (!adopted)
            throw error;
        this.logger_.warn(`[orderdispatch] ODM answered "${error.message}" but holds open order ${adopted.NumOrderId} for ${reference}; adopting it`);
        return { orderNumber: String(adopted.NumOrderId), adoptedAfter: error.message };
    }
}, _OrderDispatchFulfillmentService_ratesFor = 
/** ODM's rates for a country and weight, cached so checkout doesn't hammer ODM. */
async function _OrderDispatchFulfillmentService_ratesFor(country, kg) {
    const key = `${country}:${kg}`;
    const cached = __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_rates, "f").get(key);
    if (cached && Date.now() - cached.fetchedAt <= this.options_.rateCacheMs)
        return cached.rates;
    const rates = await this.client_.getShippingRates(country, kg);
    __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_rates, "f").set(key, { rates, fetchedAt: Date.now() });
    return rates;
}, _OrderDispatchFulfillmentService_countryName = 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBYTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIsdURBQTBEO0FBQzFELHlFQUF3RjtBQUN4RiwrQ0FBa0Q7QUFDbEQsdUNBQW9FO0FBQ3BFLDJDQUFzRTtBQUV0RSx1Q0FJa0I7QUFJbEI7Ozs7O0dBS0c7QUFDSCxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVcsRUFBRSxFQUFFLENBQUMsNkNBQWlDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FLekYsQ0FBQTtBQUViLE1BQU0sK0JBQWdDLFNBQVEsMENBQWtDO0lBVTlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBZ0M7UUFDckQsSUFBQSxxQ0FBMkIsRUFBQyxPQUFnRCxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELFlBQVksRUFBRSxNQUFNLEVBQXdCLEVBQUUsT0FBcUM7UUFDakYsS0FBSyxFQUFFLENBQUE7O1FBVEEsc0RBQWMsSUFBSSxHQUFHLEVBQStELEVBQUE7UUFDN0YsNkRBQXNFO1FBQzdELGlEQUFTLElBQUksR0FBRyxFQUEyRSxFQUFBO1FBUWxHLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBQSxxQ0FBMkIsRUFBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksMENBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3pCLE9BQU8sNkNBQWlDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxF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