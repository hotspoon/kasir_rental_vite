import { useMemo, useState, type PropsWithChildren } from "react";
import { ShiftContext, type ShiftContextValue } from "@/context/shift-context";

export function ShiftProvider({ children }: PropsWithChildren) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  const value = useMemo<ShiftContextValue>(
    () => ({
      storeId,
      staffId,
      setShift: ({ storeId: nextStoreId, staffId: nextStaffId }) => {
        setStoreId(nextStoreId);
        setStaffId(nextStaffId);
      },
      clearShift: () => {
        setStoreId(null);
        setStaffId(null);
      },
    }),
    [staffId, storeId],
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
