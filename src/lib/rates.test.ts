import { describe, expect, it } from "bun:test"

import { parcelWeightKg, pickRate, withMarkup } from "./rates"

const rates = [
  { Vendor: "DHL Express", Name: "Economy Select International DDP", Price: 15.98 },
  { Vendor: "DHL Express", Name: "Express Worldwide DDP", Price: 31.83 },
  { Vendor: "OBA", Name: "Royal Mail Tracked 48", Price: 5.65 },
]

describe("live DHL pricing", () => {
  it("picks the DDP service ODM quotes", () => {
    expect(pickRate(rates, { vendor: "DHL Express", service: "Economy Select International DDP" })?.Price).toBe(15.98)
    expect(pickRate(rates, { vendor: "dhl express", service: "express worldwide ddp" })?.Price).toBe(31.83)
  })

  it("falls back to Express where Economy isn't offered (e.g. the US)", () => {
    const us = [{ Vendor: "DHL Express", Name: "Express Worldwide DDP", Price: 20.9 }]
    expect(
      pickRate(us, { vendor: "DHL Express", service: "Economy Select International DDP", fallback: "Express Worldwide DDP" })?.Price
    ).toBe(20.9)
    expect(pickRate(us, { vendor: "DHL Express", service: "Economy Select International DDP" })).toBeUndefined()
  })

  it("adds the markup and rounds to pennies", () => {
    expect(withMarkup(15.98, 20)).toBe(19.18)
    expect(withMarkup(31.83, 20)).toBe(38.2)
    expect(withMarkup(10, 0)).toBe(10)
  })

  it("weighs the parcel from variant grams plus packaging", () => {
    expect(parcelWeightKg([{ quantity: 2, variant: { weight: 110 } }, { quantity: { numeric: 1 }, variant: { weight: 30 } }], 50)).toBe(0.3)
    expect(parcelWeightKg([], 0)).toBe(0.01)
    expect(parcelWeightKg([{ quantity: 1, variant: null }], 50)).toBe(0.05)
  })
})
