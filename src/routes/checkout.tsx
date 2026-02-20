import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useShiftContext } from "@/context/shift-context";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  checkoutRental,
  getFilmAvailability,
  lookupCustomers,
  lookupFilms,
  type Customer,
} from "@/lib/api/sakila";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type CartItem = {
  filmId: string;
  title: string;
  qty: number;
};

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { storeId, staffId } = useShiftContext();
  const [customerQuery, setCustomerQuery] = useState("");
  const [filmQuery, setFilmQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<{
    tone: "error";
    text: string;
  } | null>(null);

  // const deferredCustomerQuery = useDeferredValue(customerQuery);
  const deferredFilmQuery = useDeferredValue(filmQuery);
  const debouncedCustomerQuery = useDebouncedValue(customerQuery, 350);

  const customersQuery = useQuery({
    queryKey: queryKeys.customers(debouncedCustomerQuery || "__default__"),
    queryFn: () =>
      lookupCustomers(debouncedCustomerQuery.trim()), // kosong = default list
    staleTime: 30_000,
  });

  const filmsQuery = useQuery({
    queryKey: queryKeys.films(deferredFilmQuery),
    queryFn: () => lookupFilms(deferredFilmQuery),
  });

  const films = useMemo(() => filmsQuery.data ?? [], [filmsQuery.data]);

  const availabilityQueries = useQueries({
    queries: films.map((film) => ({
      queryKey: queryKeys.filmAvailability(storeId ?? "unknown", film.id),
      queryFn: () => getFilmAvailability(film.id, storeId ?? ""),
      enabled: Boolean(storeId),
    })),
  });

  const availabilityMap = useMemo(() => {
    return Object.fromEntries(
      films.map((film, index) => [
        film.id,
        availabilityQueries[index]?.data ?? { available: 0, total: 0 },
      ]),
    );
  }, [availabilityQueries, films]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) {
        throw new Error("Pilih customer terlebih dahulu.");
      }
      if (!storeId || !staffId) {
        throw new Error("Shift belum aktif.");
      }

      return checkoutRental({
        customerId: selectedCustomer.id,
        staffId,
        storeId,
        cart: cart.map((item) => ({ filmId: item.filmId, qty: item.qty })),
      });
    },
    onSuccess: async (result) => {
      setCart([]);
      setStatus(null);

      if (storeId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.openRentals(storeId),
        });
      }

      navigate({
        to: "/invoice/$id",
        params: { id: result.invoiceId },
        search: { message: result.message },
      });
    },
    onError: (error) => {
      setStatus({
        tone: "error",
        text: getErrorMessage(error),
      });
    },
  });

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.qty, 0),
    [cart],
  );
  const cartQtyMap = useMemo(
    () => Object.fromEntries(cart.map((item) => [item.filmId, item.qty])),
    [cart],
  );

  const canSubmit = Boolean(
    selectedCustomer &&
      cart.length > 0 &&
      storeId &&
      staffId &&
      !checkoutMutation.isPending,
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Customer
          </h2>
          <input
            className="mt-3 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
            placeholder="Search customer..."
            value={customerQuery}
            onChange={(event) => setCustomerQuery(event.target.value)}
          />
          <div className="mt-3 max-h-72 space-y-2 overflow-auto">
            {(customersQuery.data ?? []).map((customer) => {
              const isActive = selectedCustomer?.id === customer.id;
              return (
                <button
                  key={customer.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    isActive
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50"
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs opacity-80">{customer.phone}</div>
                </button>
              );
            })}
            {customersQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Loading customer...</p>
            ) : null}
          </div>
          {customersQuery.error ? (
            <p className="mt-2 text-sm text-red-600">
              {getErrorMessage(customersQuery.error)}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Cart
            </h2>
            <span className="text-sm text-zinc-600">{cartCount} item</span>
          </div>
          <div className="mt-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada film di cart.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.filmId}
                  className="flex items-center justify-between rounded-md border border-zinc-200 p-2 text-sm"
                >
                  <span>{item.title}</span>
                  <div className="flex items-center gap-2">
                    <span>x{item.qty}</span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        setCart((prev) => prev.filter((v) => v.filmId !== item.filmId))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button
            className="mt-4 w-full"
            disabled={!canSubmit}
            onClick={() => {
              setStatus(null);
              checkoutMutation.mutate();
            }}
          >
            {checkoutMutation.isPending ? "Submitting..." : "Submit Checkout"}
          </Button>
          {status ? (
            <p className="mt-2 text-sm text-red-600">{status.text}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Film Search
        </h2>
        <input
          className="mt-3 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
          placeholder="Cari title film..."
          value={filmQuery}
          onChange={(event) => setFilmQuery(event.target.value)}
        />
        <div className="mt-3 grid gap-2">
          {films.map((film) => {
            const stock = availabilityMap[film.id] ?? { available: 0, total: 0 };
            const cartQty = cartQtyMap[film.id] ?? 0;
            const isOutOfStock = stock.available <= 0;
            const hasReachedLimit = stock.available > 0 && cartQty >= stock.available;
            const disabled = isOutOfStock || hasReachedLimit;

            return (
              <div
                key={film.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 p-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">{film.title}</p>
                  <p
                    className={`text-xs ${
                      isOutOfStock ? "text-zinc-400" : "text-emerald-600"
                    }`}
                  >
                    Available: {stock.available} / {stock.total}
                  </p>
                  {cartQty > 0 ? (
                    <p className="text-xs text-zinc-500">In cart: {cartQty}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    setCart((prev) => {
                      const existing = prev.find((item) => item.filmId === film.id);

                      if (existing) {
                        return prev.map((item) =>
                          item.filmId === film.id
                            ? {
                                ...item,
                                qty: Math.min(item.qty + 1, stock.available),
                              }
                            : item,
                        );
                      }

                      return [...prev, { filmId: film.id, title: film.title, qty: 1 }];
                    })
                  }
                >
                  {isOutOfStock ? "Out" : hasReachedLimit ? "Max" : "Add"}
                </Button>
              </div>
            );
          })}
          {filmsQuery.isLoading ? (
            <p className="text-sm text-zinc-500">Loading film...</p>
          ) : null}
        </div>
        {filmsQuery.error ? (
          <p className="mt-2 text-sm text-red-600">
            {getErrorMessage(filmsQuery.error)}
          </p>
        ) : null}
      </div>

      <p className="text-sm text-zinc-500">
        Setelah checkout, lanjut ke pembayaran di{" "}
        <Link to="/payments" className="text-zinc-900 underline">
          halaman payment
        </Link>
        .
      </p>
    </section>
  );
}
