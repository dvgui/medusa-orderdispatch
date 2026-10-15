"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMarkup = exports.pickRate = exports.parcelWeightKg = void 0;
const build_order_1 = require("./build-order");
/** Parcel weight in kg from cart lines (Medusa variant weights are grams). */
const parcelWeightKg = (items, packagingGrams) => {
    const grams = (items ?? []).reduce((sum, item) => {
        const weight = (0, build_order_1.toNumber)(item.variant?.weight);
        const quantity = (0, build_order_1.toNumber)(item.quantity);
        return sum + (Number.isFinite(weight) && Number.isFinite(quantity) ? weight * quantity : 0);
    }, packagingGrams);
    return Math.max(0.01, Math.round(grams) / 1000);
};
exports.parcelWeightKg = parcelWeightKg;
/**
 * The ODM rate for a service, else its fallback (DHL Economy Select doesn't
 * serve every country; ODM's rules then ship Express, so that's the price).
 */
const pickRate = (rates, choice) => {
    const find = (service) => rates.find((r) => r.Vendor?.trim().toLowerCase() === choice.vendor.toLowerCase() && r.Name?.trim().toLowerCase() === service.toLowerCase());
    return find(choice.service) ?? (choice.fallback ? find(choice.fallback) : undefined);
};
exports.pickRate = pickRate;
/** Customer price: ODM's cost plus the markup, rounded to pennies. */
const withMarkup = (price, markupPercent) => Math.round(price * (1 + markupPercent / 100) * 100) / 100;
exports.withMarkup = withMarkup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0ZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3JhdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUF3QztBQUt4Qyw4RUFBOEU7QUFDdkUsTUFBTSxjQUFjLEdBQUcsQ0FDNUIsS0FBMEgsRUFDMUgsY0FBc0IsRUFDZCxFQUFFO0lBQ1YsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQy9DLE1BQU0sTUFBTSxHQUFHLElBQUEsc0JBQVEsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUEsc0JBQVEsRUFBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdGLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNsQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7QUFDakQsQ0FBQyxDQUFBO0FBVlksUUFBQSxjQUFjLGtCQVUxQjtBQUVEOzs7R0FHRztBQUNJLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBOEIsRUFBRSxNQUFrQixFQUE0QixFQUFFO0lBQ3ZHLE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUUsQ0FDL0IsS0FBSyxDQUFDLElBQUksQ0FDUixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUNoSSxDQUFBO0lBQ0gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDdEYsQ0FBQyxDQUFBO0FBTlksUUFBQSxRQUFRLFlBTXBCO0FBRUQsc0VBQXNFO0FBQy9ELE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxFQUFFLGFBQXFCLEVBQVUsRUFBRSxDQUN6RSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxhQUFhLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFBO0FBRDlDLFFBQUEsVUFBVSxjQUNvQyJ9