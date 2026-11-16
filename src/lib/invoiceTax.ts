type TaxableItem = { quantity: number; unit_price: number; tax_rate?: number | null };

export function calculateInvoiceTotals(items: TaxableItem[], discount: number, taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const round = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
  // Null rates belong to older invoices, which used invoice-wide tax.
  const perItem = items.some((item) => item.tax_rate != null);
  const discountRatio = subtotal === 0 ? 0 : Math.max(0, subtotal - discount) / subtotal;
  const taxAmount = perItem
    ? round(items.reduce((sum, item) => sum + round(item.quantity * item.unit_price * discountRatio * ((item.tax_rate ?? taxRate) / 100)), 0))
    : (subtotal - discount) * taxRate / 100;
  return { subtotal, taxAmount, total: perItem ? round(subtotal - discount + taxAmount) : subtotal - discount + taxAmount };
}
