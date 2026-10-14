"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markOrderDispatchShippedWorkflow = exports.markOrderDispatchShippedWorkflowId = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
exports.markOrderDispatchShippedWorkflowId = "mark-orderdispatch-shipped";
/**
 * Record ODM's dispatch on the fulfillment, then mark the order shipped.
 *
 * createOrderShipmentWorkflow — not the fulfillment-level createShipmentWorkflow
 * — because only the order-level one registers the shipment on the order
 * (shipped quantities, order fulfilment status) and emits shipment.created,
 * which sends the branded "your order has shipped" email.
 */
exports.markOrderDispatchShippedWorkflow = (0, workflows_sdk_1.createWorkflow)(exports.markOrderDispatchShippedWorkflowId, function (input) {
    const fulfillmentUpdate = (0, workflows_sdk_1.transform)({ input }, ({ input }) => ({
        id: input.fulfillment_id,
        data: input.data,
    }));
    core_flows_1.updateFulfillmentWorkflow.runAsStep({ input: fulfillmentUpdate });
    const shipment = (0, workflows_sdk_1.transform)({ input }, ({ input }) => ({
        order_id: input.order_id,
        fulfillment_id: input.fulfillment_id,
        items: input.items.map((item) => ({ id: item.id, quantity: item.quantity })),
        labels: input.tracking_number
            ? [{ tracking_number: input.tracking_number, tracking_url: input.tracking_url, label_url: "" }]
            : [],
    }));
    core_flows_1.createOrderShipmentWorkflow.runAsStep({ input: shipment });
    return new workflows_sdk_1.WorkflowResponse({ fulfillment_id: input.fulfillment_id });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1vcmRlcmRpc3BhdGNoLXNoaXBwZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL21hcmstb3JkZXJkaXNwYXRjaC1zaGlwcGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUkwQztBQUMxQyw0REFBb0c7QUFldkYsUUFBQSxrQ0FBa0MsR0FBRyw0QkFBNEIsQ0FBQTtBQUU5RTs7Ozs7OztHQU9HO0FBQ1UsUUFBQSxnQ0FBZ0MsR0FBRyxJQUFBLDhCQUFjLEVBQzVELDBDQUFrQyxFQUNsQyxVQUFVLEtBQW9DO0lBQzVDLE1BQU0saUJBQWlCLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdELEVBQUUsRUFBRSxLQUFLLENBQUMsY0FBYztRQUN4QixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7S0FDakIsQ0FBQyxDQUFDLENBQUE7SUFDSCxzQ0FBeUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO0lBRWpFLE1BQU0sUUFBUSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7UUFDeEIsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFjO1FBQ3BDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM1RSxNQUFNLEVBQUUsS0FBSyxDQUFDLGVBQWU7WUFDM0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0YsQ0FBQyxDQUFDLEVBQUU7S0FDUCxDQUFDLENBQUMsQ0FBQTtJQUNILHdDQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBRTFELE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtBQUN2RSxDQUFDLENBQ0YsQ0FBQSJ9