import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { getInvoiceByRentalId } from "@/lib/api/sakila";

export const Route = createFileRoute("/invoice/$id")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { message?: string } => {
    const message =
      typeof search.message === "string" ? search.message : undefined;
    return message ? { message } : {};
  },
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();

  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => getInvoiceByRentalId(id),
  });

  if (invoiceQuery.isLoading) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Invoice Rental #{id}</h1>
        <p className="mt-2 text-sm text-zinc-500">Memuat detail invoice...</p>
      </section>
    );
  }

  if (invoiceQuery.error || !invoiceQuery.data) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Invoice Rental #{id}</h1>
        <p className="mt-2 text-sm text-red-600">
          {getErrorMessage(invoiceQuery.error, "Invoice tidak ditemukan.")}
        </p>
      </section>
    );
  }

  const invoice = invoiceQuery.data;
  const isSettled = invoice.due <= 0;
  const paidPercentage =
    invoice.total > 0
      ? Math.min(100, Math.round((invoice.paid / invoice.total) * 100))
      : 0;
  const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Invoice Rental
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              #{invoice.id}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isSettled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isSettled ? "LUNAS" : "BELUM LUNAS"}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Detail Transaksi
            </p>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <p>Rental ID: {invoice.rentalId}</p>
              <p>Film: {invoice.filmTitle}</p>
              <p>Customer: {invoice.customerName}</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Ringkasan Pembayaran
            </p>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="font-medium tabular-nums">
                  {formatRupiah(invoice.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid</span>
                <span className="font-medium tabular-nums">
                  {formatRupiah(invoice.paid)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                <span className="font-semibold text-zinc-900">Due</span>
                <span className="text-lg font-semibold text-zinc-900 tabular-nums">
                  {formatRupiah(invoice.due)}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full ${
                    isSettled ? "bg-emerald-500" : "bg-zinc-900"
                  }`}
                  style={{ width: `${paidPercentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Progress pembayaran: {paidPercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {search.message ? (
        <p className="mx-6 mb-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {search.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <p className="text-sm text-zinc-600">
          Lanjutkan pembayaran untuk invoice ini.
        </p>
        <Link
          to="/payments"
          search={{ rentalId: invoice.rentalId }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Bayar Invoice
        </Link>
      </div>
    </section>
  );
}
