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

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const { staffId } = useShiftContext();
  const [rentalId, setRentalId] = useState("1");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const amountValue = amount.trim().length === 0 ? 0 : Number(amount);

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

      return payInvoice({
        rentalId: invoice.rentalId,
        customerId: invoice.customerId,
        staffId,
        amount: amountValue,
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

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Invoice Summary</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>Rental: {rentalId || "-"}</p>
          <p>Film: {invoiceQuery.data?.filmTitle ?? "-"}</p>
          <p>Customer: {invoiceQuery.data?.customerName ?? "-"}</p>
          <p>Total: Rp {total.toLocaleString("id-ID")}</p>
          <p>Paid: Rp {paid.toLocaleString("id-ID")}</p>
          <p className="font-semibold text-zinc-900">
            Due: Rp {due.toLocaleString("id-ID")}
          </p>
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
          className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <Button
        className="mt-4 w-full"
        disabled={amountValue <= 0 || due <= 0 || paymentMutation.isPending}
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
