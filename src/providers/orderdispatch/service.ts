import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CreateFulfillmentResult,
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
class OrderDispatchFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = ORDERDISPATCH_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly options_: ResolvedOrderDispatchOptions
  protected readonly client_: OrderDispatchClient
  #knownSkus?: Readonly<{ skus: ReadonlySet<string>; fetchedAt: number }>

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
    return ORDERDISPATCH_FULFILLMENT_OPTIONS.map((option) => ({ ...option }))
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

  async canCalculate(): Promise<boolean> {
    return false
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
      })
      await this.#assertSkusKnown(built.request.OrderItems.map((line) => line.Sku))

      const created = await this.client_.createOrder(built.request, {
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

  /** Every SKU must exist in ODM, or the order lands there unpickable. */
  async #assertSkusKnown(skus: readonly string[]): Promise<void> {
    if (!this.options_.checkSkus) return
    const now = Date.now()
    if (!this.#knownSkus || now - this.#knownSkus.fetchedAt > this.options_.skuCacheMs) {
      const levels = await this.client_.getStockLevels()
      this.#knownSkus = { skus: new Set(levels.map((l) => l.ItemNumber.trim().toUpperCase())), fetchedAt: now }
    }
    const known = this.#knownSkus.skus
    const missing = [...new Set(skus)].filter((sku) => !known.has(sku.toUpperCase()))
    if (missing.length) {
      throw new OrderBuildError(
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set up in OrderDispatch — add ${missing.length === 1 ? "it" : "them"} to OrderDispatch inventory first`
      )
    }
  }
}

export default OrderDispatchFulfillmentService
