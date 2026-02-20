import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockShiftContext = vi.hoisted(() => ({
  storeId: "1",
  staffId: "2",
  hasActiveShift: true,
  setShift: vi.fn(),
  clearShift: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );

  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
  };
});

vi.mock("@/context/shift-context", () => ({
  useShiftContext: () => mockShiftContext,
}));

vi.mock("@/lib/api/sakila", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/sakila")>(
    "@/lib/api/sakila",
  );

  return {
    ...actual,
    getInvoiceByRentalId: vi.fn(),
    payInvoice: vi.fn(),
  };
});

import type { Invoice } from "@/lib/api/sakila";
import { getInvoiceByRentalId, payInvoice } from "@/lib/api/sakila";
import { PaymentsPage } from "@/routes/payments";

const mockedGetInvoiceByRentalId = vi.mocked(getInvoiceByRentalId);
const mockedPayInvoice = vi.mocked(payInvoice);

const defaultInvoice: Invoice = {
  id: "1",
  rentalId: "1",
  total: 6.99,
  paid: 2,
  due: 4.99,
  customerId: "10",
  customerName: "Justin Ngo",
  filmTitle: "TITANIC BOONDOCK",
};

function applyMockShiftState(
  overrides: Partial<{
    storeId: string | null;
    staffId: string | null;
    hasActiveShift: boolean;
  }> = {},
) {
  Object.assign(mockShiftContext, {
    storeId: "1",
    staffId: "2",
    hasActiveShift: true,
    ...overrides,
  });
}

function renderPaymentsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PaymentsPage />
    </QueryClientProvider>,
  );
}

describe("Payments page", () => {
  beforeEach(() => {
    applyMockShiftState();
    mockedGetInvoiceByRentalId.mockResolvedValue(defaultInvoice);
    mockedPayInvoice.mockResolvedValue({
      success: true,
      paid: 6.99,
      due: 0,
    });
  });

  it("loads invoice summary and keeps Pay disabled when amount is empty", async () => {
    renderPaymentsPage();

    expect(await screen.findByText(`Film: ${defaultInvoice.filmTitle}`)).toBeVisible();
    expect(screen.getByText(`Customer: ${defaultInvoice.customerName}`)).toBeVisible();
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
  });

  it("enables Pay button when amount is valid and invoice still has due", async () => {
    renderPaymentsPage();
    await screen.findByText(`Film: ${defaultInvoice.filmTitle}`);

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "2.5" },
    });

    expect(screen.getByRole("button", { name: "Pay" })).toBeEnabled();
  });

  it("submits payment and shows remaining due for partial payment", async () => {
    mockedPayInvoice.mockResolvedValueOnce({
      success: true,
      paid: 4,
      due: 2.99,
    });

    renderPaymentsPage();
    await screen.findByText(`Film: ${defaultInvoice.filmTitle}`);

    const amountInput = screen.getByLabelText("Amount");
    fireEvent.change(amountInput, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));

    await waitFor(() => {
      expect(mockedPayInvoice).toHaveBeenCalledWith({
        rentalId: defaultInvoice.rentalId,
        customerId: defaultInvoice.customerId,
        staffId: "2",
        amount: 2,
      });
    });

    expect(await screen.findByText("Pembayaran sukses. Sisa tagihan Rp 2,99")).toBeVisible();
    expect((amountInput as HTMLInputElement).value).toBe("");
  });

  it("shows a clear success message when invoice becomes fully paid", async () => {
    mockedPayInvoice.mockResolvedValueOnce({
      success: true,
      paid: 6.99,
      due: 0,
    });

    renderPaymentsPage();
    await screen.findByText(`Film: ${defaultInvoice.filmTitle}`);

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "4.99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));

    expect(
      await screen.findByText("Pembayaran sukses. Invoice sekarang lunas."),
    ).toBeVisible();
    expect(screen.queryByText("Invoice sudah lunas")).not.toBeInTheDocument();
  });

  it("disables payment and shows warning when invoice is already fully paid", async () => {
    mockedGetInvoiceByRentalId.mockResolvedValueOnce({
      ...defaultInvoice,
      paid: 6.99,
      due: 0,
    });

    renderPaymentsPage();
    await screen.findByText("Invoice sudah lunas");

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "3" },
    });

    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
    expect(mockedPayInvoice).not.toHaveBeenCalled();
  });

  it("shows an error if user pays without active shift", async () => {
    applyMockShiftState({
      staffId: null,
      hasActiveShift: false,
    });
    renderPaymentsPage();
    await screen.findByText(`Film: ${defaultInvoice.filmTitle}`);

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText("Shift belum aktif.")).toBeVisible();
    expect(mockedPayInvoice).not.toHaveBeenCalled();
  });

  it("shows API error feedback when payment request fails", async () => {
    mockedPayInvoice.mockRejectedValueOnce(new Error("Pembayaran gagal diproses."));

    renderPaymentsPage();
    await screen.findByText(`Film: ${defaultInvoice.filmTitle}`);

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));

    expect(await screen.findByText("Pembayaran gagal diproses.")).toBeVisible();
  });

  it("shows invoice lookup error when rental invoice cannot be loaded", async () => {
    mockedGetInvoiceByRentalId.mockRejectedValueOnce(new Error("Rental tidak ditemukan."));

    renderPaymentsPage();

    expect(await screen.findByText("Rental tidak ditemukan.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
  });
});
