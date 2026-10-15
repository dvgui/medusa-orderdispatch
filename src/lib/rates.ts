import { toNumber } from "./build-order"
import type { ShippingRate } from "./orderdispatch-client/types"

export type RateChoice = Readonly<{ vendor: string; service: string; fallback?: string }>

/** Parcel weight in kg from cart lines (Medusa variant weights are grams). */
export const parcelWeightKg = (
  items: ReadonlyArray<Readonly<{ quantity?: unknown; variant?: Readonly<{ weight?: unknown }> | null }>> | null | undefined,
  packagingGrams: number
): number => {
  const grams = (items ?? []).reduce((sum, item) => {
    const weight = toNumber(item.variant?.weight)
    const quantity = toNumber(item.quantity)
    return sum + (Number.isFinite(weight) && Number.isFinite(quantity) ? weight * quantity : 0)
  }, packagingGrams)
  return Math.max(0.01, Math.round(grams) / 1000)
}

/**
 * The ODM rate for a service, else its fallback (DHL Economy Select doesn't
 * serve every country; ODM's rules then ship Express, so that's the price).
 */
export const pickRate = (rates: readonly ShippingRate[], choice: RateChoice): ShippingRate | undefined => {
  const find = (service: string) =>
    rates.find(
      (r) => r.Vendor?.trim().toLowerCase() === choice.vendor.toLowerCase() && r.Name?.trim().toLowerCase() === service.toLowerCase()
    )
  return find(choice.service) ?? (choice.fallback ? find(choice.fallback) : undefined)
}

/** Customer price: ODM's cost plus the markup, rounded to pennies. */
export const withMarkup = (price: number, markupPercent: number): number =>
  Math.round(price * (1 + markupPercent / 100) * 100) / 100
