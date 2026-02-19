export const queryKeys = {
  stores: ["stores"] as const,
  staff: ["staff"] as const,
  customers: (query: string) => ["customers", query] as const,
  films: (query: string) => ["films", query] as const,
  filmAvailability: (storeId: string, filmId: string) =>
    ["film-availability", storeId, filmId] as const,
  openRentals: (storeId: string) => ["open-rentals", storeId] as const,
  invoice: (rentalId: string) => ["invoice", rentalId] as const,
};
