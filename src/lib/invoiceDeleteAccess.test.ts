import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteInvoice } from "./invoiceDeleteAccess.ts";

test("only Ralf's email and Shenna's account can delete invoices", () => {
  assert.equal(canDeleteInvoice({ id: "ralf", email: "ralf@mutant.ae" }), true);
  assert.equal(canDeleteInvoice({ id: "ralf", email: "RALF@MUTANT.AE" }), true);
  assert.equal(canDeleteInvoice({ id: "74c38799-f057-4125-9eb2-dcdb1c4c5600" }), true);
  assert.equal(canDeleteInvoice({ id: "other", email: "admin@mutant.ae" }), false);
  assert.equal(canDeleteInvoice({ id: "other", email: "shenna@mutant.ae" }), false);
  assert.equal(canDeleteInvoice(null), false);
});
