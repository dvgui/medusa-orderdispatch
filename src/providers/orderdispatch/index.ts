import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import OrderDispatchFulfillmentService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [OrderDispatchFulfillmentService],
})
