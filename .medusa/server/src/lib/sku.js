"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOdmSkus = exports.odmSkuFor = exports.odmCandidates = void 0;
/**
 * ODM namespaces each client's stock items with a company prefix (Add Item
 * shows a fixed "KREL-" before the SKU), while Medusa's warehouse SKUs stay
 * plain ("RETATRUTIDE-10MG"). An order line must carry the SKU exactly as ODM
 * stores it, so each Medusa SKU resolves to the stock item that exists:
 * the plain SKU first, then `prefix + SKU`.
 */
const odmCandidates = (sku, prefix) => {
    const plain = sku.trim();
    const prefixed = prefix && !plain.toUpperCase().startsWith(prefix.toUpperCase()) ? `${prefix}${plain}` : "";
    return prefixed ? [plain, prefixed] : [plain];
};
exports.odmCandidates = odmCandidates;
/** The SKU to send when ODM's stock list isn't consulted. */
const odmSkuFor = (sku, prefix) => {
    const candidates = (0, exports.odmCandidates)(sku, prefix);
    return candidates[candidates.length - 1];
};
exports.odmSkuFor = odmSkuFor;
const resolveOdmSkus = (skus, stockItemNumbers, prefix) => {
    const byUpper = new Map(stockItemNumbers.map((n) => [n.trim().toUpperCase(), n.trim()]));
    const resolved = new Map();
    const missing = [];
    for (const sku of new Set(skus)) {
        const hit = (0, exports.odmCandidates)(sku, prefix)
            .map((candidate) => byUpper.get(candidate.toUpperCase()))
            .find(Boolean);
        if (hit)
            resolved.set(sku, hit);
        else
            missing.push(sku);
    }
    return { resolved, missing };
};
exports.resolveOdmSkus = resolveOdmSkus;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2t1LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xpYi9za3UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7Ozs7OztHQU1HO0FBQ0ksTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEVBQUUsTUFBYyxFQUFZLEVBQUU7SUFDckUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3hCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDM0csT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQy9DLENBQUMsQ0FBQTtBQUpZLFFBQUEsYUFBYSxpQkFJekI7QUFFRCw2REFBNkQ7QUFDdEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUUsTUFBYyxFQUFVLEVBQUU7SUFDL0QsTUFBTSxVQUFVLEdBQUcsSUFBQSxxQkFBYSxFQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM3QyxPQUFPLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQzFDLENBQUMsQ0FBQTtBQUhZLFFBQUEsU0FBUyxhQUdyQjtBQVFNLE1BQU0sY0FBYyxHQUFHLENBQzVCLElBQXVCLEVBQ3ZCLGdCQUFtQyxFQUNuQyxNQUFjLEVBQ0MsRUFBRTtJQUNqQixNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4RixNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQUMxQyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7SUFDNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sR0FBRyxHQUFHLElBQUEscUJBQWEsRUFBQyxHQUFHLEVBQUUsTUFBTSxDQUFDO2FBQ25DLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQzthQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDaEIsSUFBSSxHQUFHO1lBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7O1lBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUNELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUE7QUFDOUIsQ0FBQyxDQUFBO0FBaEJZLFFBQUEsY0FBYyxrQkFnQjFCIn0=