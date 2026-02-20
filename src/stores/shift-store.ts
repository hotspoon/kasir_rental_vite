import { create } from "zustand";
import {
  clearStoredShift,
  getStoredShift,
  saveStoredShift,
  type StoredShift,
} from "@/lib/shift-storage";

export type ShiftStoreState = {
  storeId: string | null;
  staffId: string | null;
  hasActiveShift: boolean;
  setShift: (shift: StoredShift) => void;
  clearShift: () => void;
};

const initialShift = getStoredShift();

export const useShiftStore = create<ShiftStoreState>((set) => ({
  storeId: initialShift?.storeId ?? null,
  staffId: initialShift?.staffId ?? null,
  hasActiveShift: Boolean(initialShift?.storeId && initialShift?.staffId),
  setShift: (shift) => {
    saveStoredShift(shift);
    set({
      storeId: shift.storeId,
      staffId: shift.staffId,
      hasActiveShift: true,
    });
  },
  clearShift: () => {
    clearStoredShift();
    set({
      storeId: null,
      staffId: null,
      hasActiveShift: false,
    });
  },
}));
