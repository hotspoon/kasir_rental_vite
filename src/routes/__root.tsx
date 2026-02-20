import {
  createRootRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NotFoundPage } from "@/components/common/not-found-page";
import { useShiftContext } from "@/context/shift-context";
import { getStoredShift } from "@/lib/shift-storage";
import { Button } from "@/components/ui/button";

const RootLayout = () => {
  const navigate = useNavigate();
  const shift = useShiftContext();
  const isStarted = shift.hasActiveShift;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-zinc-900 text-zinc-100">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              Kasir Rental
            </span>
            <span className="text-sm">
              Store: {shift.storeId ?? "-"} | Kasir: {shift.staffId ?? "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/start-shift"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              Start Shift
            </Link>
            <Link
              to="/checkout"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800"
              activeProps={{ className: "bg-zinc-800" }}
            >
              Checkout
            </Link>
            <Link
              to="/return"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800"
              activeProps={{ className: "bg-zinc-800" }}
            >
              Return
            </Link>
            <Link
              to="/payments"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-800"
              activeProps={{ className: "bg-zinc-800" }}
            >
              Payment
            </Link>
            <Button
              variant="secondary"
              size="sm"
              disabled={!isStarted}
              onClick={() => {
                shift.clearShift();
                navigate({ to: "/start-shift" });
              }}
            >
              End Shift
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-5">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  );
};

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/start-shift") {
      return;
    }

    const shift = getStoredShift();
    if (!shift) {
      throw redirect({
        to: "/start-shift",
        search: {
          redirect: location.pathname,
        },
      });
    }
  },
  component: RootLayout,
  notFoundComponent: () => {
    return (
      <>
        <NotFoundPage />
      </>
    );
  },
});
