import { ApiError, requestApi, requestData } from "@/lib/api/client";

type StoreResponse = {
  store_id: number;
  manager_staff_id: number;
};

type StaffResponse = {
  staff_id: number;
  first_name: string;
  last_name: string;
  store_id: number;
  active: boolean;
};

type CustomerResponse = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
};

type LookupCustomerResponse = {
  customer_id: number;
  name: string;
  email: string;
};

type LookupFilmResponse = {
  film_id: number;
  title: string;
};

type FilmResponse = {
  film_id: number;
  title: string;
  rental_duration: number;
};

type FilmListResponse = {
  data: FilmResponse[];
};

type FilmAvailabilityResponse = {
  film_id: number;
  total: number;
  available: number;
};

type InventoryResponse = {
  inventory_id: number;
  film_id: number;
  store_id: number;
};

type RentalResponse = {
  rental_id: number;
  rental_date: string;
  inventory_id: number;
  customer_id: number;
};

type InvoiceResponse = {
  rental: {
    rental_id: number;
    rental_date: string;
  };
  film: {
    film_id: number;
    title: string;
    rental_rate: number;
  };
  customer: {
    customer_id: number;
    first_name: string;
    last_name: string;
  };
  summary: {
    total_paid: number;
    amount_due: number;
  };
};

export type ShiftStore = {
  id: string;
  label: string;
};

export type ShiftStaff = {
  id: string;
  label: string;
  storeId: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Film = {
  id: string;
  title: string;
};

export type RentalStatus = "OPEN" | "LATE" | "RETURNED";

export type Rental = {
  id: string;
  customerId: string;
  customerName: string;
  filmId: string;
  filmTitle: string;
  status: RentalStatus;
  dueDate: string;
};

export type Invoice = {
  id: string;
  rentalId: string;
  total: number;
  paid: number;
  due: number;
  customerId: string;
  customerName: string;
  filmTitle: string;
};

const LOOKUP_LIMIT = 20;
const MAX_LIMIT = 100;

function parseId(value: string, field: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(`${field} tidak valid`, { status: 400 });
  }

  return parsed;
}

function formatDueDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number): string {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function toCustomerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export async function listStores(): Promise<ShiftStore[]> {
  const stores = await requestData<StoreResponse[]>("stores", {
    searchParams: { limit: MAX_LIMIT },
  });

  return stores.map((store) => ({
    id: String(store.store_id),
    label: `Store #${store.store_id}`,
  }));
}

export async function listStaff(): Promise<ShiftStaff[]> {
  const staffMembers = await requestData<StaffResponse[]>("staff", {
    searchParams: { limit: MAX_LIMIT },
  });

  return staffMembers
    .filter((member) => member.active)
    .map((member) => ({
      id: String(member.staff_id),
      label: toCustomerName(member.first_name, member.last_name),
      storeId: String(member.store_id),
    }));
}

export async function lookupCustomers(query: string): Promise<Customer[]> {
  const normalized = query.trim();

  if (!normalized) {
    const customers = await requestData<CustomerResponse[]>("customers", {
      searchParams: { limit: LOOKUP_LIMIT },
    });

    return customers.map((customer) => ({
      id: String(customer.customer_id),
      name: toCustomerName(customer.first_name, customer.last_name),
      phone: customer.email,
    }));
  }

  const customers = await requestData<LookupCustomerResponse[]>("lookup/customers", {
    searchParams: {
      query: normalized,
      limit: LOOKUP_LIMIT,
    },
  });

  return customers.map((customer) => ({
    id: String(customer.customer_id),
    name: customer.name,
    phone: customer.email,
  }));
}

export async function lookupFilms(query: string): Promise<Film[]> {
  const normalized = query.trim();

  if (!normalized) {
    const response = await requestData<FilmListResponse>("films", {
      searchParams: { limit: LOOKUP_LIMIT },
    });

    return response.data.map((film) => ({
      id: String(film.film_id),
      title: film.title,
    }));
  }

  const films = await requestData<LookupFilmResponse[]>("lookup/films", {
    searchParams: {
      query: normalized,
      limit: LOOKUP_LIMIT,
    },
  });

  return films.map((film) => ({
    id: String(film.film_id),
    title: film.title,
  }));
}

export async function getFilmAvailability(
  filmId: string,
  storeId: string,
): Promise<{ available: number; total: number }> {
  const parsedFilmId = parseId(filmId, "Film ID");
  const parsedStoreId = parseId(storeId, "Store ID");

  const availability = await requestData<FilmAvailabilityResponse>(
    `films/${parsedFilmId}/availability`,
    {
      searchParams: {
        storeId: parsedStoreId,
      },
    },
  );

  return {
    available: availability.available,
    total: availability.total,
  };
}

async function getOpenRentalsByStore(storeId: number): Promise<RentalResponse[]> {
  return requestData<RentalResponse[]>("rentals", {
    searchParams: {
      storeId,
      status: "open",
      limit: MAX_LIMIT,
    },
  });
}

async function getInventoriesByFilm(filmId: number): Promise<InventoryResponse[]> {
  return requestData<InventoryResponse[]>(`films/${filmId}/inventories`, {
    searchParams: {
      limit: MAX_LIMIT,
    },
  });
}

async function resolveInventoryIds(
  storeId: number,
  cart: Array<{ filmId: string; qty: number }>,
): Promise<number[]> {
  const filmIds = [...new Set(cart.map((item) => parseId(item.filmId, "Film ID")))];

  const [openRentals, inventoryGroups] = await Promise.all([
    getOpenRentalsByStore(storeId),
    Promise.all(
      filmIds.map(async (filmId) => ({
        filmId,
        inventories: await getInventoriesByFilm(filmId),
      })),
    ),
  ]);

  const openedInventoryIds = new Set(
    openRentals.map((rental) => rental.inventory_id),
  );
  const reservedInventoryIds = new Set<number>();
  const inventoryByFilm = new Map(
    inventoryGroups.map((group) => [group.filmId, group.inventories]),
  );
  const result: number[] = [];

  for (const item of cart) {
    const parsedFilmId = parseId(item.filmId, "Film ID");
    const qty = Math.max(item.qty, 0);

    if (qty === 0) {
      continue;
    }

    const inventories = inventoryByFilm.get(parsedFilmId) ?? [];
    const available = inventories
      .filter((inventory) => inventory.store_id === storeId)
      .filter((inventory) => !openedInventoryIds.has(inventory.inventory_id))
      .filter((inventory) => !reservedInventoryIds.has(inventory.inventory_id));

    if (available.length < qty) {
      throw new ApiError(`Stok film ${parsedFilmId} tidak mencukupi`, {
        status: 400,
      });
    }

    for (let index = 0; index < qty; index += 1) {
      const inventory = available[index];
      reservedInventoryIds.add(inventory.inventory_id);
      result.push(inventory.inventory_id);
    }
  }

  return result;
}

export async function checkoutRental(input: {
  customerId: string;
  staffId: string;
  storeId: string;
  cart: Array<{ filmId: string; qty: number }>;
}): Promise<{
  success: true;
  rentalIds: string[];
  invoiceId: string;
  message: string;
}> {
  const customerId = parseId(input.customerId, "Customer ID");
  const staffId = parseId(input.staffId, "Staff ID");
  const storeId = parseId(input.storeId, "Store ID");

  const inventoryIds = await resolveInventoryIds(storeId, input.cart);

  if (inventoryIds.length === 0) {
    throw new ApiError("Cart masih kosong", { status: 400 });
  }

  const result = await requestApi<{ rental_ids: number[] }>("rentals/checkout", {
    method: "post",
    json: {
      customerId,
      staffId,
      storeId,
      inventoryIds,
    },
  });

  const rentalIds = result.data?.rental_ids?.map((id) => String(id)) ?? [];

  if (rentalIds.length === 0) {
    throw new ApiError("Checkout berhasil tetapi rental id tidak ditemukan", {
      status: 500,
    });
  }

  return {
    success: true,
    rentalIds,
    invoiceId: rentalIds[0],
    message: result.message ?? "Checkout berhasil.",
  };
}

async function getFilmDurationMap(filmIds: number[]): Promise<Map<number, number>> {
  const uniqueFilmIds = [...new Set(filmIds)];
  const result = new Map<number, number>();

  await Promise.all(
    uniqueFilmIds.map(async (filmId) => {
      const film = await requestData<FilmResponse>(`films/${filmId}`);
      result.set(filmId, film.rental_duration || 3);
    }),
  );

  return result;
}

export async function listOpenRentals(storeId: string): Promise<Rental[]> {
  const parsedStoreId = parseId(storeId, "Store ID");
  const rentals = await getOpenRentalsByStore(parsedStoreId);

  if (rentals.length === 0) {
    return [];
  }

  const invoiceResults = await Promise.allSettled(
    rentals.map(async (rental) => {
      const invoice = await requestData<InvoiceResponse>(
        `rentals/${rental.rental_id}/invoice`,
      );

      return {
        rental,
        invoice,
      };
    }),
  );

  const successful = invoiceResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (successful.length === 0) {
    return [];
  }

  const durationMap = await getFilmDurationMap(
    successful.map((item) => item.invoice.film.film_id),
  );
  const now = new Date();

  return successful.map(({ rental, invoice }) => {
    const duration = durationMap.get(invoice.film.film_id) ?? 3;
    const dueDate = addDays(rental.rental_date, duration);
    const dueDateValue = new Date(dueDate);
    const isLate = !Number.isNaN(dueDateValue.getTime()) && dueDateValue < now;

    return {
      id: String(rental.rental_id),
      customerId: String(rental.customer_id),
      customerName: toCustomerName(
        invoice.customer.first_name,
        invoice.customer.last_name,
      ),
      filmId: String(invoice.film.film_id),
      filmTitle: invoice.film.title,
      status: isLate ? "LATE" : "OPEN",
      dueDate,
    };
  });
}

export async function returnRentals(rentalIds: string[]): Promise<{
  returned: string[];
  skipped: string[];
}> {
  const parsedRentalIds = rentalIds.map((rentalId) =>
    parseId(rentalId, "Rental ID"),
  );

  const result = await requestData<{ updated: number[]; skipped: number[] }>(
    "rentals/return-batch",
    {
      method: "post",
      json: {
        rentalIds: parsedRentalIds,
      },
    },
  );

  return {
    returned: result.updated.map((id) => String(id)),
    skipped: result.skipped.map((id) => String(id)),
  };
}

export async function getInvoiceByRentalId(rentalId: string): Promise<Invoice> {
  const parsedRentalId = parseId(rentalId, "Rental ID");
  const invoice = await requestData<InvoiceResponse>(
    `rentals/${parsedRentalId}/invoice`,
  );

  return {
    id: String(invoice.rental.rental_id),
    rentalId: String(invoice.rental.rental_id),
    total: invoice.film.rental_rate,
    paid: invoice.summary.total_paid,
    due: invoice.summary.amount_due,
    customerId: String(invoice.customer.customer_id),
    customerName: toCustomerName(
      invoice.customer.first_name,
      invoice.customer.last_name,
    ),
    filmTitle: invoice.film.title,
  };
}

export async function payInvoice(input: {
  rentalId: string;
  customerId: string;
  staffId: string;
  amount: number;
}): Promise<{ success: true; paid: number; due: number }> {
  const rentalId = parseId(input.rentalId, "Rental ID");
  const customerId = parseId(input.customerId, "Customer ID");
  const staffId = parseId(input.staffId, "Staff ID");

  await requestApi("payments", {
    method: "post",
    json: {
      customerId,
      staffId,
      rentalId,
      amount: input.amount,
    },
  });

  const latest = await getInvoiceByRentalId(String(rentalId));

  return {
    success: true,
    paid: latest.paid,
    due: latest.due,
  };
}

export function filterRentalsByQuery(rentals: Rental[], query: string): Rental[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rentals;
  }

  return rentals.filter((rental) =>
    `${rental.id} ${rental.filmTitle} ${rental.customerName}`
      .toLowerCase()
      .includes(normalized),
  );
}

export function toDisplayDate(dateValue: string): string {
  return formatDueDate(dateValue);
}
