import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useShiftContext } from "@/context/shift-context";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { listStaff, listStores } from "@/lib/api/sakila";

export const Route = createFileRoute("/start-shift")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string } => {
    const redirect =
      typeof search.redirect === "string" ? search.redirect : undefined;
    return redirect ? { redirect } : {};
  },
  component: StartShiftPage,
});

function StartShiftPage() {
  const navigate = useNavigate();
  const { setShift } = useShiftContext();
  const search = Route.useSearch();
  const [storeId, setStoreId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const storesQuery = useQuery({
    queryKey: queryKeys.stores,
    queryFn: listStores,
  });
  const staffQuery = useQuery({
    queryKey: queryKeys.staff,
    queryFn: listStaff,
  });

  const staffOptions = useMemo(
    () =>
      (staffQuery.data ?? []).filter((staff) =>
        storeId ? staff.storeId === storeId : true,
      ),
    [staffQuery.data, storeId],
  );

  const canSubmit =
    Boolean(storeId && staffId) &&
    !storesQuery.isLoading &&
    !staffQuery.isLoading;

  return (
    <section className="mx-auto w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Start Shift</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pilih store dan staff dulu sebelum masuk layar kasir.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Select Store
          </span>
          <select
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900"
            value={storeId}
            disabled={storesQuery.isLoading}
            onChange={(event) => {
              setStoreId(event.target.value);
              setStaffId("");
            }}
          >
            <option value="">Pilih store</option>
            {(storesQuery.data ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Select Staff
          </span>
          <select
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900"
            value={staffId}
            disabled={staffQuery.isLoading || !storeId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Pilih staff</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {storesQuery.error || staffQuery.error ? (
        <p className="mt-3 text-sm text-red-600">
          {getErrorMessage(storesQuery.error ?? staffQuery.error)}
        </p>
      ) : null}

      <Button
        className="mt-6 w-full"
        disabled={!canSubmit}
        onClick={() => {
          setShift({ storeId, staffId });
          navigate({ to: search.redirect ?? "/checkout" });
        }}
      >
        Start Shift
      </Button>
    </section>
  );
}
