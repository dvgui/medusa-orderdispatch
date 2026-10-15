import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
} from "@medusajs/framework/types"

import {
  ORDERDISPATCH_FULFILLMENT_OPTIONS,
  ORDERDISPATCH_IDENTIFIER,
  type OrderDispatchFulfillmentData,
} from "../../constants"
import {
  OrderBuildError,
  buildOrderDispatchOrder,
  type ProviderFulfillmentItem,
  type ProviderOrder,
} from "../../lib/build-order"
import { OrderDispatchClient, OrderDispatchError } from "../../lib/orderdispatch-client"
import { odmCountryName } from "../../lib/country"
import { matchOdmStockItem, type OdmStockItem } from "../../lib/sku"
import { parcelWeightKg, pickRate, withMarkup } from "../../lib/rates"
import type { ShippingRate } from "../../lib/orderdispatch-client/types"
import {
  resolveOrderDispatchOptions,
  type OrderDispatchProviderOptions,
  type ResolvedOrderDispatchOptions,
} from "./options"

type InjectedDependencies = Readonly<{ logger: Logger }>

/**
 * OrderDispatch (ODM) 3PL. `createFulfillment` pushes the order to ODM when an
 * admin fulfils it; ODM's own shipping rules pick the courier. Dispatch and
 * tracking come back through the `orderdispatch-tracking` job, which marks the
 * order shipped with `createOrderShipmentWorkflow`.
 */
const optionFor = (id: unknown) => ORDERDISPATCH_FULFILLMENT_OPTIONS.find((option) => option.id === id) as
  | (typeof ORDERDISPATCH_FULFILLMENT_OPTIONS)[number] & { rate?: { vendor: string; service: string; fallback?: string } }
  | undefined

class OrderDispatchFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = ORDERDISPATCH_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly options_: ResolvedOrderDispatchOptions
  protected readonly client_: OrderDispatchClient
  readonly #stockItems = new Map<string, Readonly<{ item: OdmStockItem; fetchedAt: number }>>()
  #countries?: Readonly<{ names: readonly string[]; fetchedAt: number }>
  readonly #rates = new Map<string, Readonly<{ rates: readonly ShippingRate[]; fetchedAt: number }>>()

  static validateOptions(options: Record<string, unknown>): void {
    resolveOrderDispatchOptions(options as Partial<OrderDispatchProviderOptions>)
  }

  constructor({ logger }: InjectedDependencies, options: OrderDispatchProviderOptions) {
    super()
    this.logger_ = logger
    this.options_ = resolveOrderDispatchOptions(options)
    this.client_ = new OrderDispatchClient(this.options_)
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return ORDERDISPATCH_FULFILLMENT_OPTIONS.map(({ id, name }) => ({ id, name }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return { ...optionData, ...data }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return ORDERDISPATCH_FULFILLMENT_OPTIONS.some((option) => option.id === data.id)
  }

  /** The international options are priced live from ODM's DDP rates. */
  async canCalculate(option: CreateShippingOptionDTO): Promise<boolean> {
    return Boolean(optionFor((option.data as Record<string, unknown> | undefined)?.id)?.rate)
  }

  /**
   * ODM's DDP rate for the delivery country and parcel weight, plus the
   * markup. GBP and tax-exclusive, like the store's flat options.
   */
  async calculatePrice(
    optionData: Record<string, unknown>,
    _data: Record<string, unknown>,
    context: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    const option = optionFor(optionData.id)
    if (!option?.rate) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `OrderDispatch option ${String(optionData.id)} has a flat price`)
    }
    const country = context.shipping_address?.country_code?.trim().toUpperCase()
    if (!country) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter a delivery address to see the shipping price")
    }
    const kg = parcelWeightKg(context.items as never, this.options_.packagingGrams)
    const rate = pickRate(await this.#ratesFor(country, kg), option.rate)
    if (!rate) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `${option.name} doesn't deliver to ${country}`)
    }
    return {
      calculated_amount: withMarkup(rate.Price, this.options_.rateMarkupPercent),
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const existing = data as OrderDispatchFulfillmentData
    if (existing.odOrderNumber) {
      // A retried workflow must not create a second ODM order.
      return { data, labels: [] }
    }
    if (!order) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "OrderDispatch needs the order to push it")
    }

    const resendClaimId = fulfillment.metadata?.resend_claim_id
    try {
      const built = buildOrderDispatchOrder({
        order: order as unknown as ProviderOrder,
        items: items as ProviderFulfillmentItem[],
        resendClaimId: typeof resendClaimId === "string" ? resendClaimId : null,
        referencePrefix: this.options_.referencePrefix,
        shippingService: optionFor(data.id)?.shippingService ?? this.options_.shippingService,
      })
      const stockItems = await this.#resolveStockItems(built.request.OrderItems.map((line) => line.Sku))
      const request = {
        ...built.request,
        OrderItems: built.request.OrderItems.map((line) => {
          const stockItem = stockItems.get(line.Sku)!
          return { ...line, Sku: stockItem.Sku, StockItemId: stockItem.StockItemId }
        }),
        DeliveryAddress: {
          ...built.request.DeliveryAddress,
          Country: await this.#countryName(built.request.DeliveryAddress.Country),
        },
      }

      const created = await this.client_.createOrder(request, {
        source: this.options_.source,
        subSource: built.subSource,
      })
      this.logger_.info(
        `[orderdispatch] pushed ${built.reference} (${built.subSource}) as ODM order ${created.OrderNumber}`
      )
      const pushed: OrderDispatchFulfillmentData = {
        odOrderNumber: created.OrderNumber,
        odReference: built.reference,
        odSubSource: built.subSource,
        odPushedAt: new Date().toISOString(),
      }
      return { data: { ...data, ...pushed }, labels: [] }
    } catch (error) {
      if (error instanceof OrderBuildError || error instanceof OrderDispatchError) {
        this.logger_.error(`[orderdispatch] push failed for order ${order.display_id ?? order.id}: ${error.message}`)
        // INVALID_DATA reaches the admin's fulfil dialog with the reason.
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `OrderDispatch: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * ODM has no cancel API. Medusa's cancel still goes ahead; the app's
   * `order.fulfillment_canceled` subscriber alerts someone to cancel the ODM
   * order in its dashboard before it is picked.
   */
  async cancelFulfillment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { odOrderNumber, odReference } = data as OrderDispatchFulfillmentData
    if (odOrderNumber) {
      this.logger_.warn(
        `[orderdispatch] fulfillment for ${odReference} cancelled in Medusa — cancel ODM order ${odOrderNumber} in the OrderDispatch dashboard`
      )
    }
    return { ...data, odCancelRequested: Boolean(odOrderNumber) }
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "OrderDispatch returns go through the OrderDispatch returns portal, not Medusa"
    )
  }

  /** ODM's rates for a country and weight, cached so checkout doesn't hammer ODM. */
  async #ratesFor(country: string, kg: number): Promise<readonly ShippingRate[]> {
    const key = `${country}:${kg}`
    const cached = this.#rates.get(key)
    if (cached && Date.now() - cached.fetchedAt <= this.options_.rateCacheMs) return cached.rates
    const rates = await this.client_.getShippingRates(country, kg)
    this.#rates.set(key, { rates, fetchedAt: Date.now() })
    return rates
  }

  /** ODM's country name for an ISO code (its list is cached for a day). */
  async #countryName(iso2: string): Promise<string> {
    const now = Date.now()
    if (!this.#countries || now - this.#countries.fetchedAt > 24 * 60 * 60_000) {
      this.#countries = { names: await this.client_.getCountries(), fetchedAt: now }
    }
    const name = odmCountryName(iso2, this.#countries.names)
    if (!name) throw new OrderBuildError(`OrderDispatch doesn't list the delivery country ${iso2}`)
    return name
  }

  /**
   * The ODM stock item (exact SKU + StockItemId) for each Medusa SKU. Every SKU
   * must exist in ODM, plain or with the company prefix, or the order would
   * land there unpickable — so a missing one fails the fulfilment instead.
   */
  async #resolveStockItems(skus: readonly string[]): Promise<ReadonlyMap<string, OdmStockItem>> {
    const now = Date.now()
    const resolved = new Map<string, OdmStockItem>()
    const missing: string[] = []
    for (const sku of new Set(skus)) {
      const cached = this.#stockItems.get(sku)
      if (cached && now - cached.fetchedAt <= this.options_.skuCacheMs) {
        resolved.set(sku, cached.item)
        continue
      }
      const item = matchOdmStockItem(sku, await this.client_.searchStockItems(sku), this.options_.skuPrefix)
      if (!item) {
        missing.push(sku)
        continue
      }
      this.#stockItems.set(sku, { item, fetchedAt: now })
      resolved.set(sku, item)
    }
    if (missing.length) {
      throw new OrderBuildError(
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set up in OrderDispatch — add ${missing.length === 1 ? "it" : "them"} to OrderDispatch inventory first`
      )
    }
    return resolved
  }
}

export default OrderDispatchFulfillmentService
