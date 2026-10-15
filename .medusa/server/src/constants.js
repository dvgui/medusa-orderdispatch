"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = exports.ORDERDISPATCH_DEFAULT_BASE_URL = exports.ORDERDISPATCH_PROVIDER_ID = exports.ORDERDISPATCH_IDENTIFIER = void 0;
/** `static identifier` of the fulfillment provider service. */
exports.ORDERDISPATCH_IDENTIFIER = "orderdispatch-fulfillment";
/**
 * Medusa provider id when registered with `id: "orderdispatch-fulfillment"`
 * (Medusa joins `<identifier>_<id>`). Fulfillments and shipping options carry it.
 */
exports.ORDERDISPATCH_PROVIDER_ID = `${exports.ORDERDISPATCH_IDENTIFIER}_${exports.ORDERDISPATCH_IDENTIFIER}`;
exports.ORDERDISPATCH_DEFAULT_BASE_URL = "https://www.orderdispatch.co.uk";
/**
 * Medusa's fulfillment options. Each sends ODM a ShippingService label that
 * ODM's shipping rules (Settings → Shipping Service Settings) map to the real
 * courier service. The international ones are priced live from ODM's DDP rates.
 */
exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = [
    { id: "od-uk", name: "OrderDispatch UK", shippingService: "UK Tracked 24" },
    {
        id: "od-intl-economy",
        name: "OrderDispatch International Economy",
        shippingService: "DHL Economy DDP",
        rate: { vendor: "DHL Express", service: "Economy Select International DDP", fallback: "Express Worldwide DDP" },
    },
    {
        id: "od-intl-express",
        name: "OrderDispatch International Express",
        shippingService: "DHL Express DDP",
        rate: { vendor: "DHL Express", service: "Express Worldwide DDP" },
    },
    /** Before the Economy/Express split; shipped as Economy. */
    { id: "od-intl", name: "OrderDispatch International", shippingService: "DHL Economy DDP" },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrREFBK0Q7QUFDbEQsUUFBQSx3QkFBd0IsR0FBRywyQkFBMkIsQ0FBQTtBQUVuRTs7O0dBR0c7QUFDVSxRQUFBLHlCQUF5QixHQUFHLEdBQUcsZ0NBQXdCLElBQUksZ0NBQXdCLEVBQUUsQ0FBQTtBQUVyRixRQUFBLDhCQUE4QixHQUFHLGlDQUFpQyxDQUFBO0FBRS9FOzs7O0dBSUc7QUFDVSxRQUFBLGlDQUFpQyxHQUFHO0lBQy9DLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRTtJQUMzRTtRQUNFLEVBQUUsRUFBRSxpQkFBaUI7UUFDckIsSUFBSSxFQUFFLHFDQUFxQztRQUMzQyxlQUFlLEVBQUUsaUJBQWlCO1FBQ2xDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLFFBQVEsRUFBRSx1QkFBdUIsRUFBRTtLQUNoSDtJQUNEO1FBQ0UsRUFBRSxFQUFFLGlCQUFpQjtRQUNyQixJQUFJLEVBQUUscUNBQXFDO1FBQzNDLGVBQWUsRUFBRSxpQkFBaUI7UUFDbEMsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUU7S0FDbEU7SUFDRCw0REFBNEQ7SUFDNUQsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUU7Q0FDbEYsQ0FBQSJ9