import { useShallow } from "zustand/react/shallow";
import type { StoredShift } from "@/lib/shift-storage";
import { useShiftStore } from "@/stores/shift-store";

export type ShiftContextValue = {
  storeId: string | null;
  staffId: string | null;
  hasActiveShift: boolean;
  setShift: (v: StoredShift) => void;
  clearShift: () => void;
};

export function useShiftContext() {
  return useShiftStore(
    useShallow((state) => ({
      storeId: state.storeId,
      staffId: state.staffId,
      hasActiveShift: state.hasActiveShift,
      setShift: state.setShift,
      clearShift: state.clearShift,
    })),
  );
}
