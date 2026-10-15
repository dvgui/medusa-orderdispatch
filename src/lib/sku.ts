/**
 * ODM namespaces each client's stock items with a company prefix (Add Item and
 * the inventory import turn RETATRUTIDE-10MG into KREL-RETATRUTIDE-10MG),
 * while Medusa's warehouse SKUs stay plain. An order line must carry the stock
 * item ODM holds — its exact SKU and its StockItemId — so each Medusa SKU
 * resolves to the stock item that exists: the plain SKU first, then
 * `prefix + SKU`.
 */
export const odmCandidates = (sku: string, prefix: string): string[] => {
  const plain = sku.trim()
  const prefixed = prefix && !plain.toUpperCase().startsWith(prefix.toUpperCase()) ? `${prefix}${plain}` : ""
  return prefixed ? [plain, prefixed] : [plain]
}

export type OdmStockItem = Readonly<{ Sku: string; StockItemId: string }>

/** The stock item for one Medusa SKU among ODM search results, if any. */
export const matchOdmStockItem = (
  sku: string,
  results: ReadonlyArray<OdmStockItem>,
  prefix: string
): OdmStockItem | undefined => {
  const bySku = new Map(results.map((r) => [r.Sku.trim().toUpperCase(), r]))
  return odmCandidates(sku, prefix)
    .map((candidate) => bySku.get(candidate.toUpperCase()))
    .find((hit): hit is OdmStockItem => Boolean(hit?.StockItemId))
}
