/**
 * ODM's CreateOrder takes a country NAME from its own list
 * (GET /api/CreateOrder/GetCountries), not an ISO code. Most names match the
 * English region names; these are spelled differently in ODM's list.
 */
const ODM_ALIASES: Readonly<Record<string, readonly string[]>> = {
  BN: ["Brunei Darussalam"],
  CD: ["Congo"],
  CG: ["Congo"],
  CI: ["Ivory Coast"],
  CV: ["Cape Verde"],
  CZ: ["Czech Republic"],
  FM: ["Micronesia"],
  KP: ["North Korea"],
  KR: ["Korea, South"],
  LA: ["Laos"],
  MK: ["Macedonia"],
  PS: ["State of Palestine"],
  RU: ["Russian Federation"],
  SY: ["Syria", "Syrian Arab Republic"],
  SZ: ["Swaziland"],
  TR: ["Turkey"],
  VA: ["Vatican City State"],
  XK: ["Kosovo"],
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const englishName = (iso2: string): string | undefined => {
  try {
    return regionNames.of(iso2)
  } catch {
    return undefined
  }
}

/** ODM's name for an ISO 3166-1 alpha-2 code, or undefined when ODM doesn't list it. */
export const odmCountryName = (iso2: string, odmCountries: readonly string[]): string | undefined => {
  const code = iso2.trim().toUpperCase()
  const byLower = new Map(odmCountries.map((name) => [name.trim().toLowerCase(), name.trim()]))
  const candidates = [...(ODM_ALIASES[code] ?? []), englishName(code)].filter((n): n is string => Boolean(n))
  return candidates.map((n) => byLower.get(n.toLowerCase())).find(Boolean)
}
