import { MedusaError } from "@medusajs/framework/utils"

export type OrderDispatchProviderOptions = Readonly<{
  /** A dedicated ODM dashboard user (ODM has no API keys). */
  username: string
  password: string
  baseUrl?: string
  /** CreateOrder `source`; `subSource` is the order's storefront slug. */
  source?: string
  /** Prepended to every ReferenceNumber, so environments sharing one ODM
   *  account never match each other's orders (e.g. "DEV-" on dev). */
  referencePrefix?: string
  /** Refuse to push when a SKU is unknown to ODM (default true). */
  checkSkus?: boolean
  /** How long the ODM SKU list is cached for that check (default 5 min). */
  skuCacheMs?: number
  timeoutMs?: number
}>

export type ResolvedOrderDispatchOptions = OrderDispatchProviderOptions &
  Required<Pick<OrderDispatchProviderOptions, "source" | "referencePrefix" | "checkSkus" | "skuCacheMs">>

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
    source: options?.source?.trim() || "MEDUSA",
    referencePrefix: options?.referencePrefix?.trim() ?? "",
    checkSkus: options?.checkSkus ?? true,
    skuCacheMs: options?.skuCacheMs ?? 5 * 60_000,
  }
}
