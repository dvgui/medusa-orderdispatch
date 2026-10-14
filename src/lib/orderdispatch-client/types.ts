/**
 * OrderDispatch (ODM FulfilmentCustomer WebApp API, Swagger v1 at
 * /swagger/docs/v1). Field names and casing are ODM's own.
 */

export type OrderDispatchCredentials = Readonly<{ username: string; password: string }>

/** POST /api/Auth/ValidateUser */
export type ValidateUserResponse = Readonly<{
  token: string
  usertype?: string
  username?: string
  companyId?: string
  role?: string
  accessLevel?: string
}>

export type CreateOrderItem = Readonly<{
  Sku: string
  Title?: string
  Quantity: number
  /** Unit price. */
  RetailPrice?: number
  /** Kilograms. */
  Weight?: number
  LineItemId?: string
  DiscountAmount?: number
}>

export type DeliveryAddress = Readonly<{
  FullName: string
  Email?: string
  Phone?: string
  Company?: string
  Address1: string
  Address2?: string
  Address3?: string
  Town: string
  PostCode: string
  Region?: string
  /** ISO 3166-1 alpha-2, e.g. "GB". */
  Country: string
}>

export type BillingAddress = Omit<DeliveryAddress, "Email" | "Address3">

export type ShippingDetails = Readonly<{
  /** Empty lets ODM's shipping rules choose the courier. */
  ShippingService?: string
  ReferenceNumber: string
  ShippingCost?: number
}>

/** POST /api/CreateOrder/Create?source=&subSource= */
export type CreateOrderRequest = Readonly<{
  OrderItems: readonly CreateOrderItem[]
  DeliveryAddress: DeliveryAddress
  BillingAddress?: BillingAddress
  ShippingDetails: ShippingDetails
  PaymentStatus?: string
  /** ISO date-time. */
  OrderDate?: string
  DespatchByDate?: string
  Currency?: string
  OrderDiscount?: number
}>

export type CreateOrderResponse = Readonly<{
  IsSuccessfull: boolean
  OrderNumber?: string | null
  ShippingScriptExecutedSuccessfully?: boolean
  Error?: string | null
}>

/** GET /api/InventoryPreview/GetStockLevels */
export type StockLevel = Readonly<{
  ItemNumber: string
  ItemTitle?: string
  CreationDate?: string
  bContainsComposites?: boolean
  Available: number
  InStock: number
  InOrders: number
}>

export type StockLevelResponse = Readonly<{ Success: boolean; StockLevels: readonly StockLevel[] }>

/** GET /api/ProcessedOrders/GetProcessedOrders */
export type ProcessedOrder = Readonly<{
  NumOrderId: number
  ReferenceNum: string | null
  SecondaryReference?: string | null
  ExternalReferenceNum?: string | null
  ProcessedDateTime?: string | null
  Source?: string | null
  SubSource?: string | null
  ServiceName?: string | null
  TrackingNumber?: string | null
}>

export type ProcessedOrderResponse = Readonly<{ Success: boolean; ProcessedOrders: readonly ProcessedOrder[] }>

/** GET /api/Shipping/GetShippingRates?country=&weight= */
export type ShippingRate = Readonly<{
  Vendor: string
  Name: string
  Price: number
  DaysMax?: number
  Expedited?: boolean
  Express?: boolean
}>

export type ShippingRatesResponse = Readonly<{ Country: string; Weight: number; Rates: readonly ShippingRate[] }>
