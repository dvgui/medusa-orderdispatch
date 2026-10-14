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
/** OrderDispatch picks the courier through its shipping rules; Medusa only
 *  says whether the parcel is domestic or international. */
exports.ORDERDISPATCH_FULFILLMENT_OPTIONS = [
    { id: "od-uk", name: "OrderDispatch UK" },
    { id: "od-intl", name: "OrderDispatch International" },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrREFBK0Q7QUFDbEQsUUFBQSx3QkFBd0IsR0FBRywyQkFBMkIsQ0FBQTtBQUVuRTs7O0dBR0c7QUFDVSxRQUFBLHlCQUF5QixHQUFHLEdBQUcsZ0NBQXdCLElBQUksZ0NBQXdCLEVBQUUsQ0FBQTtBQUVyRixRQUFBLDhCQUE4QixHQUFHLGlDQUFpQyxDQUFBO0FBRS9FOzREQUM0RDtBQUMvQyxRQUFBLGlDQUFpQyxHQUFHO0lBQy9DLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7SUFDekMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw2QkFBNkIsRUFBRTtDQUM5QyxDQUFBIn0=