# @dvgui/orderdispatch-plugin

Medusa v2 fulfillment provider for **OrderDispatch (ODM)**, a UK 3PL. An admin
fulfils an order with an OrderDispatch shipping option; the order is pushed to
ODM, ODM's shipping rules pick the courier, and a polling job marks the order
shipped (with tracking) once ODM dispatches it.

## How it works

- **Push — `createFulfillment`** (`src/providers/orderdispatch/service.ts`)
  - Builds an ODM `CreateOrder` from the order Medusa passes the provider (`src/lib/build-order.ts`).
  - `ReferenceNumber` is the order's display id, or `<display>-R-<claim tail>` for resends. Processed orders are matched back by it.
  - `source` comes from the provider options (default `WebApp`).
    - ODM only accepts a source it knows: `WebApp`, or a configured channel integration. An unknown one fails CreateOrder with a .NET null reference.
    - `subSource` is free text: `order.metadata.storefront`.
  - Each line's `Sku` is the fulfillment line's SKU, which Medusa copies from the **inventory item's `sku`**. Every physical product must therefore have one inventory item named by its warehouse SKU.
  - Before pushing, each SKU is resolved to the ODM stock item it ships as: its exact SKU and its `StockItemId`.
    - The lookup uses `GET /Api/AmazonFBAInventorySearch/Search?text=`. It's the inventory search ODM's own Create Order screen uses, and the only call that returns `StockItemId`. It isn't in the public Swagger.
    - CreateOrder fails with a .NET null reference without `StockItemId`.
    - ODM prefixes each client's stock items with a company code (`KREL-`). With `skuPrefix`, a plain Medusa SKU matches `KREL-<SKU>`; plain matches are tried first.
    - An unknown SKU fails the fulfilment with a clear message instead of creating an unpickable ODM order. Lookups are cached 5 min (`skuCacheMs`).
  - The request matches what ODM's own Create Order screen sends, because its API fails with a .NET null reference on anything else:
    - every DeliveryAddress field is a string (empty when unknown)
    - no BillingAddress
    - `ShippingService: "StandardDelivery"` (option `shippingService`; ODM's shipping rules pick the courier)
    - `Country` is ODM's country **name** from `GET /api/CreateOrder/GetCountries`, not the ISO code (see `src/lib/country.ts` for the names ODM spells differently)
  - Idempotent: a fulfillment that already has `data.odOrderNumber` is never pushed again.
- **Dispatch — `orderdispatch-tracking` job** (every 15 min)
  - Queries open fulfillments of this provider and fetches `GetProcessedOrders`.
  - For each match by reference it runs `markOrderDispatchShippedWorkflow`:
    - `updateFulfillmentWorkflow` stores courier, tracking and dispatch time on `fulfillment.data`.
    - `createOrderShipmentWorkflow` registers the shipment on the order and emits `shipment.created`.
  - Uses the order-level workflow rather than the fulfillment-level `createShipmentWorkflow`, which leaves order items unshipped.
- **Cancel:** ODM has no cancel API. `cancelFulfillment` only flags `odCancelRequested`; the app alerts someone to cancel in the ODM dashboard.
- **Returns:** handled in ODM's returns portal; `createReturnFulfillment` refuses.

ODM's public API (Swagger at `/swagger/docs/v1`, login required) is small:
- `ValidateUser`: login, returning a 20-hour JWT
- `CreateOrder`
- `GetStockLevels`
- `GetProcessedOrders`
- `GetShippingRates`

There are no webhooks, cancel/update, products or returns endpoints. ODM authenticates dashboard users, so use a dedicated API user.

## Install (git dependency)

```jsonc
// package.json
"@dvgui/orderdispatch-plugin": "git+https://github.com/dvgui/medusa-orderdispatch.git#<commit>"
```

```ts
// medusa-config.ts
plugins: [{ resolve: "@dvgui/orderdispatch-plugin", options: {} }], // loads the job + workflow
modules: [{
  resolve: "@medusajs/medusa/fulfillment",
  options: { providers: [{
    resolve: "@dvgui/orderdispatch-plugin/providers/orderdispatch",
    id: "orderdispatch-fulfillment",
    options: {
      username: process.env.ORDERDISPATCH_USERNAME,
      password: process.env.ORDERDISPATCH_PASSWORD,
      source: process.env.ORDERDISPATCH_SOURCE, // default WebApp (must be a source ODM knows)
      // Environments sharing one ODM account must not share references:
      referencePrefix: process.env.ORDERDISPATCH_REFERENCE_PREFIX, // e.g. "DEV-" on dev
      // ODM prefixes each client's stock items ("KREL-…"); Medusa SKUs stay plain:
      skuPrefix: process.env.ORDERDISPATCH_SKU_PREFIX, // e.g. "KREL-"
    },
  }] },
}]
```

**Environment** (the job reads the environment, not provider options):
- `ORDERDISPATCH_ENABLED=true`
- `ORDERDISPATCH_USERNAME`, `ORDERDISPATCH_PASSWORD`
- optional `ORDERDISPATCH_BASE_URL`

The provider id is `orderdispatch-fulfillment_orderdispatch-fulfillment`. Its fulfillment options:

| Option | ShippingService sent to ODM | Price |
| --- | --- | --- |
| `od-uk` | `UK Tracked 24` | flat (set on the shipping option) |
| `od-intl-economy` | `DHL Economy DDP` | **calculated**: ODM's `Economy Select International DDP` rate (falls back to `Express Worldwide DDP` where Economy isn't offered, e.g. the US) + `rateMarkupPercent` (default 20) |
| `od-intl-express` | `DHL Express DDP` | **calculated**: ODM's `Express Worldwide DDP` rate + markup |
| `od-intl` (legacy) | `DHL Economy DDP` | flat |

ODM's shipping rules (Settings → Shipping Service Settings → Shipping Service Conditions) map the `ShippingService` labels to the actual courier services.

Calculated prices:
- **Weight:** the cart's variant weights (g → kg) plus `packagingGrams` (default 50).
- **Currency:** GBP.
- **Tax:** tax-exclusive.
- **Caching:** quotes are cached `rateCacheMs` (default 1 h) per country and weight.

## Release

Git installs don't run `prepublishOnly`, so the build output is committed:

```sh
bun run typecheck && bun test src/ && bun run build
git add -A && git add -f .medusa/server && git commit && git push
# then bump the #<commit> pin in the Medusa app and `bun install`
```
