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
var _OrderDispatchFulfillmentService_instances, _OrderDispatchFulfillmentService_stockItems, _OrderDispatchFulfillmentService_countries, _OrderDispatchFulfillmentService_countryName, _OrderDispatchFulfillmentService_resolveSkus;
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
        _OrderDispatchFulfillmentService_stockItems.set(this, void 0);
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
            const odmSku = await __classPrivateFieldGet(this, _OrderDispatchFulfillmentService_instances, "m", _OrderDispatchFulfillmentService_resolveSkus).call(this, built.request.OrderItems.map((line) => line.Sku));
            const request = {
                ...built.request,
                OrderItems: built.request.OrderItems.map((line) => ({ ...line, Sku: odmSku.get(line.Sku) ?? line.Sku })),
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
}, _OrderDispatchFulfillmentService_resolveSkus = 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvb3JkZXJkaXNwYXRjaC9zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEscURBQTJGO0FBVTNGLCtDQUl3QjtBQUN4Qix1REFLOEI7QUFDOUIseUVBQXdGO0FBQ3hGLCtDQUFrRDtBQUNsRCx1Q0FBeUQ7QUFDekQsdUNBSWtCO0FBSWxCOzs7OztHQUtHO0FBQ0gsTUFBTSwrQkFBZ0MsU0FBUSwwQ0FBa0M7SUFTOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFnQztRQUNyRCxJQUFBLHFDQUEyQixFQUFDLE9BQWdELENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsWUFBWSxFQUFFLE1BQU0sRUFBd0IsRUFBRSxPQUFxQztRQUNqRixLQUFLLEVBQUUsQ0FBQTs7UUFSVCw4REFBNkU7UUFDN0UsNkRBQXNFO1FBUXBFLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBQSxxQ0FBMkIsRUFBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksMENBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3pCLE9BQU8sNkNBQWlDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FDM0IsVUFBbUMsRUFDbkMsSUFBNkI7UUFFN0IsT0FBTyxFQUFFLEdBQUcsVUFBVSxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBNkI7UUFDaEQsT0FBTyw2Q0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWTtRQUNoQixPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQ3JCLElBQTZCLEVBQzdCLEtBQXlELEVBQ3pELEtBQStDLEVBQy9DLFdBQTRFO1FBRTVFLE1BQU0sUUFBUSxHQUFHLElBQW9DLENBQUE7UUFDckQsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0IseURBQXlEO1lBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQzdCLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksbUJBQVcsQ0FBQyxtQkFBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsMENBQTBDLENBQUMsQ0FBQTtRQUNuRyxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUE7UUFDM0QsSUFBSSxDQUFDO1lBQ0gsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQ0FBdUIsRUFBQztnQkFDcEMsS0FBSyxFQUFFLEtBQWlDO2dCQUN4QyxLQUFLLEVBQUUsS0FBa0M7Z0JBQ3pDLGFBQWEsRUFBRSxPQUFPLGFBQWEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDdkUsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZTtnQkFDOUMsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZTthQUMvQyxDQUFDLENBQUE7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLHVCQUFBLElBQUksZ0dBQWEsTUFBakIsSUFBSSxFQUFjLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDeEYsTUFBTSxPQUFPLEdBQUc7Z0JBQ2QsR0FBRyxLQUFLLENBQUMsT0FBTztnQkFDaEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDeEcsZUFBZSxFQUFFO29CQUNmLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlO29CQUNoQyxPQUFPLEVBQUUsTUFBTSx1QkFBQSxJQUFJLGdHQUFhLE1BQWpCLElBQUksRUFBYyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7aUJBQ3hFO2FBQ0YsQ0FBQTtZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO2dCQUN0RCxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO2dCQUM1QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7YUFDM0IsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ2YsMEJBQTBCLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVMsa0JBQWtCLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FDckcsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUFpQztnQkFDM0MsYUFBYSxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dCQUNsQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzVCLFdBQVcsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDNUIsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3JDLENBQUE7WUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFDckQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixJQUFJLEtBQUssWUFBWSw2QkFBZSxJQUFJLEtBQUssWUFBWSx5Q0FBa0IsRUFBRSxDQUFDO2dCQUM1RSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUM3RyxrRUFBa0U7Z0JBQ2xFLE1BQU0sSUFBSSxtQkFBVyxDQUFDLG1CQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDMUYsQ0FBQztZQUNELE1BQU0sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQTZCO1FBQ25ELE1BQU0sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBb0MsQ0FBQTtRQUMzRSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUNmLG1DQUFtQyxXQUFXLDJDQUEyQyxhQUFhLGlDQUFpQyxDQUN4SSxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QjtRQUMzQixNQUFNLElBQUksbUJBQVcsQ0FDbkIsbUJBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUM3QiwrRUFBK0UsQ0FDaEYsQ0FBQTtJQUNILENBQUM7OztBQUVELHlFQUF5RTtBQUN6RSxLQUFLLHVEQUFjLElBQVk7SUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLElBQUksQ0FBQyx1QkFBQSxJQUFJLGtEQUFXLElBQUksR0FBRyxHQUFHLHVCQUFBLElBQUksa0RBQVcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUMzRSx1QkFBQSxJQUFJLDhDQUFjLEVBQUUsS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQUEsQ0FBQTtJQUNoRixDQUFDO0lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBQSx3QkFBYyxFQUFDLElBQUksRUFBRSx1QkFBQSxJQUFJLGtEQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEQsSUFBSSxDQUFDLElBQUk7UUFBRSxNQUFNLElBQUksNkJBQWUsQ0FBQyxtREFBbUQsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUMvRixPQUFPLElBQUksQ0FBQTtBQUNiLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxLQUFLLHVEQUFjLElBQXVCO0lBQ3hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFBO0lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVM7UUFBRSxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUEsZUFBUyxFQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDdEIsSUFBSSxDQUFDLHVCQUFBLElBQUksbURBQVksSUFBSSxHQUFHLEdBQUcsdUJBQUEsSUFBSSxtREFBWSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3JGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUNsRCx1QkFBQSxJQUFJLCtDQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQUEsQ0FBQTtJQUNyRixDQUFDO0lBQ0QsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFBLG9CQUFjLEVBQUMsSUFBSSxFQUFFLHVCQUFBLElBQUksbURBQVksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDeEYsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkIsTUFBTSxJQUFJLDZCQUFlLENBQ3ZCLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLHNDQUFzQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLG1DQUFtQyxDQUMxSyxDQUFBO0lBQ0gsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFBO0FBQ2pCLENBQUM7QUFwSk0sMENBQVUsR0FBRyxvQ0FBd0IsQUFBM0IsQ0FBMkI7QUF1SjlDLGtCQUFlLCtCQUErQixDQUFBIn0=