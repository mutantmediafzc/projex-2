import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvoiceTotals } from "./invoiceTax.ts";

test("VAT only applies to selected items and includes quantity", () => {
  const result = calculateInvoiceTotals([
    { quantity: 2, unit_price: 100, tax_rate: 5 },
    { quantity: 1, unit_price: 100, tax_rate: 0 },
  ], 0, 5);
  assert.equal(result.subtotal, 300);
  assert.equal(result.taxAmount, 10);
  assert.equal(result.total, 310);
});

test("discount is shared proportionally between taxable and exempt items", () => {
  const result = calculateInvoiceTotals([
    { quantity: 1, unit_price: 100, tax_rate: 5 },
    { quantity: 1, unit_price: 100, tax_rate: 0 },
  ], 20, 5);
  assert.equal(result.taxAmount, 4.5);
  assert.equal(result.total, 184.5);
});

test("legacy items retain the invoice tax rate, including zero", () => {
  const items = [{ quantity: 2, unit_price: 100, tax_rate: null }];
  assert.equal(calculateInvoiceTotals(items, 20, 10).total, 198);
  assert.equal(calculateInvoiceTotals(items, 20, 0).total, 180);
});

test("all exempt and empty invoices have no VAT", () => {
  assert.equal(calculateInvoiceTotals([{ quantity: 1, unit_price: 100, tax_rate: 0 }], 0, 5).total, 100);
  assert.equal(calculateInvoiceTotals([], 0, 5).taxAmount, 0);
});

test("rounds per-item VAT to currency precision before summing", () => {
  const result = calculateInvoiceTotals([
    { quantity: 1, unit_price: 0.1, tax_rate: 5 },
    { quantity: 1, unit_price: 0.1, tax_rate: 5 },
  ], 0, 5);
  assert.equal(result.taxAmount, 0.02);
  assert.equal(result.total, 0.22);
});
