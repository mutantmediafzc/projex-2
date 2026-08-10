"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import InvoicePdfModal from "./InvoicePdfModal";
import type { Invoice as ManagedInvoice, InvoiceSettings, InvoiceItem } from "./InvoiceManagement";

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street_address: string | null;
  town: string | null;
  country: string | null;
};

type Invoice = {
  id: string;
  project_id?: string | null;
  invoice_number: string;
  invoice_type: "quote" | "invoice";
  status: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
  items?: InvoiceItem[];
};

type PaymentBreakdownStatus = "pending" | "paid" | "due" | "cancelled";

type PaymentBreakdownForm = {
  id?: string;
  generated_invoice_id?: string | null;
  generated_invoice_number?: string | null;
  description: string;
  amount: number;
  due_date: string;
  status: PaymentBreakdownStatus;
};

type Props = {
  invoice: Invoice;
  settings: InvoiceSettings | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function InvoiceEditModal({ invoice, settings, onClose, onSaved }: Props) {
  // Company search
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState(invoice.client_name || "");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  // Form state - pre-filled from invoice
  const [formInvoiceNumber, setFormInvoiceNumber] = useState(invoice.invoice_number);
  const [formClientName, setFormClientName] = useState(invoice.client_name || "");
  const [formClientEmail, setFormClientEmail] = useState(invoice.client_email || "");
  const [formClientPhone, setFormClientPhone] = useState(invoice.client_phone || "");
  const [formClientAddress, setFormClientAddress] = useState(invoice.client_address || "");
  const [formIssueDate, setFormIssueDate] = useState(invoice.issue_date?.split("T")[0] || "");
  const [formDueDate, setFormDueDate] = useState(invoice.due_date?.split("T")[0] || "");
  const [formPaidDate, setFormPaidDate] = useState(invoice.paid_date?.split("T")[0] || "");
  const [formNotes, setFormNotes] = useState(invoice.notes || "");
  const [formItems, setFormItems] = useState<{ id?: string; description: string; quantity: number; unit_price: number }[]>([]);
  const [formTaxRate, setFormTaxRate] = useState(invoice.tax_rate || 0);
  const [formDiscount, setFormDiscount] = useState(invoice.discount_amount || 0);
  const [formStatus, setFormStatus] = useState(invoice.status);
  const [formCurrency, setFormCurrency] = useState(invoice.currency || "AED");
  const [formPaymentBreakdowns, setFormPaymentBreakdowns] = useState<PaymentBreakdownForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingBreakdownId, setGeneratingBreakdownId] = useState<string | null>(null);
  const [generatedPdfInvoice, setGeneratedPdfInvoice] = useState<ManagedInvoice | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Load companies
  useEffect(() => {
    async function loadCompanies() {
      const { data } = await supabaseClient
        .from("companies")
        .select("id, name, email, phone, street_address, town, country")
        .order("name");
      if (data) setCompanies(data as Company[]);
    }
    loadCompanies();
  }, []);

  // Load invoice items
  useEffect(() => {
    async function loadItems() {
      setLoadingItems(true);
      const [{ data }, { data: breakdownData }] = await Promise.all([
        supabaseClient
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", invoice.id)
          .order("sort_order"),
        supabaseClient
          .from("invoice_payment_breakdowns")
          .select("id, generated_invoice_id, description, amount, due_date, status")
          .eq("invoice_id", invoice.id)
          .order("sort_order"),
      ]);
      
      if (data && data.length > 0) {
        setFormItems(data.map((item) => ({
          id: item.id,
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
        })));
      } else {
        setFormItems([{ description: "", quantity: 1, unit_price: 0 }]);
      }
      const generatedInvoiceIds = (breakdownData || []).flatMap((item) => item.generated_invoice_id ? [item.generated_invoice_id] : []);
      const { data: generatedInvoices } = generatedInvoiceIds.length > 0
        ? await supabaseClient.from("invoices").select("id, invoice_number").in("id", generatedInvoiceIds)
        : { data: [] };
      const generatedInvoiceNumbers = new Map((generatedInvoices || []).map((item) => [item.id, item.invoice_number]));
      setFormPaymentBreakdowns((breakdownData || []).map((item) => ({
        id: item.id,
        generated_invoice_id: item.generated_invoice_id || null,
        generated_invoice_number: item.generated_invoice_id ? generatedInvoiceNumbers.get(item.generated_invoice_id) || null : null,
        description: item.description || "",
        amount: Number(item.amount) || 0,
        due_date: item.due_date || "",
        status: (item.status || "pending") as PaymentBreakdownStatus,
      })));
      setLoadingItems(false);
    }
    loadItems();
  }, [invoice.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Select company and auto-fill
  function handleSelectCompany(company: Company) {
    setFormClientName(company.name);
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
    const addressParts = [company.street_address, company.town, company.country].filter(Boolean);
    setFormClientAddress(addressParts.join(", "));
    if (company.email) setFormClientEmail(company.email);
    if (company.phone) setFormClientPhone(company.phone);
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const subtotal = formItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = (subtotal - formDiscount) * (formTaxRate / 100);
  const total = subtotal - formDiscount + taxAmount;
  const paymentBreakdownTotal = formPaymentBreakdowns.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const paidBreakdownTotal = formPaymentBreakdowns
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const paymentBalance = Math.max(0, total - paidBreakdownTotal);
  const paymentBreakdownError = paymentBreakdownTotal > total + 0.01
    ? `Payment breakdowns exceed the invoice total by ${(paymentBreakdownTotal - total).toFixed(2)} ${formCurrency}.`
    : null;

  function addItem() {
    setFormItems([...formItems, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index: number) {
    setFormItems(formItems.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string | number) {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  }

  function addPaymentBreakdown() {
    setFormPaymentBreakdowns((items) => [
      ...items,
      { description: "", amount: 0, due_date: "", status: "pending" },
    ]);
  }

  function removePaymentBreakdown(index: number) {
    if (formPaymentBreakdowns[index]?.generated_invoice_id) {
      setFormError("This payment breakdown already has a generated invoice and cannot be removed.");
      return;
    }
    setFormPaymentBreakdowns((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function updatePaymentBreakdown(index: number, field: keyof PaymentBreakdownForm, value: string | number) {
    setFormPaymentBreakdowns((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function openGeneratedInvoice(invoiceId: string) {
    try {
      setFormError(null);
      const [{ data: generatedInvoice, error: invoiceError }, { data: generatedItems, error: itemsError }] = await Promise.all([
        supabaseClient.from("invoices").select("*").eq("id", invoiceId).single(),
        supabaseClient.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("sort_order"),
      ]);
      if (invoiceError || !generatedInvoice) throw invoiceError || new Error("Generated invoice was not found.");
      if (itemsError) throw itemsError;
      setGeneratedPdfInvoice({
        ...generatedInvoice,
        items: (generatedItems || []) as InvoiceItem[],
        payment_breakdowns: formPaymentBreakdowns.map((item, index) => ({
          id: item.id || `payment-breakdown-${index}`,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date || null,
          status: item.status,
          sort_order: index,
        })),
        payment_breakdown_parent_invoice_number: formInvoiceNumber,
        is_payment_breakdown_invoice: true,
      } as ManagedInvoice);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to open the generated invoice.");
    }
  }

  async function syncAndOpenBreakdownInvoice(index: number) {
    const breakdown = formPaymentBreakdowns[index];
    if (!breakdown.id || !breakdown.generated_invoice_id || breakdown.amount <= 0 || total <= 0) return;

    try {
      setGeneratingBreakdownId(breakdown.id);
      setFormError(null);
      const childTotal = Number(breakdown.amount.toFixed(2));
      const ratio = childTotal / total;
      const childSubtotal = Number((subtotal * ratio).toFixed(2));
      const childDiscount = Number((formDiscount * ratio).toFixed(2));
      const childTax = Number((childTotal - childSubtotal + childDiscount).toFixed(2));

      const { error: invoiceError } = await supabaseClient.from("invoices").update({
        project_id: invoice.project_id || null,
        invoice_type: "invoice",
        status: formStatus,
        client_name: formClientName,
        client_email: formClientEmail || null,
        client_phone: formClientPhone || null,
        client_address: formClientAddress || null,
        issue_date: formIssueDate,
        due_date: formDueDate || null,
        paid_date: formPaidDate || null,
        subtotal: childSubtotal,
        tax_rate: formTaxRate,
        tax_amount: childTax,
        discount_amount: childDiscount,
        total: childTotal,
        currency: formCurrency,
        notes: formNotes || null,
        company_name: invoice.company_name,
        company_logo_url: invoice.company_logo_url,
        company_address: invoice.company_address,
        company_phone: invoice.company_phone,
        company_email: invoice.company_email,
        bank_name: invoice.bank_name,
        bank_account_number: invoice.bank_account_number,
        bank_iban: invoice.bank_iban,
        updated_at: new Date().toISOString(),
      }).eq("id", breakdown.generated_invoice_id);
      if (invoiceError) throw invoiceError;

      const { error: deleteError } = await supabaseClient.from("invoice_items").delete().eq("invoice_id", breakdown.generated_invoice_id);
      if (deleteError) throw deleteError;
      const generatedItems = formItems.filter((item) => item.description.trim()).map((item, itemIndex) => ({
        invoice_id: breakdown.generated_invoice_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: itemIndex,
      }));
      if (generatedItems.length > 0) {
        const { error: itemsError } = await supabaseClient.from("invoice_items").insert(generatedItems);
        if (itemsError) throw itemsError;
      }
      await openGeneratedInvoice(breakdown.generated_invoice_id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update the generated invoice.");
    } finally {
      setGeneratingBreakdownId(null);
    }
  }

  async function generateBreakdownInvoice(index: number) {
    const breakdown = formPaymentBreakdowns[index];
    if (!breakdown.id) {
      setFormError("Save the parent invoice before generating an invoice for this new payment breakdown.");
      return;
    }
    if (breakdown.generated_invoice_id || breakdown.amount <= 0) return;

    let generatedInvoiceId: string | null = null;
    try {
      setGeneratingBreakdownId(breakdown.id);
      setFormError(null);

      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) throw new Error("You must be signed in to generate an invoice.");
      if (total <= 0) throw new Error("The parent invoice total must be greater than zero.");

      const childTotal = Number(breakdown.amount.toFixed(2));
      const ratio = childTotal / total;
      const childSubtotal = Number((subtotal * ratio).toFixed(2));
      const childDiscount = Number((formDiscount * ratio).toFixed(2));
      const childTax = Number((childTotal - childSubtotal + childDiscount).toFixed(2));
      const childInvoiceNumber = `${formInvoiceNumber}-${index + 1}`;

      const { data: generatedInvoice, error: invoiceError } = await supabaseClient
        .from("invoices")
        .insert({
          project_id: invoice.project_id || null,
          invoice_number: childInvoiceNumber,
          invoice_type: "invoice",
          status: formStatus,
          client_name: formClientName,
          client_email: formClientEmail || null,
          client_phone: formClientPhone || null,
          client_address: formClientAddress || null,
          issue_date: formIssueDate,
          due_date: formDueDate || null,
          paid_date: formPaidDate || null,
          subtotal: childSubtotal,
          tax_rate: formTaxRate,
          tax_amount: childTax,
          discount_amount: childDiscount,
          total: childTotal,
          currency: formCurrency,
          notes: formNotes || null,
          company_name: invoice.company_name,
          company_logo_url: invoice.company_logo_url,
          company_address: invoice.company_address,
          company_phone: invoice.company_phone,
          company_email: invoice.company_email,
          bank_name: invoice.bank_name,
          bank_account_number: invoice.bank_account_number,
          bank_iban: invoice.bank_iban,
          created_by: authData.user.id,
        })
        .select("id")
        .single();
      if (invoiceError || !generatedInvoice) throw invoiceError || new Error("Failed to create invoice.");
      generatedInvoiceId = generatedInvoice.id;

      const generatedItems = formItems
        .filter((item) => item.description.trim())
        .map((item, itemIndex) => ({
          invoice_id: generatedInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
          sort_order: itemIndex,
        }));

      if (generatedItems.length > 0) {
        const { error: itemsError } = await supabaseClient.from("invoice_items").insert(generatedItems);
        if (itemsError) throw itemsError;
      }

      const { error: linkError } = await supabaseClient
        .from("invoice_payment_breakdowns")
        .update({ generated_invoice_id: generatedInvoice.id, updated_at: new Date().toISOString() })
        .eq("id", breakdown.id)
        .is("generated_invoice_id", null);
      if (linkError) throw linkError;

      setFormPaymentBreakdowns((items) => items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, generated_invoice_id: generatedInvoice.id, generated_invoice_number: childInvoiceNumber } : item
      )));
      await openGeneratedInvoice(generatedInvoice.id);
    } catch (err) {
      if (generatedInvoiceId) {
        await supabaseClient.from("invoices").delete().eq("id", generatedInvoiceId);
      }
      setFormError(err instanceof Error ? err.message : "Failed to generate the payment invoice.");
    } finally {
      setGeneratingBreakdownId(null);
    }
  }

  async function handleSubmit() {
    if (!formClientName.trim()) return;
    if (paymentBreakdownError) {
      setFormError(paymentBreakdownError);
      return;
    }
    try {
      setSaving(true);
      setFormError(null);

      // Update the invoice
      const { error: updateError } = await supabaseClient.from("invoices").update({
        invoice_number: formInvoiceNumber,
        status: formStatus,
        client_name: formClientName,
        client_email: formClientEmail || null,
        client_phone: formClientPhone || null,
        client_address: formClientAddress || null,
        issue_date: formIssueDate,
        due_date: formDueDate || null,
        paid_date: formPaidDate || null,
        subtotal,
        tax_rate: formTaxRate,
        tax_amount: taxAmount,
        discount_amount: formDiscount,
        total,
        currency: formCurrency,
        notes: formNotes || null,
        updated_at: new Date().toISOString(),
      }).eq("id", invoice.id);

      if (updateError) throw updateError;

      // Delete existing items and re-insert
      await supabaseClient.from("invoice_items").delete().eq("invoice_id", invoice.id);

      const itemsToInsert = formItems.filter(item => item.description.trim()).map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: index,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabaseClient.from("invoice_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      const validBreakdowns = formPaymentBreakdowns.filter((item) => item.amount > 0);
      const retainedBreakdownIds = validBreakdowns.flatMap((item) => item.id ? [item.id] : []);
      let breakdownDeleteQuery = supabaseClient
        .from("invoice_payment_breakdowns")
        .delete()
        .eq("invoice_id", invoice.id);
      if (retainedBreakdownIds.length > 0) {
        breakdownDeleteQuery = breakdownDeleteQuery.not("id", "in", `(${retainedBreakdownIds.join(",")})`);
      }
      const { error: breakdownDeleteError } = await breakdownDeleteQuery;
      if (breakdownDeleteError) throw breakdownDeleteError;

      for (const [index, item] of validBreakdowns.entries()) {
        const values = {
          invoice_id: invoice.id,
          description: item.description.trim() || "Payment installment",
          amount: Number(item.amount.toFixed(2)),
          due_date: item.due_date || null,
          status: item.status,
          sort_order: index,
          updated_at: new Date().toISOString(),
        };
        const { error: breakdownSaveError } = item.id
          ? await supabaseClient.from("invoice_payment_breakdowns").update(values).eq("id", item.id)
          : await supabaseClient.from("invoice_payment_breakdowns").insert(values);
        if (breakdownSaveError) throw breakdownSaveError;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to update invoice:", err);
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = invoice.invoice_type === "quote"
    ? ["draft", "sent", "accepted", "rejected", "cancelled"]
    : ["active", "sent", "unpaid", "paid", "overdue", "cancelled", "partially_paid"];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Edit {invoice.invoice_type === "quote" ? "Quote" : "Invoice"}</h3>
            <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>

        {loadingItems ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Invoice Number & Status */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Invoice Details</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input 
                    type="text" 
                    value={formInvoiceNumber} 
                    onChange={(e) => setFormInvoiceNumber(e.target.value)} 
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value)} 
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Currency</label>
                  <select 
                    value={formCurrency} 
                    onChange={(e) => setFormCurrency(e.target.value)} 
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Client Details</h4>
              <div className="space-y-4">
                {/* Company Search Dropdown */}
                <div ref={companyRef} className="relative">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Search Company</label>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => { setCompanySearch(e.target.value); setShowCompanyDropdown(true); }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    placeholder="Search companies to auto-fill..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                  />
                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                      {filteredCompanies.slice(0, 8).map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleSelectCompany(company)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 text-[11px] font-bold">
                            {(company.name || "C")[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-slate-900">{company.name}</p>
                            {company.email && <p className="text-[11px] text-slate-500">{company.email}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Client Name *</label>
                    <input type="text" value={formClientName} onChange={(e) => setFormClientName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email</label>
                    <input type="email" value={formClientEmail} onChange={(e) => setFormClientEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formClientPhone} onChange={(e) => setFormClientPhone(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address</label>
                    <input type="text" value={formClientAddress} onChange={(e) => setFormClientAddress(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Dates</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input type="date" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paid Date</label>
                  <input type="date" value={formPaidDate} onChange={(e) => setFormPaidDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Line Items</h4>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Description</label>
                        <textarea
                          placeholder="Item description..."
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-black focus:border-violet-400 focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="w-20">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Qty</label>
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)} 
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-black text-center focus:border-violet-400 focus:outline-none" 
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Price</label>
                          <input 
                            type="number" 
                            value={item.unit_price} 
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} 
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-black text-right focus:border-violet-400 focus:outline-none" 
                          />
                        </div>
                        <div className="w-24 text-right">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Amount</label>
                          <p className="py-2 text-[14px] font-bold text-slate-900">{(item.quantity * item.unit_price).toFixed(2)}</p>
                        </div>
                        {formItems.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100">×</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <input type="number" value={formTaxRate} onChange={(e) => setFormTaxRate(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Discount</label>
                <input type="number" value={formDiscount} onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes</label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-black focus:border-violet-400 focus:outline-none" />
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-[13px]"><span className="text-slate-700">Subtotal</span><span className="font-semibold text-slate-900">{subtotal.toFixed(2)}</span></div>
              {formDiscount > 0 && <div className="flex justify-between text-[13px]"><span className="text-slate-700">Discount</span><span className="font-semibold text-red-600">-{formDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-[13px]"><span className="text-slate-700">Tax ({formTaxRate}%)</span><span className="font-semibold text-slate-900">{taxAmount.toFixed(2)}</span></div>
              {paidBreakdownTotal > 0 ? (
                <>
                  <div className="flex justify-between text-[13px]"><span className="text-slate-700">Total</span><span className="font-semibold text-slate-900">{formCurrency} {total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[13px]"><span className="text-slate-700">Total Paid</span><span className="font-semibold text-emerald-700">-{formCurrency} {paidBreakdownTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[15px] font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Final Amount</span><span className="text-violet-600">{formCurrency} {paymentBalance.toFixed(2)}</span></div>
                </>
              ) : (
                <div className="flex justify-between text-[15px] font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-slate-900">{formCurrency} {total.toFixed(2)}</span></div>
              )}
            </div>

            {/* Payment Breakdowns */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Breakdowns</h4>
                  <p className="mt-1 text-[11px] text-slate-500">Add installments or payment portions. Their combined amount cannot exceed the invoice total.</p>
                </div>
                <button type="button" onClick={addPaymentBreakdown} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
                  Add Payment
                </button>
              </div>

              {formPaymentBreakdowns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-[12px] text-slate-500">No payment breakdowns added.</div>
              ) : (
                <div className="space-y-3">
                  {formPaymentBreakdowns.map((item, index) => (
                    <div key={item.id || `new-${index}`} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_140px_130px_auto] sm:items-end">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-slate-500">Description</label>
                          <input type="text" value={item.description} onChange={(event) => updatePaymentBreakdown(index, "description", event.target.value)} placeholder="e.g. First installment" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:border-violet-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-slate-500">Amount</label>
                          <input type="number" min="0" step="0.01" value={item.amount || ""} onChange={(event) => updatePaymentBreakdown(index, "amount", parseFloat(event.target.value) || 0)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:border-violet-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-slate-500">Due date</label>
                          <input type="date" value={item.due_date} onChange={(event) => updatePaymentBreakdown(index, "due_date", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:border-violet-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-slate-500">Status</label>
                          <select value={item.status} onChange={(event) => updatePaymentBreakdown(index, "status", event.target.value as PaymentBreakdownStatus)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:border-violet-400 focus:outline-none">
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="due">Due</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => removePaymentBreakdown(index)} disabled={Boolean(item.generated_invoice_id)} aria-label={`Remove payment breakdown ${index + 1}`} className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40">Ã—</button>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-3 border-t border-violet-100 pt-3">
                        {item.generated_invoice_id && <span className="text-[11px] font-medium text-emerald-700">Invoice {item.generated_invoice_number || `${formInvoiceNumber}-${index + 1}`} generated</span>}
                        <button
                          type="button"
                          onClick={() => item.generated_invoice_id ? syncAndOpenBreakdownInvoice(index) : generateBreakdownInvoice(index)}
                          disabled={!item.id || generatingBreakdownId !== null || item.amount <= 0}
                          title={!item.id ? "Save the parent invoice first" : undefined}
                          className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {generatingBreakdownId === item.id ? (item.generated_invoice_id ? "Updating..." : "Generating...") : item.generated_invoice_id ? "View Invoice" : "Generate Invoice"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(paymentBreakdownError || formError) && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{paymentBreakdownError || formError}</p>}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex justify-between text-[12px]"><span className="text-slate-600">Breakdowns total</span><span className="font-semibold text-slate-900">{formCurrency} {paymentBreakdownTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-slate-600">Paid breakdowns</span><span className="font-semibold text-emerald-700">{formCurrency} {paidBreakdownTotal.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-[14px] font-bold"><span className="text-slate-900">Invoice balance</span><span className={paymentBalance > 0.01 ? "text-amber-700" : "text-emerald-700"}>{formCurrency} {paymentBalance.toFixed(2)}</span></div>
                {paidBreakdownTotal > 0 && <p className="text-[11px] text-slate-500">Balance reflects payment breakdowns marked as paid.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !formClientName.trim() || loadingItems || Boolean(paymentBreakdownError)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
      {generatedPdfInvoice && (
        <InvoicePdfModal
          invoice={generatedPdfInvoice}
          settings={settings}
          onClose={() => setGeneratedPdfInvoice(null)}
        />
      )}
    </div>
  );
}
