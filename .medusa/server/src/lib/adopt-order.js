"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAdoptableOrder = void 0;
/**
 * ODM can save an order and still answer CreateOrder with an error — a step
 * after the insert fails (on 2026-10-21 every create came back "Procedure or
 * function GetSetGiftNotes has too many arguments specified"), and a retry is
 * then refused with "Order with Reference … Already exists". The order is in
 * ODM and will ship, so the fulfilment adopts it instead of failing.
 *
 * Only an open order that is unmistakably this push qualifies: same reference,
 * Source and SubSource, not cancelled, and the same SKUs and quantities.
 * Pure — the caller fetches the open orders.
 */
const findAdoptableOrder = (openOrders, expected) => {
    const same = (a, b) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
    const wanted = quantitiesBySku(expected.lines.map((line) => [line.Sku, line.Quantity]));
    return openOrders.find((order) => String(order.ReferenceNum ?? "").trim() === expected.reference &&
        same(order.Source, expected.source) &&
        same(order.SubSource, expected.subSource) &&
        !order.IsCancelled &&
        sameQuantities(quantitiesBySku((order.Items ?? []).map((item) => [item.SKU, item.Quantity])), wanted));
};
exports.findAdoptableOrder = findAdoptableOrder;
const quantitiesBySku = (lines) => {
    const totals = new Map();
    for (const [sku, quantity] of lines) {
        const key = String(sku ?? "").trim().toUpperCase();
        totals.set(key, (totals.get(key) ?? 0) + Number(quantity ?? 0));
    }
    return totals;
};
const sameQuantities = (a, b) => a.size === b.size && [...a].every(([sku, quantity]) => b.get(sku) === quantity);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRvcHQtb3JkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL2Fkb3B0LW9yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBOzs7Ozs7Ozs7O0dBVUc7QUFDSSxNQUFNLGtCQUFrQixHQUFHLENBQ2hDLFVBQWdDLEVBQ2hDLFFBS0UsRUFDcUIsRUFBRTtJQUN6QixNQUFNLElBQUksR0FBRyxDQUFDLENBQVUsRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3ZHLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkYsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNwQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQ1IsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssUUFBUSxDQUFDLFNBQVM7UUFDOUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDO1FBQ3pDLENBQUMsS0FBSyxDQUFDLFdBQVc7UUFDbEIsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FDeEcsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQW5CWSxRQUFBLGtCQUFrQixzQkFtQjlCO0FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFpRCxFQUErQixFQUFFO0lBQ3pHLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQ3hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFBO0FBQ2YsQ0FBQyxDQUFBO0FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUE4QixFQUFFLENBQThCLEVBQVcsRUFBRSxDQUNqRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFBIn0=