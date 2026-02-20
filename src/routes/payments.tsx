import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useShiftContext } from "@/context/shift-context";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { getInvoiceByRentalId, payInvoice } from "@/lib/api/sakila";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

function getInitialRentalId() {
  if (typeof window === "undefined") {
    return "";
  }

  return (new URLSearchParams(window.location.search).get("rentalId") ?? "").trim();
}

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const { staffId } = useShiftContext();
  const [rentalId, setRentalId] = useState(getInitialRentalId);
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const parsedAmount = amount.trim().length === 0 ? null : Number(amount);
  const isAmountValid =
    parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const invoiceQuery = useQuery({
    queryKey: queryKeys.invoice(rentalId),
    queryFn: () => getInvoiceByRentalId(rentalId),
    enabled: rentalId.trim().length > 0,
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const invoice = invoiceQuery.data;

      if (!invoice) {
        throw new Error("Invoice belum dimuat.");
      }
      if (!staffId) {
        throw new Error("Shift belum aktif.");
      }
      if (!isAmountValid || parsedAmount === null) {
        throw new Error("Amount tidak valid.");
      }

      return payInvoice({
        rentalId: invoice.rentalId,
        customerId: invoice.customerId,
        staffId,
        amount: parsedAmount,
      });
    },
    onSuccess: async (result) => {
      setAmount("");
      setFeedback({
        tone: "success",
        text:
          result.due <= 0
            ? "Pembayaran sukses. Invoice sekarang lunas."
            : `Pembayaran sukses. Sisa tagihan Rp ${result.due.toLocaleString("id-ID")}`,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.invoice(rentalId),
      });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error),
      });
    },
  });

  const total = invoiceQuery.data?.total ?? 0;
  const paid = invoiceQuery.data?.paid ?? 0;
  const due = invoiceQuery.data?.due ?? 0;
  const isInvoiceLoaded = Boolean(invoiceQuery.data);
  const isInvoiceSettled = isInvoiceLoaded && due <= 0;
  const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Payment</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Bayar invoice berdasarkan Rental ID.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">
          Rental ID
        </span>
        <input
          type="number"
          min={1}
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
          value={rentalId}
          onChange={(event) => {
            setRentalId(event.target.value);
            setFeedback(null);
          }}
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-700">Invoice Summary</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              !isInvoiceLoaded
                ? "bg-zinc-200 text-zinc-600"
                : isInvoiceSettled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {!isInvoiceLoaded
              ? "BELUM DIMUAT"
              : isInvoiceSettled
                ? "LUNAS"
                : "BELUM LUNAS"}
          </span>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="space-y-1 text-sm text-zinc-700">
              <p>Rental: {rentalId || "-"}</p>
              <p>Film: {invoiceQuery.data?.filmTitle ?? "-"}</p>
              <p>Customer: {invoiceQuery.data?.customerName ?? "-"}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Paid</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 tabular-nums">
                {formatRupiah(paid)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-zinc-900 p-3 text-white">
              <p className="text-xs uppercase tracking-wide text-zinc-300">Due</p>
              <p className="mt-1 text-base font-semibold tabular-nums">
                {formatRupiah(due)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {invoiceQuery.error ? (
        <p className="mt-2 text-sm text-red-600">
          {getErrorMessage(invoiceQuery.error)}
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Amount</span>
        <input
          type="number"
          min={0}
          step="0.01"
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <Button
        className="mt-4 w-full"
        disabled={!isAmountValid || due <= 0 || paymentMutation.isPending}
        onClick={() => paymentMutation.mutate()}
      >
        {paymentMutation.isPending ? "Paying..." : "Pay"}
      </Button>

      {invoiceQuery.data && due <= 0 && feedback?.tone !== "success" ? (
        <p className="mt-2 text-sm text-amber-700">
          Invoice sudah lunas
        </p>
      ) : null}

      {feedback ? (
        <p
          className={`mt-2 text-sm ${
            feedback.tone === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-zinc-500">
        Cek invoice spesifik di{" "}
        <Link to="/invoice/$id" params={{ id: rentalId }} className="underline">
          detail invoice
        </Link>
        .
      </p>
    </section>
  );
}
