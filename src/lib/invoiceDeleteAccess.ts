export function canDeleteInvoice(user: { id: string; email?: string | null } | null): boolean {
  return user?.id === "74c38799-f057-4125-9eb2-dcdb1c4c5600"
    || user?.email?.toLowerCase() === "ralf@mutant.ae";
}
