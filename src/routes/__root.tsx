import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
import type { Context } from "react";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NotFoundPage } from "@/components/common/not-found-page";
import type { ShiftContextValue } from "@/context/shift-context";

export interface MyRouterContext {
  shiftContext: Context<ShiftContextValue | undefined>;
}

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/about" className="[&.active]:font-bold">
        About
      </Link>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools />
  </>
);

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
  notFoundComponent: () => {
    return (
      <>
        <NotFoundPage />
      </>
    );
  },
});
