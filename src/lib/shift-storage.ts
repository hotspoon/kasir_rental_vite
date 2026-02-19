export const SHIFT_STORAGE_KEY = "kasir-rental:active-shift";

export type StoredShift = {
  storeId: string;
  staffId: string;
};

function isStoredShift(value: unknown): value is StoredShift {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.storeId === "string" &&
    candidate.storeId.length > 0 &&
    typeof candidate.staffId === "string" &&
    candidate.staffId.length > 0
  );
}

export function getStoredShift(): StoredShift | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isStoredShift(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredShift(shift: StoredShift) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shift));
}

export function clearStoredShift() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SHIFT_STORAGE_KEY);
}
