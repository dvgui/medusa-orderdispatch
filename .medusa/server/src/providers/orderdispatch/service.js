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
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_stockItems, _OrderDispatchFulfillmentService_countries, _OrderDispatchFulfillmentService_rates, _OrderDispatchFulfillmentService_ratesFor, _OrderDispatchFulfillmentService_countryName, _OrderDispatchFulfillmentService_resolveStockItems;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const constants_1 = require("../../constants");
const build_order_1 = require("../../lib/build-order");
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
                    return { ...line, Sku: stockItem.Sku, StockItemId: stockItem.StockItemId };
                }),
                DeliveryAddress: {
                    ...built.request.DeliveryAddress,
                    Country: await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_countryName).call(this, built.request.DeliveryAddress.Country),
                },
            };
            // ODM's rules read the customer's Express choice from the SubSource.
            const subSource = `${built.subSource}${optionFor(data.id)?.subSourceSuffix ?? ""}`;
            const created = await this.client_.createOrder(request, { source: this.options_.source, subSource });
            this.logger_.info(`[orderdispatch] pushed ${built.reference} (${subSource}) as ODM order ${created.OrderNumber}`);
            const pushed = {
                odOrderNumber: created.OrderNumber,
                odReference: built.reference,
                odSubSource: subSource,
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
_OrderDispatchFulfillmentService_stockItems = new WeakMap(), _OrderDispatchFulfillmentService_countries = new WeakMap(), _OrderDispatchFulfillmentService_rates = new WeakMap(), _OrderDispatchFulfillmentService_instances = new WeakSet(), _OrderDispatchFulfillmentService_ratesFor = 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBYTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIseUVBQXdGO0FBQ3hGLCtDQUFrRDtBQUNsRCx1Q0FBb0U7QUFDcEUsMkNBQXNFO0FBRXRFLHVDQUlrQjtBQUlsQjs7Ozs7R0FLRztBQUNILE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBVyxFQUFFLEVBQUUsQ0FBQyw2Q0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUt6RixDQUFBO0FBRWIsTUFBTSwrQkFBZ0MsU0FBUSwwQ0FBa0M7SUFVOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFnQztRQUNyRCxJQUFBLHFDQUEyQixFQUFDLE9BQWdELENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsWUFBWSxFQUFFLE1BQU0sRUFBd0IsRUFBRSxPQUFxQztRQUNqRixLQUFLLEVBQUUsQ0FBQTs7UUFUQSxzREFBYyxJQUFJLEdBQUcsRUFBK0QsRUFBQTtRQUM3Riw2REFBc0U7UUFDN0QsaURBQVMsSUFBSSxHQUFHLEVBQTJFLEVBQUE7UUFRbEcsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFBLHFDQUEyQixFQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDekIsT0FBTyw2Q0FBaUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJ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