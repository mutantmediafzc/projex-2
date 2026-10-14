export function canFilePastLeave(email: string | null | undefined): boolean {
  return ["jihan@mutant.ae", "ralf@mutant.ae"].includes(email?.toLowerCase() ?? "");
}

export function getLeaveToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
