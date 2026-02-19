import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/customers/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Customer {id}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Placeholder MVP untuk customer detail. Layar ini bisa diisi histori rental
        dan invoice customer.
      </p>
    </section>
  );
}
