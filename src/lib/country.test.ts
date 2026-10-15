import { describe, expect, it } from "bun:test"

import { odmCountryName } from "./country"

const ODM = ["United Kingdom", "Germany", "Czech Republic", "Korea, South", "Russian Federation", "Ireland", "United States"]

describe("odmCountryName", () => {
  it("maps ISO codes to ODM's names", () => {
    expect(odmCountryName("gb", ODM)).toBe("United Kingdom")
    expect(odmCountryName("DE", ODM)).toBe("Germany")
    expect(odmCountryName("ie", ODM)).toBe("Ireland")
    expect(odmCountryName("US", ODM)).toBe("United States")
  })

  it("uses ODM's spelling where it differs from the English name", () => {
    expect(odmCountryName("cz", ODM)).toBe("Czech Republic")
    expect(odmCountryName("KR", ODM)).toBe("Korea, South")
    expect(odmCountryName("ru", ODM)).toBe("Russian Federation")
  })

  it("returns undefined for a country ODM doesn't list", () => {
    expect(odmCountryName("FR", ODM)).toBeUndefined()
    expect(odmCountryName("ZZ", ODM)).toBeUndefined()
  })
})
