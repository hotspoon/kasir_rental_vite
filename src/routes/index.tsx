import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredShift } from "@/lib/shift-storage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const shift = getStoredShift();
    throw redirect({ to: shift ? "/checkout" : "/start-shift" });
  },
  component: IndexRedirect,
});

function IndexRedirect() {
  return null;
}
