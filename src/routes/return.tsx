import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useShiftContext } from "@/context/shift-context";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  filterRentalsByQuery,
  listOpenRentals,
  returnRentals,
  toDisplayDate,
} from "@/lib/api/sakila";

export const Route = createFileRoute("/return")({
  component: ReturnPage,
});

function ReturnPage() {
  const queryClient = useQueryClient();
  const { storeId } = useShiftContext();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const rentalsQuery = useQuery({
    queryKey: queryKeys.openRentals(storeId ?? "unknown"),
    queryFn: () => listOpenRentals(storeId ?? ""),
    enabled: Boolean(storeId),
  });

  const rentals = useMemo(
    () => filterRentalsByQuery(rentalsQuery.data ?? [], query),
    [query, rentalsQuery.data],
  );

  const returnMutation = useMutation({
    mutationFn: async () => returnRentals(selectedIds),
    onSuccess: async (result) => {
      setStatus(
        `Returned: ${result.returned.length} | Skipped: ${result.skipped.length}`,
      );
      setSelectedIds([]);

      if (storeId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.openRentals(storeId),
        });
      }
    },
    onError: (error) => {
      setStatus(getErrorMessage(error));
    },
  });

  const selectedCount = selectedIds.length;
  const canSubmit = selectedCount > 0 && !returnMutation.isPending;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Return Rentals</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Cari customer atau rental ID, lalu return batch sekaligus.
      </p>

      <input
        className="mt-4 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
        placeholder="Search customer / rental ID"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-4 space-y-2">
        {rentals.map((rental) => {
          const isSelected = selectedIds.includes(rental.id);
          return (
            <label
              key={rental.id}
              className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                isSelected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds((prev) => [...prev, rental.id]);
                    } else {
                      setSelectedIds((prev) =>
                        prev.filter((value) => value !== rental.id),
                      );
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {rental.id} - {rental.filmTitle}
                  </p>
                  <p
                    className={`text-xs ${
                      rental.status === "LATE" ? "text-red-600" : "text-zinc-500"
                    }`}
                  >
                    {rental.status} | Due {toDisplayDate(rental.dueDate)}
                  </p>
                </div>
              </div>
            </label>
          );
        })}

        {rentalsQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Loading rentals...</p>
        ) : null}
      </div>

      {rentalsQuery.error ? (
        <p className="mt-2 text-sm text-red-600">
          {getErrorMessage(rentalsQuery.error)}
        </p>
      ) : null}

      <Button
        className="mt-4 w-full"
        disabled={!canSubmit}
        onClick={() => {
          setStatus("");
          returnMutation.mutate();
        }}
      >
        {returnMutation.isPending ? "Returning..." : "Return Selected"}
      </Button>
      {status ? <p className="mt-2 text-sm text-zinc-600">{status}</p> : null}
    </section>
  );
}
