// Users who should retain access to the team leave calendar even if their
// general account role is changed to staff.
export const LEAVE_CALENDAR_ACCESS_USER_IDS = new Set([
  "8c8f10f9-2703-43dc-962a-88ab52731dbb", // Carlo Nickson
  "3ef3f06c-bae7-44e9-8637-feefae8a581c", // Jeano Pangan
  "74c38799-f057-4125-9eb2-dcdb1c4c5600", // Shenna Esguerra
  "7c423f1b-c119-43cf-a1a3-3900c3a509dc", // Majd Saleh
]);

export const EXCALIBUR_CALENDAR_VIEWER_USER_IDS = new Set([
  "7c423f1b-c119-43cf-a1a3-3900c3a509dc", // Majd Saleh
]);

export function hasLeaveCalendarAccess(userId: string | null) {
  return Boolean(userId && LEAVE_CALENDAR_ACCESS_USER_IDS.has(userId));
}

export function hasExcaliburCalendarViewerAccess(userId: string | null) {
  return Boolean(userId && EXCALIBUR_CALENDAR_VIEWER_USER_IDS.has(userId));
}
