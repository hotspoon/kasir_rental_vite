import { useMemo, useState, type PropsWithChildren } from "react";
import { ShiftContext, type ShiftContextValue } from "@/context/shift-context";
import {
  clearStoredShift,
  getStoredShift,
  saveStoredShift,
} from "@/lib/shift-storage";

export function ShiftProvider({ children }: PropsWithChildren) {
  const [storeId, setStoreId] = useState<string | null>(
    () => getStoredShift()?.storeId ?? null,
  );
  const [staffId, setStaffId] = useState<string | null>(
    () => getStoredShift()?.staffId ?? null,
  );

  const value = useMemo<ShiftContextValue>(
    () => ({
      storeId,
      staffId,
      setShift: ({ storeId: nextStoreId, staffId: nextStaffId }) => {
        setStoreId(nextStoreId);
        setStaffId(nextStaffId);
        saveStoredShift({ storeId: nextStoreId, staffId: nextStaffId });
      },
      clearShift: () => {
        setStoreId(null);
        setStaffId(null);
        clearStoredShift();
      },
    }),
    [staffId, storeId],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
