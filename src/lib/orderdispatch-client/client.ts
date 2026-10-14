import { ORDERDISPATCH_DEFAULT_BASE_URL } from "../../constants"
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDispatchCredentials,
  ProcessedOrder,
  ProcessedOrderResponse,
  ShippingRate,
  ShippingRatesResponse,
  StockLevel,
  StockLevelResponse,
  ValidateUserResponse,
} from "./types"

export class OrderDispatchError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = "OrderDispatchError"
  }
}

export type OrderDispatchClientOptions = OrderDispatchCredentials &
  Readonly<{
    baseUrl?: string
    timeoutMs?: number
    /** Injected in tests. */
    fetchImpl?: typeof fetch
    /** Injected in tests. */
    now?: () => number
  }>

/** Refresh this long before the JWT's `exp` (ODM issues 20-hour tokens). */
const TOKEN_REFRESH_MARGIN_MS = 5 * 60_000
/** When a token carries no readable `exp`, trust it for an hour. */
const TOKEN_FALLBACK_TTL_MS = 60 * 60_000

/** The JWT's `exp` in epoch ms, or undefined when it can't be read. */
export const jwtExpiresAt = (token: string): number | undefined => {
  const [, payload] = token.split(".")
  if (!payload) return undefined
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown }
    return typeof exp === "number" ? exp * 1000 : undefined
  } catch {
    return undefined
  }
}

/**
 * OrderDispatch API client. Authenticates with a dashboard user (ODM has no
 * API keys), caches the JWT until shortly before it expires, and re-logs once
 * on a 401. Error messages never include credentials.
 */
export class OrderDispatchClient {
  readonly #credentials: OrderDispatchCredentials
  readonly #baseUrl: string
  readonly #timeoutMs: number
  readonly #fetch: typeof fetch
  readonly #now: () => number
  #token?: Readonly<{ value: string; refreshAt: number }>
  #login?: Promise<string>

  constructor({ username, password, baseUrl, timeoutMs, fetchImpl, now }: OrderDispatchClientOptions) {
    if (!username || !password) {
      throw new OrderDispatchError("OrderDispatch username and password are required")
    }
    this.#credentials = { username, password }
    this.#baseUrl = (baseUrl || ORDERDISPATCH_DEFAULT_BASE_URL).replace(/\/+$/, "")
    this.#timeoutMs = timeoutMs ?? 20_000
    this.#fetch = fetchImpl ?? fetch
    this.#now = now ?? Date.now
  }

  async createOrder(
    order: CreateOrderRequest,
    { source, subSource }: Readonly<{ source: string; subSource: string }>
  ): Promise<CreateOrderResponse & { OrderNumber: string }> {
    const response = await this.#request<CreateOrderResponse>("POST", "/api/CreateOrder/Create", {
      query: { source, subSource },
      body: order,
    })
    if (!response.IsSuccessfull || !response.OrderNumber) {
      throw new OrderDispatchError(
        `OrderDispatch rejected order ${order.ShippingDetails.ReferenceNumber}: ${response.Error || "no order number returned"}`
      )
    }
    return { ...response, OrderNumber: response.OrderNumber }
  }

  async getStockLevels(): Promise<readonly StockLevel[]> {
    const response = await this.#request<StockLevelResponse>("GET", "/api/InventoryPreview/GetStockLevels")
    if (!response.Success) throw new OrderDispatchError("OrderDispatch GetStockLevels was not successful")
    return response.StockLevels ?? []
  }

  async getProcessedOrders(): Promise<readonly ProcessedOrder[]> {
    const response = await this.#request<ProcessedOrderResponse>("GET", "/api/ProcessedOrders/GetProcessedOrders")
    if (!response.Success) throw new OrderDispatchError("OrderDispatch GetProcessedOrders was not successful")
    return response.ProcessedOrders ?? []
  }

  /** `weightKg` per ODM: kilograms. */
  async getShippingRates(country: string, weightKg: number): Promise<readonly ShippingRate[]> {
    const response = await this.#request<ShippingRatesResponse>("GET", "/api/Shipping/GetShippingRates", {
      query: { country: country.toUpperCase(), weight: String(weightKg) },
    })
    return response.Rates ?? []
  }

  async #getToken(): Promise<string> {
    if (this.#token && this.#now() < this.#token.refreshAt) return this.#token.value
    // One login for every caller that arrives while it is in flight.
    this.#login ??= this.#authenticate().finally(() => {
      this.#login = undefined
    })
    return this.#login
  }

  async #authenticate(): Promise<string> {
    const res = await this.#send("POST", "/api/Auth/ValidateUser", { body: this.#credentials })
    if (!res.ok) {
      throw new OrderDispatchError(`OrderDispatch login failed (HTTP ${res.status})`, res.status)
    }
    const { token } = (await res.json()) as ValidateUserResponse
    if (typeof token !== "string" || !token) {
      throw new OrderDispatchError("OrderDispatch login returned no token")
    }
    const expiresAt = jwtExpiresAt(token) ?? this.#now() + TOKEN_FALLBACK_TTL_MS
    this.#token = { value: token, refreshAt: expiresAt - TOKEN_REFRESH_MARGIN_MS }
    return token
  }

  async #request<T>(
    method: "GET" | "POST",
    path: string,
    init: Readonly<{ query?: Record<string, string>; body?: unknown }> = {},
    retried = false
  ): Promise<T> {
    const token = await this.#getToken()
    const res = await this.#send(method, path, init, token)
    if (res.status === 401 && !retried) {
      this.#token = undefined
      return this.#request<T>(method, path, init, true)
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300)
      throw new OrderDispatchError(
        `OrderDispatch ${method} ${path} failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
        res.status
      )
    }
    return (await res.json()) as T
  }

  async #send(
    method: "GET" | "POST",
    path: string,
    { query, body }: Readonly<{ query?: Record<string, string>; body?: unknown }>,
    token?: string
  ): Promise<Response> {
    const url = new URL(`${this.#baseUrl}${path}`)
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value)
    try {
      return await this.#fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new OrderDispatchError(`OrderDispatch ${method} ${path} did not respond: ${reason}`)
    }
  }
}
