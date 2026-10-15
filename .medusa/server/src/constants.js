"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = exports.ORDERDISPATCH_EXPRESS_SUFFIX = exports.ORDERDISPATCH_DEFAULT_BASE_URL = exports.ORDERDISPATCH_PROVIDER_ID = exports.ORDERDISPATCH_IDENTIFIER = void 0;
/** `static identifier` of the fulfillment provider service. */
exports.ORDERDISPATCH_IDENTIFIER = "orderdispatch-fulfillment";
/**
 * Medusa provider id when registered with `id: "orderdispatch-fulfillment"`
 * (Medusa joins `<identifier>_<id>`). Fulfillments and shipping options carry it.
 */
exports.ORDERDISPATCH_PROVIDER_ID = `${exports.ORDERDISPATCH_IDENTIFIER}_${exports.ORDERDISPATCH_IDENTIFIER}`;
exports.ORDERDISPATCH_DEFAULT_BASE_URL = "https://www.orderdispatch.co.uk";
/**
 * Medusa's fulfillment options. ODM ignores CreateOrder's ShippingService, so
 * the customer's choice reaches ODM's shipping rules (Settings → Shipping
 * Service Settings) through the order's SubSource: Express orders are tagged
 * `<storefront>-express`. The international options are priced live from
 * ODM's DDP rates. ODM's rules (2026-10-15):
 *   Country = United Kingdom            → Royal Mail Tracked 24 NEXT DAY
 *   Sub Source ends with "-express"     → Express Worldwide DDP
 *   Country in the DHL Economy list     → Economy Select International DDP
 *   any other country                   → Express Worldwide DDP
 */
exports.ORDERDISPATCH_EXPRESS_SUFFIX = "-express";
exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = [
    { id: "od-uk", name: "OrderDispatch UK" },
    {
        id: "od-intl-economy",
        name: "OrderDispatch International Economy",
        rate: { vendor: "DHL Express", service: "Economy Select International DDP", fallback: "Express Worldwide DDP" },
    },
    {
        id: "od-intl-express",
        name: "OrderDispatch International Express",
        subSourceSuffix: exports.ORDERDISPATCH_EXPRESS_SUFFIX,
        rate: { vendor: "DHL Express", service: "Express Worldwide DDP" },
    },
    /** Before the Economy/Express split; shipped as Economy. */
    { id: "od-intl", name: "OrderDispatch International" },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrREFBK0Q7QUFDbEQsUUFBQSx3QkFBd0IsR0FBRywyQkFBMkIsQ0FBQTtBQUVuRTs7O0dBR0c7QUFDVSxRQUFBLHlCQUF5QixHQUFHLEdBQUcsZ0NBQXdCLElBQUksZ0NBQXdCLEVBQUUsQ0FBQTtBQUVyRixRQUFBLDhCQUE4QixHQUFHLGlDQUFpQyxDQUFBO0FBRS9FOzs7Ozs7Ozs7O0dBVUc7QUFDVSxRQUFBLDRCQUE0QixHQUFHLFVBQVUsQ0FBQTtBQUV6QyxRQUFBLGlDQUFpQyxHQUFHO0lBQy9DLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7SUFDekM7UUFDRSxFQUFFLEVBQUUsaUJBQWlCO1FBQ3JCLElBQUksRUFBRSxxQ0FBcUM7UUFDM0MsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsUUFBUSxFQUFFLHVCQUF1QixFQUFFO0tBQ2hIO0lBQ0Q7UUFDRSxFQUFFLEVBQUUsaUJBQWlCO1FBQ3JCLElBQUksRUFBRSxxQ0FBcUM7UUFDM0MsZUFBZSxFQUFFLG9DQUE0QjtRQUM3QyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRTtLQUNsRTtJQUNELDREQUE0RDtJQUM1RCxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFFO0NBQzlDLENBQUEifQ==