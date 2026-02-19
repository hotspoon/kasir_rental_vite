import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { getInvoiceByRentalId } from "@/lib/api/sakila";

export const Route = createFileRoute("/invoice/$id")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();

  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => getInvoiceByRentalId(id),
  });

  if (invoiceQuery.isLoading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Invoice Rental {id}</h1>
        <p className="mt-2 text-sm text-zinc-500">Memuat data invoice...</p>
      </section>
    );
  }

  if (invoiceQuery.error || !invoiceQuery.data) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Invoice Rental {id}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {getErrorMessage(invoiceQuery.error, "Invoice tidak ditemukan.")}
        </p>
      </section>
    );
  }

  const invoice = invoiceQuery.data;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Invoice Rental {invoice.id}</h1>
      <div className="mt-3 space-y-1 text-sm text-zinc-700">
        <p>Film: {invoice.filmTitle}</p>
        <p>Customer: {invoice.customerName}</p>
        <p>Total: Rp {invoice.total.toLocaleString("id-ID")}</p>
        <p>Paid: Rp {invoice.paid.toLocaleString("id-ID")}</p>
        <p className="font-semibold">Due: Rp {invoice.due.toLocaleString("id-ID")}</p>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Lanjut bayar di{" "}
        <Link to="/payments" className="underline">
          Payment
        </Link>
        .
      </p>
    </section>
  );
}
