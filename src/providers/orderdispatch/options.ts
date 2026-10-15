import { MedusaError } from "@medusajs/framework/utils"

export type OrderDispatchProviderOptions = Readonly<{
  /** A dedicated ODM dashboard user (ODM has no API keys). */
  username: string
  password: string
  baseUrl?: string
  /** CreateOrder `source` (default "WebApp"). ODM only accepts a source it
   *  knows — "WebApp" or a configured channel integration; anything else fails
   *  with a .NET null reference. `subSource` (free text) is the storefront slug. */
  source?: string
  /** Prepended to every ReferenceNumber, so environments sharing one ODM
   *  account never match each other's orders (e.g. "DEV-" on dev). */
  referencePrefix?: string
  /** ODM's company prefix on stock item SKUs (e.g. "KREL-"); Medusa SKUs stay
   *  plain and are sent as the stock item ODM actually holds. */
  skuPrefix?: string
  /** ShippingDetails.ShippingService (default "StandardDelivery", as ODM's own
   *  Create Order screen sends); ODM's shipping rules pick the courier. */
  shippingService?: string
  /** How long a SKU → ODM stock item lookup is cached (default 5 min). */
  skuCacheMs?: number
  timeoutMs?: number
}>

export type ResolvedOrderDispatchOptions = OrderDispatchProviderOptions &
  Required<Pick<OrderDispatchProviderOptions, "source" | "referencePrefix" | "skuPrefix" | "shippingService" | "skuCacheMs">>

export const resolveOrderDispatchOptions = (
  options: Partial<OrderDispatchProviderOptions> | undefined
): ResolvedOrderDispatchOptions => {
  const username = options?.username?.trim()
  const password = options?.password
  if (!username || !password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "OrderDispatch requires username and password (ORDERDISPATCH_USERNAME / ORDERDISPATCH_PASSWORD)"
    )
  }
  return {
    ...options,
    username,
    password,
    source: options?.source?.trim() || "WebApp",
    referencePrefix: options?.referencePrefix?.trim() ?? "",
    skuPrefix: options?.skuPrefix?.trim() ?? "",
    shippingService: options?.shippingService?.trim() || "StandardDelivery",
    skuCacheMs: options?.skuCacheMs ?? 5 * 60_000,
  }
}
