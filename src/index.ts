export {
  ORDERDISPATCH_DEFAULT_BASE_URL,
  ORDERDISPATCH_FULFILLMENT_OPTIONS,
  ORDERDISPATCH_IDENTIFIER,
  ORDERDISPATCH_PROVIDER_ID,
  type OrderDispatchFulfillmentData,
  type OrderDispatchOptionId,
} from "./constants"
export { OrderDispatchClient, OrderDispatchError } from "./lib/orderdispatch-client"
export type * from "./lib/orderdispatch-client/types"
export { courierFor, indexProcessedOrders, type CourierInfo } from "./lib/tracking"
export { buildOrderDispatchOrder, orderReference } from "./lib/build-order"
export type { OrderDispatchProviderOptions } from "./providers/orderdispatch/options"
