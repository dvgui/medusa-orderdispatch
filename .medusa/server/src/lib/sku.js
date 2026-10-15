"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchOdmStockItem = exports.odmCandidates = void 0;
/**
 * ODM namespaces each client's stock items with a company prefix (Add Item and
 * the inventory import turn RETATRUTIDE-10MG into KREL-RETATRUTIDE-10MG),
 * while Medusa's warehouse SKUs stay plain. An order line must carry the stock
 * item ODM holds — its exact SKU and its StockItemId — so each Medusa SKU
 * resolves to the stock item that exists: the plain SKU first, then
 * `prefix + SKU`.
 */
const odmCandidates = (sku, prefix) => {
    const plain = sku.trim();
    const prefixed = prefix && !plain.toUpperCase().startsWith(prefix.toUpperCase()) ? `${prefix}${plain}` : "";
    return prefixed ? [plain, prefixed] : [plain];
};
exports.odmCandidates = odmCandidates;
/** The stock item for one Medusa SKU among ODM search results, if any. */
const matchOdmStockItem = (sku, results, prefix) => {
    const bySku = new Map(results.map((r) => [r.Sku.trim().toUpperCase(), r]));
    return (0, exports.odmCandidates)(sku, prefix)
        .map((candidate) => bySku.get(candidate.toUpperCase()))
        .find((hit) => Boolean(hit?.StockItemId));
};
exports.matchOdmStockItem = matchOdmStockItem;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2t1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xpYi9za3UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7Ozs7R0FPRztBQUNJLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBVyxFQUFFLE1BQWMsRUFBWSxFQUFFO0lBQ3JFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN4QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0lBQzNHLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUMvQyxDQUFDLENBQUE7QUFKWSxRQUFBLGFBQWEsaUJBSXpCO0FBSUQsMEVBQTBFO0FBQ25FLE1BQU0saUJBQWlCLEdBQUcsQ0FDL0IsR0FBVyxFQUNYLE9BQW9DLEVBQ3BDLE1BQWMsRUFDWSxFQUFFO0lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUUsT0FBTyxJQUFBLHFCQUFhLEVBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQztTQUM5QixHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7U0FDdEQsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUF1QixFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0FBQ2xFLENBQUMsQ0FBQTtBQVRZLFFBQUEsaUJBQWlCLHFCQVM3QiJ9