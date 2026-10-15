/**
 * ODM namespaces each client's stock items with a company prefix (Add Item
 * shows a fixed "KREL-" before the SKU), while Medusa's warehouse SKUs stay
 * plain ("RETATRUTIDE-10MG"). An order line must carry the SKU exactly as ODM
 * stores it, so each Medusa SKU resolves to the stock item that exists:
 * the plain SKU first, then `prefix + SKU`.
 */
export const odmCandidates = (sku: string, prefix: string): string[] => {
  const plain = sku.trim()
  const prefixed = prefix && !plain.toUpperCase().startsWith(prefix.toUpperCase()) ? `${prefix}${plain}` : ""
  return prefixed ? [plain, prefixed] : [plain]
}

/** The SKU to send when ODM's stock list isn't consulted. */
export const odmSkuFor = (sku: string, prefix: string): string => {
  const candidates = odmCandidates(sku, prefix)
  return candidates[candidates.length - 1]
}

export type SkuResolution = Readonly<{
  /** Medusa SKU → ODM stock item number, in ODM's own casing. */
  resolved: ReadonlyMap<string, string>
  missing: readonly string[]
}>

export const resolveOdmSkus = (
  skus: readonly string[],
  stockItemNumbers: readonly string[],
  prefix: string
): SkuResolution => {
  const byUpper = new Map(stockItemNumbers.map((n) => [n.trim().toUpperCase(), n.trim()]))
  const resolved = new Map<string, string>()
  const missing: string[] = []
  for (const sku of new Set(skus)) {
    const hit = odmCandidates(sku, prefix)
      .map((candidate) => byUpper.get(candidate.toUpperCase()))
      .find(Boolean)
    if (hit) resolved.set(sku, hit)
    else missing.push(sku)
  }
  return { resolved, missing }
}
