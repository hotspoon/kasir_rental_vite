import {
  createContext,
  useContext,
} from "react";

export type ShiftContextValue = {
  storeId: string | null;
  staffId: string | null;
  setShift: (v: { storeId: string; staffId: string }) => void;
  clearShift: () => void;
};

export const ShiftContext = createContext<ShiftContextValue | undefined>(
  undefined,
);

export function useShiftContext() {
  const value = useContext(ShiftContext);
  if (!value) {
    throw new Error("useShiftContext must be used within ShiftProvider");
  }
  return value;
}
