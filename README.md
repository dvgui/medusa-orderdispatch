# @dvgui/orderdispatch-plugin

Medusa v2 fulfillment provider for **OrderDispatch (ODM)**, a UK 3PL. An admin
fulfils an order with an OrderDispatch shipping option; the order is pushed to
ODM, ODM's shipping rules pick the courier, and a polling job marks the order
shipped (with tracking) once ODM dispatches it.

## How it works

- **Push — `createFulfillment`** (`src/providers/orderdispatch/service.ts`)
  - Builds an ODM `CreateOrder` from the order Medusa passes the provider (`src/lib/build-order.ts`).
  - `ReferenceNumber` is the order's display id, or `<display>-R-<claim tail>` for resends. Processed orders are matched back by it.
  - `source` comes from the provider options (default `MEDUSA`); `subSource` is `order.metadata.storefront`.
  - Each line's `Sku` is the fulfillment line's SKU, which Medusa copies from the **inventory item's `sku`**. Every physical product must therefore have one inventory item named by its warehouse SKU.
  - Before pushing, every SKU is checked against ODM's stock list (cached 5 min). An unknown SKU fails the fulfilment with a clear message instead of creating an unpickable ODM order.
  - ODM prefixes each client's stock items with a company code (`KREL-`). With `skuPrefix`, a plain Medusa SKU resolves to the stock item ODM holds (plain first, then prefixed), and the order line carries that exact SKU.
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
      source: process.env.ORDERDISPATCH_SOURCE, // default MEDUSA
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

The provider id is `orderdispatch-fulfillment_orderdispatch-fulfillment`. Its fulfillment options are `od-uk` and `od-intl`.

## Release

Git installs don't run `prepublishOnly`, so the build output is committed:

```sh
bun run typecheck && bun test src/ && bun run build
git add -A && git add -f .medusa/server && git commit && git push
# then bump the #<commit> pin in the Medusa app and `bun install`
```
