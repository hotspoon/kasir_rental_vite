type Customer = {
  id: string;
  name: string;
  phone: string;
};

type Film = {
  id: string;
  title: string;
  totalStock: number;
};

type Rental = {
  id: string;
  customerId: string;
  filmId: string;
  filmTitle: string;
  status: "OPEN" | "LATE" | "RETURNED";
  dueDate: string;
};

type Invoice = {
  id: string;
  rentalId: string;
  total: number;
  paid: number;
};

const customers: Customer[] = [
  { id: "cus-001", name: "Budi Santoso", phone: "0812-8888-1111" },
  { id: "cus-002", name: "Siti Aisyah", phone: "0813-2222-3333" },
  { id: "cus-003", name: "Raka Pratama", phone: "0817-4000-9000" },
];

const films: Film[] = [
  { id: "film-001", title: "Interstellar", totalStock: 5 },
  { id: "film-002", title: "The Dark Knight", totalStock: 3 },
  { id: "film-003", title: "Inception", totalStock: 2 },
  { id: "film-004", title: "Parasite", totalStock: 4 },
];

const activeRentalsByFilm: Record<string, number> = {
  "film-001": 2,
  "film-002": 3,
  "film-003": 1,
  "film-004": 0,
};

const openRentals: Rental[] = [
  {
    id: "rental-123",
    customerId: "cus-001",
    filmId: "film-001",
    filmTitle: "Interstellar",
    status: "OPEN",
    dueDate: "2026-02-20",
  },
  {
    id: "rental-124",
    customerId: "cus-001",
    filmId: "film-002",
    filmTitle: "The Dark Knight",
    status: "LATE",
    dueDate: "2026-02-15",
  },
  {
    id: "rental-125",
    customerId: "cus-002",
    filmId: "film-004",
    filmTitle: "Parasite",
    status: "OPEN",
    dueDate: "2026-02-19",
  },
];

const invoices: Invoice[] = [
  { id: "inv-1001", rentalId: "rental-123", total: 50000, paid: 0 },
  { id: "inv-1002", rentalId: "rental-124", total: 70000, paid: 20000 },
];

function wait(ms = 180) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function lookupCustomers(query: string) {
  await wait();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return customers;
  }

  return customers.filter((item) =>
    `${item.name} ${item.phone}`.toLowerCase().includes(normalized),
  );
}

export async function lookupFilms(query: string) {
  await wait();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return films;
  }

  return films.filter((item) => item.title.toLowerCase().includes(normalized));
}

export async function getFilmAvailability(filmId: string) {
  await wait(120);
  const film = films.find((item) => item.id === filmId);
  if (!film) {
    return { available: 0, total: 0 };
  }

  const active = activeRentalsByFilm[filmId] ?? 0;
  return {
    available: Math.max(0, film.totalStock - active),
    total: film.totalStock,
  };
}

export async function checkoutRental(input: {
  customerId: string;
  cart: Array<{ filmId: string; qty: number }>;
}) {
  await wait(250);
  const invoiceId = `inv-${Math.floor(Math.random() * 9000) + 1000}`;
  const rentalId = `rental-${Math.floor(Math.random() * 900) + 100}`;

  return {
    success: true,
    rentalId,
    invoiceId,
    message: `Checkout berhasil untuk ${input.cart.length} item.`,
  };
}

export async function searchOpenRentals(query: string) {
  await wait();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return openRentals;
  }

  return openRentals.filter((item) => {
    const customer = customers.find((c) => c.id === item.customerId);
    return `${item.id} ${item.filmTitle} ${customer?.name ?? ""}`
      .toLowerCase()
      .includes(normalized);
  });
}

export async function returnRentals(rentalIds: string[]) {
  await wait(260);
  return {
    returned: rentalIds,
    skipped: openRentals
      .filter((item) => !rentalIds.includes(item.id))
      .map((item) => item.id),
  };
}

export async function getInvoiceById(invoiceId: string) {
  await wait(140);
  return invoices.find((item) => item.id === invoiceId) ?? null;
}

export async function payInvoice(input: { invoiceId: string; amount: number }) {
  await wait(220);
  const invoice = invoices.find((item) => item.id === input.invoiceId);
  if (!invoice) {
    return { success: false as const, message: "Invoice tidak ditemukan." };
  }

  const paid = Math.min(invoice.total, invoice.paid + input.amount);
  invoice.paid = paid;

  return { success: true as const, paid, due: invoice.total - paid };
}

export type { Customer, Film, Rental, Invoice };
